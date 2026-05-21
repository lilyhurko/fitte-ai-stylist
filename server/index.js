require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("cloudinary").v2;

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
const Groq = require("groq-sdk");

const app = express();
const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const JWT_SECRET = process.env.JWT_SECRET;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET,
});

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Brak autoryzacji" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Sesja wygasła" });
    req.user = decoded; 
    next();
  });
};

const generateContextString = (clothes, user) => {
  const gender = user?.gender || 'osoba';
  const styles = user?.styleTags || 'brak sprecyzowanego stylu';
  
  let context = `Użytkownik to ${gender}. Preferowany styl: ${styles}. \n`;
  
  if (!clothes || clothes.length === 0) return context + "Szafa jest obecnie pusta.";
  
  context += "Ubrania w szafie:\n";
  context += clothes
    .map((c, i) => `- ${c.name} (Kategoria: ${c.category}, Kolor: ${c.color})`)
    .join("\n");
    
  return context;
};

const getBasePrompt = (query, context) => `
Jesteś profesjonalnym stylistą mody. 
INFORMACJE O UŻYTKOWNIKU I SZAFIE:
${context}

ZASADY ODPOWIEDZI (KRYTYCZNE):
1. Odpowiedz bardzo zwięźle (maksymalnie 3-4 konkretne zdania).
2. Wybieraj ubrania WYŁĄCZNIE z listy powyżej. Nie zmyślaj ubrań.
3. Nie pisz uprzejmościowych wstępów ani podsumowań.
4. Skup się na dopasowaniu do okazji i stylu użytkownika.

PYTANIE: ${query}

`;

async function askGemini(query, context) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = getBasePrompt(query, context);
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) { return "Błąd Gemini: " + err.message; }
}

async function askMistralCloud(query, context) { 
  try {
    const prompt = getBasePrompt(query, context);
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192", 
    });

    return chatCompletion.choices[0]?.message?.content || "Brak odpowiedzi ze strony chmury Mistral.";
  } catch (err) { 
    return "Błąd Mistral (Groq Cloud): " + err.message; 
  }
}

async function askRAG(query, context) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = getBasePrompt(query, context);

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) { return "Błąd Fitte AI: " + err.message; }
}

app.get("/", (req, res) => {
  res.json({
    status: "active",
    service: "Fitte AI Stylist Backend",
    academicProject: "Politechnika Lubelska - Praca Magisterska",
    message: "Serwer działa poprawnie i stabilnie w chmurze!"
  });
});

app.post("/api/register", async (req, res) => {
  const { name, email, password, styleTags, favoriteColors } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "E-mail zajęty." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        styleTags: JSON.stringify(styleTags),
        favoriteColors: JSON.stringify(favoriteColors),
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ user, token });
  } catch (error) { res.status(500).json({ error: "Błąd rejestracji." }); }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Błędne dane logowania" });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ user, token });
  } catch (error) { res.status(500).json({ error: "Błąd logowania." }); }
});

app.post("/api/wardrobe/add", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!req.file) return res.status(400).json({ error: "Brak zdjęcia" });

    const form = new FormData();
    form.append("file", req.file.buffer, { filename: "upload.png" });

    const aiResponse = await axios.post("http://localhost:8000/process-image", form, {
      headers: { ...form.getHeaders() },
      responseType: "arraybuffer",
      timeout: 300000,
    });

    const aiAnalysis = JSON.parse(aiResponse.headers["x-ai-analysis"]);
    
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "fitte_wardrobe" },
          (err, res) => err ? reject(err) : resolve(res.secure_url)
        );
        stream.end(aiResponse.data);
      });
    };

    const imageUrl = await uploadToCloudinary();
    const newCloth = await prisma.cloth.create({
      data: {
        name: aiAnalysis.name,
        category: aiAnalysis.category,
        style: aiAnalysis.style,
        color: aiAnalysis.color || "Nieokreślony",
        imageUrl,
        userId,
      },
    });
    res.json({ success: true, item: newCloth });
  } catch (error) { res.status(500).json({ error: "Błąd serwera przy dodawaniu" }); }
});

app.get("/api/wardrobe", authenticateToken, async (req, res) => {
  try {
    const clothes = await prisma.cloth.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ clothes });
  } catch (error) { res.status(500).json({ error: "Błąd pobierania szafy" }); }
});

app.delete("/api/wardrobe/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const cloth = await prisma.cloth.findUnique({ where: { id } });
    
    if (!cloth) {
      return res.status(404).json({ error: "Nie znaleziono takiego ubrania." });
    }
    
    if (cloth.userId !== userId) {
      return res.status(403).json({ error: "Brak uprawnień do usunięcia tego ubrania." });
    }

    await prisma.cloth.delete({ where: { id } });
    res.json({ success: true, message: "Ubranie zostało pomyślnie usunięte z garderoby." });
  } catch (error) {
    console.error("🚨 Błąd podczas usuwania ubrania:", error);
    res.status(500).json({ error: "Wystąpił błąd serwera podczas usuwania." });
  }
});

app.post('/api/analyze', authenticateToken, async (req, res) => {
    try {
        const { query } = req.body;
        const userId = req.user.userId;

        const [user, clothes] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.cloth.findMany({ where: { userId } })
        ]);

        const wardrobeContext = generateContextString(clothes, user); 
        console.log("🚀 Wysyłam do AI kontekst:", wardrobeContext);

        const [geminiOdp, mistralOdp, ragOdp] = await Promise.all([
            askGemini(query, wardrobeContext),     
            askMistralCloud(query, wardrobeContext), 
            askRAG(query, wardrobeContext)      
        ]);

        const analysisRecord = await prisma.analysis.create({
            data: {
                 query,
                 geminiResponse: geminiOdp,
                 mistralResponse: mistralOdp,
                 ragResponse: ragOdp,
                 contextUsed: wardrobeContext,
                 userId
            }
        });

        res.json(analysisRecord);
    } catch (error) {
        console.error("Błąd analizy:", error);
        res.status(500).json({ error: "Błąd podczas generowania porównania AI" });
    }
});

app.patch("/api/analyze/:id/rate", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { modelType, score } = req.body;

  try {
    const validModels = ["gemini", "mistral", "rag"];
    if (!validModels.includes(modelType)) {
      return res.status(400).json({ error: "Nieprawidłowy typ modelu." });
    }

    const scoreFieldName = `${modelType}Score`;

    const updatedAnalysis = await prisma.analysis.update({
      where: { id: id },
      data: {
        [scoreFieldName]: parseInt(score, 10)
      }
    });

    res.json({ success: true, updatedAnalysis });
  } catch (error) {
    console.error("🚨 Błąd podczas zapisywania oceny modelu:", error);
    res.status(500).json({ error: "Wystąpił błąd serwera podczas zapisywania oceny." });
  }
});

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        email: true,
        gender: true,
        styleTags: true,
        name: true 
      }
    });
    if (!user) return res.status(404).json({ error: "Nie znaleziono profilu" });
    
    res.json({
      ...user,
      firstName: user.name
    });
  } catch (error) {
    console.error(" Błąd pobierania profilu:", error);
    res.status(500).json({ error: "Błąd pobierania profilu" });
  }
});

app.patch("/api/profile", authenticateToken, async (req, res) => {
  const { firstName, email, gender } = req.body;
  try {
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== req.user.userId) {
        return res.status(400).json({ error: "Ten adres e-mail jest już zajęty." });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name: firstName, 
        email,
        gender
      }
    });
    res.json(updatedUser);
  } catch (error) {
    console.error(" Błąd aktualizacji profilu:", error);
    res.status(500).json({ error: "Błąd aktualizacji profilu" });
  }
});

app.post("/api/profile/change-password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Obecne hasło jest nieprawidłowe." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword }
    });

    res.json({ success: true, message: "Hasło zostało pomyślnie zmienione." });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas zmiany hasła." });
  }
});

// --- HISTORIA ---
app.get("/api/history", authenticateToken, async (req, res) => {
  try {
    const history = await prisma.analysis.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" }, 
    });
    res.json(history);
  } catch (error) {
    console.error("Błąd pobierania historii analiz:", error);
    res.status(500).json({ error: "Wystąpił błąd serwera podczas pobierania historii." });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Serwer Fitte działa stabilnie na porcie ${PORT}`));