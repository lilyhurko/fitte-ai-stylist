require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

app.post('/api/register', async (req, res) => {
  const { name, email, password, styleTags, favoriteColors } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        styleTags: JSON.stringify(styleTags),
        favoriteColors: JSON.stringify(favoriteColors)
      }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Użytkownik już istnieje." });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Nie znaleziono użytkownika" });

    if (!user.password) {
      console.error("❌ Użytkownik nie ma hasła w bazie danych!");
      return res.status(400).json({ error: "Konto wymaga zresetowania hasła (brak hasza)." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Błędne hasło" });

    if (!JWT_SECRET) {
      console.error("❌ BŁĄD: Zmienna JWT_SECRET nie została wczytana z pliku .env!");
      throw new Error("JWT_SECRET is undefined");
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });

  } catch (error) {
    console.error("🚨 BŁĄD LOGOWANIA:", error.message);
    res.status(500).json({ error: "Wystąpił błąd serwera podczas logowania." });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Serwer bezpiecznie działa na porcie ${PORT}`));