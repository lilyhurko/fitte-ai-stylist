require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
const prisma = new PrismaClient();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});
const JWT_SECRET = process.env.JWT_SECRET;
const cloudinary = require("cloudinary").v2;

app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post("/api/register", async (req, res) => {
  const { name, email, password, styleTags, favoriteColors } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Ten adres e-mail jest już zajęty." });
    }

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
    res.status(500).json({ error: "Błąd serwera podczas rejestracji." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res.status(404).json({ error: "Nie znaleziono użytkownika" });
    if (!user.password)
      return res
        .status(400)
        .json({ error: "Konto wymaga zresetowania hasła." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Błędne hasło" });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "24h",
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: "Wystąpił błąd serwera." });
  }
});

app.post("/api/wardrobe/add", upload.single("image"), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Zaloguj się najpierw!" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    if (!req.file) return res.status(400).json({ error: "Brak zdjęcia" });

    const form = new FormData();
    form.append("file", req.file.buffer, { filename: "upload.png" });

    const aiResponse = await axios.post(
      "http://localhost:8000/process-image",
      form,
      {
        headers: { ...form.getHeaders() },
        responseType: "arraybuffer",
        timeout: 300000,
      },
    );

    const aiAnalysis = JSON.parse(aiResponse.headers["x-ai-analysis"]);
    console.log(" Wykryty kolor:", aiAnalysis.color);
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "fitte_wardrobe" },
          (error, result) => {
            if (result) resolve(result.secure_url);
            else reject(error);
          },
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
        imageUrl: imageUrl,
        userId: userId,
      },
    });

    res.json({ success: true, item: newCloth });
  } catch (error) {
    console.error(" Błąd:", error.message);
    res.status(500).json({ error: "Błąd serwera przy dodawaniu" });
  }
});
app.get("/api/wardrobe", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Brak autoryzacji" });

    const decoded = jwt.verify(token, JWT_SECRET);

    const clothes = await prisma.cloth.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ clothes });
  } catch (error) {
    res.status(500).json({ error: "Nie udało się pobrać szafy" });
  }
});
const PORT = 5001;
const server = app.listen(PORT, () =>
  console.log(`🚀 Serwer Fitte działa na porcie ${PORT}`),
);
server.timeout = 300000;
