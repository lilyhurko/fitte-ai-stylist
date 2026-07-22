require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { generateCapsuleWardrobe } = require("./capsuleEngine");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Groq = require("groq-sdk") } = require("groq-sdk");

const app = express();
const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const JWT_SECRET = process.env.JWT_SECRET;
const { generateBestOutfits } = require("./outfitEngine");

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
  api_secret:
    process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET,
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

function findMatchingClothes(llmResponse, clothes) {
  if (!llmResponse || !clothes || clothes.length === 0) return [];

  const text = llmResponse.toLowerCase();
  let matched = [];

  const synonimyKategorii = {
    gora: ["top", "koszul", "t-shirt", "bluzk", "marynark", "kimono", "żakiet", "kardigan"],
    dol: ["spodn", "jeans", "dżins", "nogawk", "szort", "spodenk", "spódnic"],
    buty: ["buty", "sneakers", "mule", "obcas", "sandał", "szpilk", "obuwie"],
    sukienka: ["sukienk", "tunik", "suknia"]
  };

  const synonimyKolorow = {
    kremowy: ["kremow", "beżow", "bial", "biał", "ecru"],
    beżowy: ["beżow", "kremow", "ecru", "piaskow"],
    biały: ["biał", "biel", "kremow", "ecru"],
    czarny: ["czarn", "ciemn", "grafit"],
    niebieski: ["niebiesk", "błękit", "jeans", "granat", "dżins"]
  };

  clothes.forEach((cloth) => {
    const nameLower = cloth.name ? cloth.name.toLowerCase() : "";
    const categoryLower = cloth.category ? cloth.category.toLowerCase() : "";
    const colorLower = cloth.color ? cloth.color.toLowerCase() : "";

    const jestSukienka = categoryLower.includes("sukienk") || nameLower.includes("sukienk");
    const jestGora = categoryLower.includes("góra") || nameLower.includes("koszul") || nameLower.includes("t-shirt") || nameLower.includes("top") || nameLower.includes("marynark") || nameLower.includes("kardigan");
    const jestDol = categoryLower.includes("dół") || nameLower.includes("spodn") || nameLower.includes("jeans") || nameLower.includes("dżins") || nameLower.includes("szort") || nameLower.includes("spodenk");
    const jestButy = categoryLower.includes("buty") || categoryLower.includes("obuwie") || nameLower.includes("sneakers") || nameLower.includes("mule") || nameLower.includes("szpilk");

    const aiPiszeOSukience = synonimyKategorii.sukienka.some(s => text.includes(s));
    const aiPiszeOGorze = synonimyKategorii.gora.some(s => text.includes(s));
    const aiPiszeODole = synonimyKategorii.dol.some(s => text.includes(s));
    const aiPiszeOButach = synonimyKategorii.buty.some(s => text.includes(s));

    const categoryMatch = 
      (jestSukienka && aiPiszeOSukience) ||
      (jestGora && aiPiszeOGorze) ||
      (jestDol && aiPiszeODole) ||
      (jestButy && aiPiszeOButach);

if (categoryMatch) {
  let colorMatch = false;
  let bazaKolor = colorLower;

  if (bazaKolor === "wykryty przez ai" || !bazaKolor) {
    if (nameLower.includes("czarn")) bazaKolor = "czarny";
    else if (nameLower.includes("biał") || nameLower.includes("biel")) bazaKolor = "biały";
    else if (nameLower.includes("krem")) bazaKolor = "kremowy";
    else if (nameLower.includes("beż")) bazaKolor = "beżowy";
    else if (nameLower.includes("zielon")) bazaKolor = "zielony";
    else if (nameLower.includes("róż")) bazaKolor = "różowy";
  }

  const oczekiwaneFrazy = synonimyKolorow[bazaKolor] || [bazaKolor];
  colorMatch = oczekiwaneFrazy.some(fraza => text.includes(fraza));


  if (text.includes("róż") && (nameLower.includes("zielon") || colorLower.includes("zielon"))) {
    colorMatch = false;
  }
  if (text.includes("zielon") && (nameLower.includes("róż") || colorLower.includes("róż"))) {
    colorMatch = false;
  }

  const slowaNazwy = nameLower.split(/\s+/).filter(w => w.length > 3);
  const nameKeywordMatch = slowaNazwy.some(s => text.includes(s.slice(0, -1)));

  if (colorMatch || nameKeywordMatch) {
    matched.push(cloth);
  }
}
  });

  const uniqueMatched = [];
  matched.forEach(item => {
    if (!uniqueMatched.some(m => m.id === item.id || m._id === item._id)) {
      uniqueMatched.push(item);
    }
  });

  return uniqueMatched.slice(0, 3);
}

const normalizeForMatch = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[`'"()]/g, "")
    .trim();

function extractMarkedItems(rawText, clothes) {
  if (!rawText) return { cleanText: rawText || "", items: [] };

  const czasMatch = rawText.match(/\s*\(Czas:\s*\d+ms\)\s*$/i);
  const czasSuffix = czasMatch ? czasMatch[0] : "";
  const withoutCzas = czasMatch ? rawText.slice(0, czasMatch.index) : rawText;

  const markerRegex = /\n?[ \t]*UBRANIA:\s*([^\n]*)/i;
  const match = withoutCzas.match(markerRegex);

  if (!match || !clothes || clothes.length === 0) {
    return { cleanText: rawText.trim(), items: [] };
  }

  const cleanText = (withoutCzas.replace(markerRegex, "").trim() + czasSuffix).trim();

  const rawNames = match[1]
    .split("|")
    .map((n) => normalizeForMatch(n))
    .filter(Boolean);

  const items = [];
  rawNames.forEach((target) => {
    const found =
      clothes.find((c) => normalizeForMatch(c.name) === target) ||
      clothes.find(
        (c) =>
          normalizeForMatch(c.name).includes(target) ||
          target.includes(normalizeForMatch(c.name)),
      );
    if (found && !items.some((i) => i.id === found.id)) {
      items.push(found);
    }
  });

  return { cleanText, items: items.slice(0, 4) };
}

function resolveMatchedItems(rawText, clothes) {
  const { cleanText, items } = extractMarkedItems(rawText, clothes);
  if (items.length > 0) {
    return { cleanText, items };
  }
  return { cleanText, items: findMatchingClothes(cleanText, clothes) };
}

const generateContextString = (clothes, user) => {
  const gender = user?.gender || "osoba";
  const styles = user?.styleTags || "brak sprecyzowanego stylu";

  let context = `Użytkownik to ${gender}. Preferowany styl: ${styles}. \n`;

  if (!clothes || clothes.length === 0)
    return context + "Szafa jest obecnie pusta.";

  context += "Ubrania w szafie:\n";
  context += clothes
    .map(
      (c) =>
        `- ${c.name} (Kategoria: ${c.category}, Kolor: ${c.color}, Styl: ${c.style})`,
    )
    .join("\n");

  return context;
};
async function getLiveWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,rain,snow_depth`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Błąd pobierania pogody");

    const data = await response.json();
    const temp = data.current.temperature_2m;
    const rain = data.current.rain;
    const snow = data.current.snow_depth;

    console.log(
      `[Weather API Live @ GPS ${lat}, ${lon}]: Temperatura: ${temp}°C, Opady: ${rain}mm`,
    );

    if (rain > 0.1 || snow > 0) return "Rain";
    if (temp >= 24) return "Hot";
    if (temp <= 10) return "Cold";

    return "Clear";
  } catch (error) {
    console.error(
      " Problem z Weather API, zwracam domyślne Clear:",
      error.message,
    );
    return "Clear";
  }
}
const getBasePrompt = (query, context, weatherType = "Clear") => {
  let opisPogody = "Słonecznie i przyjemnie";
  if (weatherType === "Rain") opisPogody = "Pada deszcz / ulewa (jest mokro)";
  if (weatherType === "Hot")
    opisPogody = "Jest bardzo gorąco, upał (powyżej 24°C)";
  if (weatherType === "Cold")
    opisPogody = "Jest zimno / chłodno (poniżej 14°C)";

  return `
Jesteś profesjonalnym osobistym stylistą mody. 

AKTUALNE WARUNKI POGODOWE:
-> Stan pogody: ${opisPogody} (Weź to bezwzględnie pod uwagę przy doborze warstw ubrań!)

INFORMACJE O UŻYTKOWNIKU I SZAFIE:
${context}

ZASADY ODPOWIEDZI (KRYTYCZNE):
1. Odpowiedz bardzo zwięźle (maksymalnie 2-3 konkretne zdania).
2. Dopasuj ubiór adekwatnie do aktualnej pogody.
3. Wybierz kompletny zestaw ubrań składający się z:
   - GÓRY i DOŁU (lub Sukienki)
   - ORAZ PASUJĄCEGO OBUWIA (butów) z listy ubrań w szafie.
4. Wybieraj ubrania i obuwie WYŁĄCZNIE z listy powyżej. Nie zmyślaj ubrań ani butów, których użytkownik nie ma w szafie.
5. Nie pisz uprzejmościowych wstępów ani podsumowań.
6. Na samym końcu odpowiedzi, w NOWEJ linii, podaj znacznik w dokładnie takim formacie:
UBRANIA: [dokładna nazwa 1]|[dokładna nazwa 2]|[dokładna nazwa 3]
Użyj DOKŁADNIE takich nazw ubrań, jakie widnieją na liście w sekcji "Ubrania w szafie" powyżej (bez odmiany przez przypadki, bez cudzysłowów). Wypisz tylko te ubrania, które faktycznie polecasz w tej odpowiedzi. Ta linia jest wyłącznie do przetworzenia maszynowego.

PYTANIE UŻYTKOWNIKA: ${query}
`;
};

async function askGemini(query, context, weatherType) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = getBasePrompt(query, context, weatherType);
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    return "Błąd Gemini: " + err.message;
  }
}

async function askMistralCloud(query, context, weatherType) {
  try {
    const prompt = getBasePrompt(query, context, weatherType);
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    return (
      chatCompletion.choices[0]?.message?.content ||
      "Brak odpowiedzi ze strony chmury Mistral."
    );
  } catch (err) {
    return "Błąd Mistral (Groq Cloud): " + err.message;
  }
}
async function askRAG(
  query,
  clothes,
  user,
  currentEvent,
  selectedOccasion,
  weatherType,
) {
  try {
    const topRecommendations = generateBestOutfits(
      clothes,
      user,
      currentEvent,
      selectedOccasion,
      weatherType,
    );

    if (!topRecommendations || topRecommendations.length === 0) {
      return {
        explanation:
          "System Fitte: Brak wystarczającej liczby ubrań do stworzenia rekomendacji.",
        recommendationId: null,
        ragItems: [],
      };
    }

    const bestSet = topRecommendations[0];
    const itemsDescription = bestSet.outfit
      .map((i) => `${i.name} (Styl: ${i.style}, Kolor: ${i.color})`)
      .join(" oraz ");

    const aktywnaOkazja = currentEvent ? currentEvent.title : selectedOccasion;

    const explanationPrompt = `
      Jesteś warstwą wyjaśniającą systemu rekomendacji Fitte AI.
      Algorytm wybrał dla użytkownika zestaw ubrań: ${itemsDescription}.
      Zapytanie użytkownika: "${query}"
      Okazja: ${aktywnaOkazja}.

      Napisz maksymalnie 1-2 bardzo krótkie, konkretne zdania uzasadniające, dlaczego ten zestaw pasuje do okazji: ${aktywnaOkazja}. 
      Nie wspominaj o innych wydarzeniach z kalendarza, jeśli nie są bezpośrednio związane z zapytaniem: "${query}".
      Odpowiedz wyłącznie czystym uzasadnieniem bez powitań, po polsku.
    `;

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: explanationPrompt }],
      temperature: 0.2,
    });

    const newRec = await prisma.outfitRecommendation.create({
      data: {
        userId: user.id,
        clothIds: bestSet.outfit.map((i) => i.id),
        score: bestSet.totalScore,
        scoreDetails: JSON.stringify(bestSet.details),
        explanation: chatCompletion.choices[0]?.message?.content || "",
      },
    });

    return {
      explanation:
        chatCompletion.choices[0]?.message?.content ||
        "Zestaw dopasowany do Twoich preferencji.",
      recommendationId: newRec.id,
      ragItems: bestSet.outfit,
    };
  } catch (err) {
    return {
      explanation:
        "Błąd Autorskiego Systemu RAG (Fitte Engine): " + err.message,
      recommendationId: null,
      ragItems: [],
    };
  }
}

app.post("/api/analyze", authenticateToken, async (req, res) => {
  try {
    const { query, latitude = 51.2465, longitude = 22.5684 } = req.body;
    const userId = req.user.userId;

    const weatherType = await getLiveWeather(latitude, longitude);
    console.log(
      `\n[Weather Engine]: Dynamiczna geopozycja GPS [${latitude}, ${longitude}] zmapowana na stan -> ${weatherType}`,
    );

    let selectedOccasion = "Casual";
    const occasionMatch = query.match(/Okazja:\s*([^.]+)/);
    if (occasionMatch && occasionMatch[1]) {
      selectedOccasion = occasionMatch[1].trim();
    }

    const [user, clothes, events] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
      prisma.event.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        take: 3,
      }),
    ]);

    const textLower = query.toLowerCase();
    const czyUzytkownikZmieniaTemat =
      textLower.includes("spacer") ||
      textLower.includes("kino") ||
      textLower.includes("impreza") ||
      textLower.includes("sport") ||
      textLower.includes("zajęć") ||
      textLower.includes("uczeln");

    const dzis = new Date().toISOString().split("T")[0];
    let currentEvent =
      events.find((e) => {
        const eventDate = new Date(e.date).toISOString().split("T")[0];
        return eventDate === dzis;
      }) ||
      events[0] ||
      null;

    if (czyUzytkownikZmieniaTemat) {
      currentEvent = null;
    }

    let wardrobeContext = generateContextString(clothes, user);

    if (currentEvent) {
      wardrobeContext += `\nAKTYWNE WYDARZENIE Z KALENDARZA: ${currentEvent.title} (Okazja: ${currentEvent.occasion}, Formalność: ${currentEvent.formality})\n`;
    }

    console.log(
      "[RAG Engine]: Generowanie odpowiedzi ze wszystkich silników AI...",
    );

    const startGemini = Date.now();
    const geminiOdp = await askGemini(
      query,
      wardrobeContext,
      weatherType,
    ).catch((err) => "Błąd Gemini: " + err.message);
    const latGemini = Date.now() - startGemini;

    const startMistral = Date.now();
    const mistralOdp = await askMistralCloud(
      query,
      wardrobeContext,
      weatherType,
    ).catch((err) => "Błąd Mistral: " + err.message);
    const latMistral = Date.now() - startMistral;

    const startRag = Date.now();
    const ragResult = await askRAG(
      query,
      clothes,
      user,
      currentEvent,
      selectedOccasion,
      weatherType,
    );
    const latRag = Date.now() - startRag;

    const geminiResolved = resolveMatchedItems(geminiOdp, clothes);
    const llamaResolved = resolveMatchedItems(mistralOdp, clothes);

    const analysisRecord = await prisma.analysis.create({
      data: {
        query,
        geminiResponse: `${geminiOdp} (Czas: ${latGemini}ms)`,
        mistralResponse: `${mistralOdp} (Czas: ${latMistral}ms)`,
        ragResponse: `${ragResult.explanation} (Czas: ${latRag}ms)`,
        contextUsed: wardrobeContext,
        userId,
      },
    });

    res.json({
      ...analysisRecord,
      geminiResponse: `${geminiResolved.cleanText} (Czas: ${latGemini}ms)`,
      mistralResponse: `${llamaResolved.cleanText} (Czas: ${latMistral}ms)`,
      recommendationId: ragResult.recommendationId,
      ragItems: ragResult.ragItems,
      geminiItems: geminiResolved.items,
      llamaItems: llamaResolved.items,
    });
  } catch (error) {
    console.error(" [KRYTYCZNY BŁĄD]:", error);
    res.status(500).json({ error: "Błąd serwera podczas analizy AI" });
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "active",
    service: "Fitte Adaptive AI Stylist Backend",
    academicProject: "Politechnika Lubelska - Praca Magisterska",
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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Błąd rejestracji." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Błędne dane logowania" });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Błąd logowania." });
  }
});

app.post(
  "/api/wardrobe/add",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      if (!req.file) {
        console.log(
          " [Multer]: Przeglądarka ponowiła puste zapytanie (Retry). Ignoruję, aby nie blokować UI.",
        );
        return res.json({ success: true, duplicatedRetry: true });
      }
      const nativeForm = new FormData();
      const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      nativeForm.append("file", fileBlob, "upload.png");

      const hfResponse = await fetch(
        "https://lilyhurko-fitte-ai-service.hf.space/process-image",
        {
          method: "POST",
          body: nativeForm,
        },
      );

      if (!hfResponse.ok)
        throw new Error(`Hugging Face błąd: ${hfResponse.status}`);

      const aiAnalysisRaw = hfResponse.headers.get("x-ai-analysis");
      if (!aiAnalysisRaw) throw new Error("Brak nagłówka analizy AI");

      const decodedAnalysis = Buffer.from(aiAnalysisRaw, "latin1").toString(
        "utf8",
      );
      const aiAnalysis = JSON.parse(decodedAnalysis);

      const imageBuffer = await hfResponse.arrayBuffer();
      const imageUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "fitte_wardrobe" },
          (err, res) => (err ? reject(err) : resolve(res.secure_url)),
        );
        stream.end(Buffer.from(imageBuffer));
      });

      const newCloth = await prisma.cloth.create({
        data: {
          name: aiAnalysis.name || "Eleganckie ubranie",
          category: aiAnalysis.category || "Góra",
          style: aiAnalysis.style || "Minimalizm",
          color: aiAnalysis.color || "kremowy",
          imageUrl: imageUrl,
          userId: userId,
        },
      });

      res.json({ success: true, item: newCloth });
    } catch (error) {
      res.status(500).json({
        error: "Błąd serwera podczas dodawania ubrania",
        details: error.message,
      });
    }
  },
);

app.get("/api/wardrobe", authenticateToken, async (req, res) => {
  try {
    const clothes = await prisma.cloth.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ clothes });
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania szafy" });
  }
});

app.delete("/api/wardrobe/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const cloth = await prisma.cloth.findUnique({ where: { id } });
    if (!cloth || cloth.userId !== req.user.userId)
      return res.status(403).json({ error: "Brak uprawnień" });

    await prisma.cloth.delete({ where: { id } });
    res.json({ success: true, message: "Ubranie usunięte." });
  } catch (error) {
    res.status(500).json({ error: "Błąd usuwania." });
  }
});

app.patch("/api/wardrobe/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, category, style, color } = req.body;

  try {
    const cloth = await prisma.cloth.findUnique({ where: { id } });
    if (!cloth || cloth.userId !== req.user.userId)
      return res.status(403).json({ error: "Brak uprawnień" });

    const updateData = {};
    if (typeof name === "string" && name.trim()) updateData.name = name.trim();
    if (typeof category === "string" && category.trim()) updateData.category = category.trim();
    if (typeof style === "string" && style.trim()) updateData.style = style.trim();
    if (typeof color === "string" && color.trim()) updateData.color = color.trim();

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Brak danych do aktualizacji." });
    }

    const updatedCloth = await prisma.cloth.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, item: updatedCloth });
  } catch (error) {
    res.status(500).json({ error: "Błąd aktualizacji ubrania." });
  }
});
app.get("/api/capsule", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const latitude = parseFloat(req.query.latitude) || 51.2465;
    const longitude = parseFloat(req.query.longitude) || 22.5684;

    const [user, clothes] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
    ]);

    const weatherType = await getLiveWeather(latitude, longitude);

    const capsuleData = generateCapsuleWardrobe(clothes, user, weatherType);
    res.json(capsuleData);
  } catch (error) {
    console.error("Błąd generowania szafy kapsułowej:", error);
    res.status(500).json({ error: "Błąd generowania szafy kapsułowej" });
  }
});

app.post("/api/analyze/:id/feedback", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { modelType, feedback } = req.body;

  try {
    const scoreValue = feedback === "LIKE" ? 1 : 0;

    let updateData = {};
    if (modelType === "gemini") {
      updateData.geminiScore = scoreValue;
    } else if (modelType === "llama") {
      updateData.mistralScore = scoreValue;
    } else {
      return res.status(400).json({ error: "Nieprawidłowy typ modelu" });
    }

    const updatedAnalysis = await prisma.analysis.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, updatedAnalysis });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Błąd podczas zapisu feedbacku: " + error.message });
  }
});

app.post(
  "/api/recommendations/:id/feedback",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { feedback, analysisId } = req.body;
    const userId = req.user.userId;

    try {
      const rec = await prisma.outfitRecommendation.findUnique({
        where: { id },
      });
      if (!rec)
        return res.status(404).json({ error: "Nie znaleziono rekomendacji" });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      let styleWeights = user.styleWeights ? JSON.parse(user.styleWeights) : {};
      let colorWeights = user.colorWeights ? JSON.parse(user.colorWeights) : {};
      const clothes = await prisma.cloth.findMany({
        where: { id: { in: rec.clothIds } },
      });

      const factor = feedback === "LIKE" ? 0.1 : -0.1;
      clothes.forEach((item) => {
        if (item.style)
          styleWeights[item.style] = (styleWeights[item.style] || 1.0) + factor;
        if (item.color)
          colorWeights[item.color] = (colorWeights[item.color] || 1.0) + factor;
      });

      const operations = [
        prisma.user.update({
          where: { id: userId },
          data: {
            styleWeights: JSON.stringify(styleWeights),
            colorWeights: JSON.stringify(colorWeights),
          },
        }),
        prisma.outfitRecommendation.update({
          where: { id },
          data: { status: feedback === "LIKE" ? "LIKED" : "DISLIKED" },
        }),
      ];

      if (analysisId) {
        operations.push(
          prisma.analysis.update({
            where: { id: analysisId },
            data: { ragScore: feedback === "LIKE" ? 1 : 0 },
          }),
        );
      }

      await prisma.$transaction(operations);
      res.json({ success: true, styleWeights, colorWeights });
    } catch (error) {
      res.status(500).json({ error: "Błąd pętli uczenia: " + error.message });
    }
  },
);

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, gender: true, styleTags: true, name: true },
    });
    res.json({ ...user, firstName: user.name });
  } catch (error) {
    res.status(500).json({ error: "Błąd profilu" });
  }
});

app.patch("/api/profile", authenticateToken, async (req, res) => {
  const { firstName, email, gender } = req.body;
  try {
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== req.user.userId)
        return res.status(400).json({ error: "E-mail zajęty." });
    }
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name: firstName, email, gender },
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Błąd aktualizacji" });
  }
});

app.post(
  "/api/profile/change-password",
  authenticateToken,
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });
      if (!(await bcrypt.compare(currentPassword, user.password)))
        return res.status(400).json({ error: "Błędne hasło." });

      await prisma.user.update({
        where: { id: req.user.userId },
        data: { password: await bcrypt.hash(newPassword, 10) },
      });
      res.json({ success: true, message: "Hasło zmienione." });
    } catch (error) {
      res.status(500).json({ error: "Błąd zmiany hasła." });
    }
  },
);

app.get("/api/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Pobieramy historię analiz, rekomendacje ubrań RAG oraz całą szafę
    const [history, recommendations, clothes] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.outfitRecommendation.findMany({
        where: { userId },
      }),
      prisma.cloth.findMany({
        where: { userId }
      })
    ]);

    const clothesMap = new Map(clothes.map(c => [c.id, c]));

    const richHistory = history.map(item => {
      const geminiRaw = item.geminiResponse || "";
      const mistralRaw = item.mistralResponse || "";

      const geminiResolved = resolveMatchedItems(geminiRaw, clothes);
      const llamaResolved = resolveMatchedItems(mistralRaw, clothes);

      const matchingRec = recommendations.find(r => r.analysisId === item.id || r.id === item.recommendationId);
      
      let ragItems = [];
      if (matchingRec && matchingRec.clothIds) {
        const ids = Array.isArray(matchingRec.clothIds) 
          ? matchingRec.clothIds 
          : JSON.parse(matchingRec.clothIds || "[]");
        
        ragItems = ids.map(id => clothesMap.get(id)).filter(Boolean);
      } 
      
      if (ragItems.length === 0) {
        ragItems = findMatchingClothes(item.ragResponse || "", clothes);
      }

      return {
        ...item,
        geminiResponse: geminiResolved.cleanText,
        mistralResponse: llamaResolved.cleanText,
        geminiItems: geminiResolved.items,
        llamaItems: llamaResolved.items,
        ragItems: ragItems 
      };
    });

    res.json(richHistory);
  } catch (error) {
    console.error("Błąd w endpointcie historii:", error);
    res.status(500).json({ error: "Błąd pobierania bogatej historii." });
  }
});

app.get("/api/events", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [events, user, clothes] = await Promise.all([
      prisma.event.findMany({
        where: { userId: userId },
        orderBy: { date: "asc" },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId: userId } }),
    ]);

    let dailyWeatherMap = {};
    try {
      const weatherRes = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=51.2465&longitude=22.5684&daily=temperature_2m_max,rain_sum&timezone=auto",
      );
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        wData.daily.time.forEach((dateStr, index) => {
          const maxTemp = wData.daily.temperature_2m_max[index];
          const rainSum = wData.daily.rain_sum[index];

          let dayStatus = "Clear";
          if (rainSum > 0.2) dayStatus = "Rain";
          else if (maxTemp >= 24) dayStatus = "Hot";
          else if (maxTemp <= 10) dayStatus = "Cold";

          dailyWeatherMap[dateStr] = dayStatus;
        });
      }
    } catch (e) {
      console.error(
        "Nie udało się pobrać prognozy dla kalendarza, używam Clear:",
        e.message,
      );
    }

    const eventsWithOutfits = events.map((event) => {
      const eventDateStr = new Date(event.date).toISOString().split("T")[0];
      const forecastedWeather = dailyWeatherMap[eventDateStr] || "Clear";

      const topOutfits = generateBestOutfits(
        clothes,
        user,
        event,
        event.occasion,
        forecastedWeather,
      );
      const bestOutfitItems = topOutfits.length > 0 ? topOutfits[0].outfit : [];

      return {
        ...event,
        aiProposedOutfit: bestOutfitItems,
      };
    });

    res.json({ events: eventsWithOutfits });
  } catch (error) {
    console.error("Błąd generowania propozycji kalendarza:", error);
    res.status(500).json({ error: "Błąd serwera." });
  }
});

app.post("/api/events", authenticateToken, async (req, res) => {
  const { title, date, occasion, formality, outfitIds } = req.body;
  try {
    if (!title || !date || !occasion || !formality)
      return res.status(400).json({ error: "Wszystkie pola są wymagane." });
    const newEvent = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        occasion,
        formality,
        outfitIds: outfitIds || [],
        userId: req.user.userId,
      },
    });
    res.json({ success: true, event: newEvent });
  } catch (error) {
    res.status(500).json({ error: "Błąd zapisu wydarzenia." });
  }
});

app.delete("/api/events/:id", authenticateToken, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });
    if (!event || event.userId !== req.user.userId)
      return res.status(403).json({ error: "Brak uprawnień" });

    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Wydarzenie usunięte." });
  } catch (error) {
    res.status(500).json({ error: "Błąd usuwania wydarzenia." });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`Serwer Fitte działa stabilnie na porcie ${PORT}`),
);