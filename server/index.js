require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient(); 

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('🚀 Backend Fitte działa!');
});

app.post('/api/register', async (req, res) => {
  const { name, email, styleTags, favoriteColors } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        styleTags: JSON.stringify(styleTags),
        favoriteColors: JSON.stringify(favoriteColors)
      }
    });
    res.json(user);
  } catch (error) {
    console.error("❌ Błąd zapisu:", error);
    res.status(400).json({ error: "Błąd bazy danych." });
  }
});

app.listen(5001, () => console.log('🚀 Serwer na http://localhost:5001'));