require("dotenv").config();
const { randomUUID } = require("crypto");
const requiredEnvironment = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  AI_SERVICE_TOKEN: process.env.AI_SERVICE_TOKEN,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY:
    process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET:
    process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET,
};
const writeLog = (level, event, metadata = {}) => {
  const method = ["error", "warn", "info"].includes(level) ? level : "log";

  console[method](
    JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      event,
      ...metadata,
    }),
  );
};
const circuitBreakers = new Map();

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const resilientFetch = async (
  provider,
  url,
  fetchOptions = {},
  {
    timeoutMs = 10000,
    retries = 2,
    failureThreshold = 3,
    resetAfterMs = 30000,
  } = {},
) => {
  const now = Date.now();

  const circuit = circuitBreakers.get(provider) || {
    failures: 0,
    openUntil: 0,
  };

  if (circuit.openUntil > now) {
    const error = new Error(`Circuit breaker otwarty: ${provider}`);
    error.statusCode = 503;
    error.publicMessage = "Usługa zewnętrzna jest chwilowo niedostępna.";
    throw error;
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      const retryableStatus =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;

      if (!response.ok && retryableStatus) {
        throw new Error(`${provider} odpowiedział kodem ${response.status}`);
      }

      circuitBreakers.set(provider, {
        failures: 0,
        openUntil: 0,
      });

      return response;
    } catch (error) {
      lastError = error;

      writeLog("warn", "external_request_failed", {
        provider,
        attempt: attempt + 1,
        errorName: error.name,
      });

      if (attempt < retries) {
        await wait(500 * 2 ** attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  circuit.failures += 1;

  if (circuit.failures >= failureThreshold) {
    circuit.openUntil = Date.now() + resetAfterMs;

    writeLog("warn", "circuit_breaker_opened", {
      provider,
      resetAfterMs,
    });
  }

  circuitBreakers.set(provider, circuit);
  throw lastError;
};
const resilientOperation = async (
  provider,
  operation,
  { retries = 1, failureThreshold = 3, resetAfterMs = 30000 } = {},
) => {
  const circuit = circuitBreakers.get(provider) || {
    failures: 0,
    openUntil: 0,
  };

  if (circuit.openUntil > Date.now()) {
    const error = new Error(`Circuit breaker otwarty: ${provider}`);
    error.statusCode = 503;
    error.publicMessage = "Usługa zewnętrzna jest chwilowo niedostępna.";
    throw error;
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await operation();

      circuitBreakers.set(provider, {
        failures: 0,
        openUntil: 0,
      });

      return result;
    } catch (error) {
      lastError = error;

      writeLog("warn", "external_operation_failed", {
        provider,
        attempt: attempt + 1,
        errorName: error.name,
      });

      if (attempt < retries) {
        await wait(500 * 2 ** attempt);
      }
    }
  }

  circuit.failures += 1;

  if (circuit.failures >= failureThreshold) {
    circuit.openUntil = Date.now() + resetAfterMs;

    writeLog("warn", "circuit_breaker_opened", {
      provider,
      resetAfterMs,
    });
  }

  circuitBreakers.set(provider, circuit);
  throw lastError;
};
const missingEnvironment = Object.entries(requiredEnvironment)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

if (missingEnvironment.length > 0) {
  writeLog("error", "missing_environment_variables", {
    variables: missingEnvironment,
  });
  process.exit(1);
}
const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const {
  generateCapsuleWardrobe,
  generateTripCapsuleWardrobe,
} = require("./capsuleEngine");
const { z } = require("zod");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Groq = require("groq-sdk") } = require("groq-sdk");

const app = express();
app.set("trust proxy", 1);
const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
  maxRetries: 2,
});
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  gender: true,
  styleTags: true,
  favoriteColors: true,
  styleWeights: true,
  colorWeights: true,
  createdAt: true,
};
const { generateBestOutfits, isNonOutfitItem } = require("./outfitEngine");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin niedozwolony przez CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});
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
    gora: [
      "top",
      "koszul",
      "t-shirt",
      "bluzk",
      "marynark",
      "kimono",
      "żakiet",
      "kardigan",
    ],
    dol: ["spodn", "jeans", "dżins", "nogawk", "szort", "spodenk", "spódnic"],
    buty: ["buty", "sneakers", "mule", "obcas", "sandał", "szpilk", "obuwie"],
    sukienka: ["sukienk", "tunik", "suknia"],
  };

  const synonimyKolorow = {
    kremowy: ["kremow", "beżow", "bial", "biał", "ecru"],
    beżowy: ["beżow", "kremow", "ecru", "piaskow"],
    biały: ["biał", "biel", "kremow", "ecru"],
    czarny: ["czarn", "ciemn", "grafit"],
    niebieski: ["niebiesk", "błękit", "jeans", "granat", "dżins"],
  };

  clothes.forEach((cloth) => {
    const nameLower = cloth.name ? cloth.name.toLowerCase() : "";
    const categoryLower = cloth.category ? cloth.category.toLowerCase() : "";
    const colorLower = cloth.color ? cloth.color.toLowerCase() : "";

    const jestSukienka =
      categoryLower.includes("sukienk") || nameLower.includes("sukienk");
    const jestGora =
      categoryLower.includes("góra") ||
      nameLower.includes("koszul") ||
      nameLower.includes("t-shirt") ||
      nameLower.includes("top") ||
      nameLower.includes("marynark") ||
      nameLower.includes("kardigan");
    const jestDol =
      categoryLower.includes("dół") ||
      nameLower.includes("spodn") ||
      nameLower.includes("jeans") ||
      nameLower.includes("dżins") ||
      nameLower.includes("szort") ||
      nameLower.includes("spodenk");
    const jestButy =
      categoryLower.includes("buty") ||
      categoryLower.includes("obuwie") ||
      nameLower.includes("sneakers") ||
      nameLower.includes("mule") ||
      nameLower.includes("szpilk");

    const aiPiszeOSukience = synonimyKategorii.sukienka.some((s) =>
      text.includes(s),
    );
    const aiPiszeOGorze = synonimyKategorii.gora.some((s) => text.includes(s));
    const aiPiszeODole = synonimyKategorii.dol.some((s) => text.includes(s));
    const aiPiszeOButach = synonimyKategorii.buty.some((s) => text.includes(s));

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
        else if (nameLower.includes("biał") || nameLower.includes("biel"))
          bazaKolor = "biały";
        else if (nameLower.includes("krem")) bazaKolor = "kremowy";
        else if (nameLower.includes("beż")) bazaKolor = "beżowy";
        else if (nameLower.includes("zielon")) bazaKolor = "zielony";
        else if (nameLower.includes("róż")) bazaKolor = "różowy";
      }

      const oczekiwaneFrazy = synonimyKolorow[bazaKolor] || [bazaKolor];
      colorMatch = oczekiwaneFrazy.some((fraza) => text.includes(fraza));

      if (
        text.includes("róż") &&
        (nameLower.includes("zielon") || colorLower.includes("zielon"))
      ) {
        colorMatch = false;
      }
      if (
        text.includes("zielon") &&
        (nameLower.includes("róż") || colorLower.includes("róż"))
      ) {
        colorMatch = false;
      }

      const slowaNazwy = nameLower.split(/\s+/).filter((w) => w.length > 3);
      const nameKeywordMatch = slowaNazwy.some((s) =>
        text.includes(s.slice(0, -1)),
      );

      if (colorMatch || nameKeywordMatch) {
        matched.push(cloth);
      }
    }
  });

  const uniqueMatched = [];
  matched.forEach((item) => {
    if (!uniqueMatched.some((m) => m.id === item.id || m._id === item._id)) {
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

  const cleanText = (
    withoutCzas.replace(markerRegex, "").trim() + czasSuffix
  ).trim();

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

function classifyDailyWeather(maxTemp, rainSum) {
  if (rainSum > 0.2) return "Rain";
  if (maxTemp >= 24) return "Hot";
  if (maxTemp <= 10) return "Cold";
  return "Clear";
}

async function getLiveWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,rain,snow_depth`;
    const response = await resilientFetch(
      "open-meteo",
      url,
      {},
      {
        timeoutMs: 5000,
        retries: 2,
      },
    );
    if (!response.ok) throw new Error("Błąd pobierania pogody");

    const data = await response.json();
    const temp = data.current.temperature_2m;
    const rain = data.current.rain;
    const snow = data.current.snow_depth;
    if (rain > 0.1 || snow > 0) return "Rain";
    if (temp >= 24) return "Hot";
    if (temp <= 10) return "Cold";

    return "Clear";
  } catch (error) {
    writeLog("warn", "weather_fallback", {
      provider: "open-meteo",
      errorName: error.name,
    });

    return "Clear";
  }
}

async function geocodeCity(cityName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pl&format=json`;
  const response = await resilientFetch(
    "open-meteo",
    url,
    {},
    {
      timeoutMs: 5000,
      retries: 2,
    },
  );
  if (!response.ok) throw new Error("Błąd geokodowania miasta");

  const data = await response.json();
  if (!data.results || data.results.length === 0) return null;

  const best = data.results[0];
  return {
    name: best.name,
    country: best.country,
    latitude: best.latitude,
    longitude: best.longitude,
  };
}

async function getMultiDayForecast(lat, lon, days) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,rain_sum&forecast_days=${days}&timezone=auto`;
  const response = await resilientFetch(
    "open-meteo",
    url,
    {},
    {
      timeoutMs: 5000,
      retries: 2,
    },
  );
  if (!response.ok) throw new Error("Błąd pobierania prognozy wielodniowej");

  const data = await response.json();
  if (!data.daily || !data.daily.time) return [];

  return data.daily.time.map((dateStr, index) => {
    const maxTemp = data.daily.temperature_2m_max[index];
    const rainSum = data.daily.rain_sum[index];
    return {
      date: dateStr,
      maxTemp,
      rainSum,
      weatherType: classifyDailyWeather(maxTemp, rainSum),
    };
  });
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
7. Nigdy nie proponuj bielizny ani stroju kąpielowego jako elementu stylizacji na wyjście — to nie są ubrania wierzchnie, niezależnie od okazji.

PYTANIE UŻYTKOWNIKA: ${query}
`;
};

async function askGemini(query, context, weatherType) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = getBasePrompt(query, context, weatherType);
    const result = await resilientOperation(
      "gemini",
      () =>
        model.generateContent(prompt, {
          timeout: 30000,
        }),
      {
        retries: 1,
      },
    );
    return result.response.text();
  } catch (error) {
    writeLog("warn", "gemini_fallback", {
      provider: "gemini",
      errorName: error.name,
    });

    return "Model Gemini jest chwilowo niedostępny.";
  }
}

async function askGroqCloud(query, context, weatherType) {
  try {
    const prompt = getBasePrompt(query, context, weatherType);
    const chatCompletion = await resilientOperation(
      "groq",
      () =>
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          reasoning_effort: "low",
          max_completion_tokens: 256,
        }),
      {
        retries: 0,
      },
    );
    return (
      chatCompletion.choices[0]?.message?.content ||
      "Brak odpowiedzi ze strony modelu Groq."
    );
  } catch (error) {
    writeLog("warn", "groq_fallback", {
      provider: "groq",
      errorName: error.name,
    });

    return "Model Groq jest chwilowo niedostępny.";
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

    let explanation =
      "Zestaw został najlepiej oceniony pod kątem okazji, pogody i Twoich preferencji.";
    try {
      const chatCompletion = await resilientOperation(
        "groq",
        () =>
          groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: explanationPrompt }],
            temperature: 0.2,
            reasoning_effort: "low",
            max_completion_tokens: 256,
          }),
        {
          retries: 0,
        },
      );
      explanation = chatCompletion.choices[0]?.message?.content || explanation;
    } catch (explanationError) {
      writeLog("warn", "groq_explanation_fallback", {
        provider: "groq",
        model: GROQ_MODEL,
        errorName: explanationError.name,
      });
    }

    const newRec = await prisma.outfitRecommendation.create({
      data: {
        userId: user.id,
        clothIds: bestSet.outfit.map((i) => i.id),
        score: bestSet.totalScore,
        scoreDetails: JSON.stringify(bestSet.details),
        explanation,
      },
    });

    return {
      explanation,
      recommendationId: newRec.id,
      ragItems: bestSet.outfit,
    };
  } catch (error) {
    writeLog("warn", "rag_fallback", {
      provider: "fitte-engine",
      errorName: error.name,
    });

    return {
      explanation: "Nie udało się przygotować rekomendacji Fitte.",
      recommendationId: null,
      ragItems: [],
    };
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: "Zbyt wiele prób. Spróbuj ponownie za 15 minut.",
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Zbyt wiele przesłanych zdjęć. Spróbuj ponownie za minutę.",
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Zbyt wiele zapytań do AI. Spróbuj ponownie za minutę.",
  },
});

app.post(
  "/api/analyze",
  authenticateToken,
  aiLimiter,
  async (req, res, next) => {
    try {
      const validation = analyzeSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.issues[0].message,
        });
      }

      const { query, latitude, longitude } = validation.data;
      const userId = req.user.userId;

      const weatherType = await getLiveWeather(latitude, longitude);

      let selectedOccasion = "Casual";
      const occasionMatch = query.match(/Okazja:\s*([^.]+)/);
      if (occasionMatch && occasionMatch[1]) {
        selectedOccasion = occasionMatch[1].trim();
      }

      const [user, allClothes, events] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.cloth.findMany({ where: { userId } }),
        prisma.event.findMany({
          where: { userId },
          orderBy: { date: "asc" },
          take: 3,
        }),
      ]);

      const clothes = allClothes.filter((c) => !isNonOutfitItem(c));

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
      writeLog("info", "ai_analysis_started", {
        requestId: req.requestId,
      });

      const startGemini = Date.now();
      const geminiOdp = await askGemini(query, wardrobeContext, weatherType);
      const latGemini = Date.now() - startGemini;

      const startMistral = Date.now();
      const mistralOdp = await askGroqCloud(
        query,
        wardrobeContext,
        weatherType,
      );
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
      error.publicMessage = "Błąd serwera podczas analizy AI.";
      next(error);
    }
  },
);

app.get("/", (req, res) => {
  res.json({
    status: "active",
    service: "Fitte Adaptive AI Stylist Backend",
    academicProject: "Politechnika Lubelska - Praca Magisterska",
  });
});

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email("Nieprawidłowy adres e-mail"));

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .max(128, "Hasło jest za długie"),
});

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Imię musi mieć minimum 2 znaki")
    .max(80, "Imię jest za długie"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .max(128, "Hasło jest za długie"),
  styleTags: z.array(z.string().max(50)).max(20).default([]),
  favoriteColors: z.array(z.string().max(30)).max(20).default([]),
});

const analyzeSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Zapytanie jest za krótkie")
    .max(2000, "Zapytanie jest za długie"),

  latitude: z.coerce
    .number()
    .min(-90, "Nieprawidłowa szerokość geograficzna")
    .max(90, "Nieprawidłowa szerokość geograficzna")
    .default(51.2465),

  longitude: z.coerce
    .number()
    .min(-180, "Nieprawidłowa długość geograficzna")
    .max(180, "Nieprawidłowa długość geograficzna")
    .default(22.5684),
});
const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Nieprawidłowy identyfikator");

const analysisFeedbackSchema = z.object({
  modelType: z.enum(["gemini", "llama"], {
    error: "Nieprawidłowy typ modelu",
  }),
  feedback: z.enum(["LIKE", "DISLIKE"], {
    error: "Nieprawidłowa wartość feedbacku",
  }),
});

const recommendationFeedbackSchema = z.object({
  feedback: z.enum(["LIKE", "DISLIKE"], {
    error: "Nieprawidłowa wartość feedbacku",
  }),
  analysisId: objectIdSchema.optional(),
});
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Obecne hasło jest wymagane")
      .max(128, "Hasło jest za długie"),

    newPassword: z
      .string()
      .min(8, "Nowe hasło musi mieć minimum 8 znaków")
      .max(128, "Nowe hasło jest za długie"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Nowe hasło musi różnić się od obecnego",
    path: ["newPassword"],
  });

const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Imię musi mieć minimum 2 znaki")
    .max(80, "Imię jest za długie"),

  email: emailSchema,

  gender: z.enum(["Kobieta", "Mężczyzna", "Inna"], {
    error: "Nieprawidłowa wartość płci",
  }),
});

const createEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Nazwa wydarzenia jest wymagana")
    .max(120, "Nazwa wydarzenia jest za długa"),

  date: z
    .string()
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      "Nieprawidłowa data wydarzenia",
    ),

  occasion: z.enum(
    ["Casual", "Praca", "Randka", "Impreza", "Sport", "Podróż"],
    { error: "Nieprawidłowa okazja" },
  ),

  formality: z.enum(["Casual", "Smart Casual", "Formal"], {
    error: "Nieprawidłowy poziom formalności",
  }),

  outfitIds: z.array(objectIdSchema).max(20).default([]),
});

const updateClothSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),

    category: z
      .enum([
        "Góra",
        "Dół",
        "Sukienki",
        "Obuwie",
        "Okrycia wierzchnie",
        "Akcesoria",
        "Torby",
        "Bielizna",
      ])
      .optional(),

    style: z.string().trim().min(1).max(300).optional(),
    color: z.string().trim().min(1).max(50).optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Brak danych do aktualizacji",
  );

const capsuleQuerySchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, "Nieprawidłowa szerokość geograficzna")
    .max(90, "Nieprawidłowa szerokość geograficzna")
    .default(51.2465),

  longitude: z.coerce
    .number()
    .min(-180, "Nieprawidłowa długość geograficzna")
    .max(180, "Nieprawidłowa długość geograficzna")
    .default(22.5684),
});

const tripCapsuleSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1, "Podaj nazwę miasta")
    .max(100, "Nazwa miasta jest za długa"),

  days: z.coerce
    .number()
    .int("Liczba dni musi być całkowita")
    .min(1, "Podaj minimum jeden dzień")
    .max(16, "Możesz wygenerować kapsułę maksymalnie na 16 dni"),
});

app.post("/api/register", authLimiter, async (req, res, next) => {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const { name, email, password, styleTags, favoriteColors } = validation.data;
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
      select: PUBLIC_USER_SELECT,
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({ user, token });
  } catch (error) {
    error.publicMessage = "Błąd rejestracji.";
    next(error);
  }
});

app.post("/api/login", authLimiter, async (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }
  const { email, password } = validation.data;
  try {
    const userWithPassword = await prisma.user.findUnique({
      where: { email },
      select: {
        ...PUBLIC_USER_SELECT,
        password: true,
      },
    });

    if (
      !userWithPassword ||
      !(await bcrypt.compare(password, userWithPassword.password))
    ) {
      return res.status(401).json({ error: "Błędne dane logowania" });
    }

    const token = jwt.sign({ userId: userWithPassword.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const { password: _password, ...user } = userWithPassword;

    res.json({ user, token });
  } catch (error) {
    error.publicMessage = "Błąd logowania.";
    next(error);
  }
});

app.post(
  "/api/wardrobe/add",
  authenticateToken,
  uploadLimiter,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const userId = req.user.userId;

      if (!req.file) {
        writeLog("warn", "upload_without_file", {
          requestId: req.requestId,
        });
        return res.status(400).json({
          error: "Brak pliku obrazu.",
        });
      }
      const nativeForm = new FormData();
      const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      nativeForm.append("file", fileBlob, req.file.originalname || "upload");
      const hfResponse = await resilientFetch(
        "hugging-face",
        "https://lilyhurko-fitte-ai-service.hf.space/process-image",
        {
          method: "POST",
          headers: {
            "X-Service-Token": process.env.AI_SERVICE_TOKEN,
          },
          body: nativeForm,
        },
        {
          timeoutMs: 90000,
          retries: 1,
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
      const uploadedImage = await resilientOperation(
        "cloudinary",
        () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: "fitte_wardrobe",
                public_id: req.requestId,
                overwrite: true,
                timeout: 30000,
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve({
                    imageUrl: result.secure_url,
                    publicId: result.public_id,
                  });
                }
              },
            );

            stream.end(Buffer.from(imageBuffer));
          }),
        {
          retries: 1,
        },
      );

      const newCloth = await prisma.cloth.create({
        data: {
          name: aiAnalysis.name || "Eleganckie ubranie",
          category: aiAnalysis.category || "Góra",
          style: aiAnalysis.style || "Minimalizm",
          color: aiAnalysis.color || "kremowy",
          imageUrl: uploadedImage.imageUrl,
          cloudinaryPublicId: uploadedImage.publicId,
          userId: userId,
        },
      });

      res.json({ success: true, item: newCloth });
    } catch (error) {
      error.publicMessage = "Błąd serwera podczas dodawania ubrania.";
      next(error);
    }
  },
);

app.get("/api/wardrobe", authenticateToken, async (req, res, next) => {
  try {
    const clothes = await prisma.cloth.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ clothes });
  } catch (error) {
    error.publicMessage = "Błąd pobierania szafy.";
    next(error);
  }
});

app.delete("/api/wardrobe/:id", authenticateToken, async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);

  if (!idValidation.success) {
    return res.status(400).json({
      error: idValidation.error.issues[0].message,
    });
  }

  const id = idValidation.data;
  try {
    const cloth = await prisma.cloth.findUnique({ where: { id } });
    if (!cloth || cloth.userId !== req.user.userId)
      return res.status(403).json({ error: "Brak uprawnień" });

    if (cloth.cloudinaryPublicId) {
      const cloudinaryResult = await resilientOperation(
        "cloudinary",
        () =>
          cloudinary.uploader.destroy(cloth.cloudinaryPublicId, {
            resource_type: "image",
            invalidate: true,
            timeout: 30000,
          }),
        {
          retries: 1,
        },
      );

      if (!["ok", "not found"].includes(cloudinaryResult.result)) {
        throw new Error("Cloudinary nie usunął obrazu");
      }
    }
    await prisma.cloth.delete({ where: { id } });
    res.json({ success: true, message: "Ubranie usunięte." });
  } catch (error) {
    error.publicMessage = "Błąd usuwania ubrania.";
    next(error);
  }
});

app.patch("/api/wardrobe/:id", authenticateToken, async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);
  const bodyValidation = updateClothSchema.safeParse(req.body);

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      error:
        idValidation.error?.issues[0].message ||
        bodyValidation.error?.issues[0].message,
    });
  }

  const id = idValidation.data;
  const updateData = bodyValidation.data;

  try {
    const cloth = await prisma.cloth.findUnique({ where: { id } });
    if (!cloth || cloth.userId !== req.user.userId)
      return res.status(403).json({ error: "Brak uprawnień" });

    const updatedCloth = await prisma.cloth.update({
      where: { id },
      data: updateData,
    });
    res.json({ success: true, item: updatedCloth });
  } catch (error) {
    error.publicMessage = "Błąd aktualizacji ubrania.";
    next(error);
  }
});

app.get("/api/capsule", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const validation = capsuleQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.issues[0].message,
      });
    }

    const { latitude, longitude } = validation.data;

    const [user, clothes] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
    ]);

    const weatherType = await getLiveWeather(latitude, longitude);

    const capsuleData = generateCapsuleWardrobe(clothes, user, weatherType);
    res.json(capsuleData);
  } catch (error) {
    error.publicMessage = "Błąd generowania szafy kapsułowej.";
    next(error);
  }
});

const MAX_TRIP_DAYS = 16;

app.post("/api/capsule/trip", authenticateToken, async (req, res, next) => {
  try {
    const validation = tripCapsuleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.issues[0].message,
      });
    }

    const userId = req.user.userId;
    const { city, days: tripDays } = validation.data;

    const location = await geocodeCity(city.trim());
    if (!location) {
      return res.status(404).json({
        error: `Nie znaleziono miasta "${city}". Sprawdź pisownię i spróbuj ponownie.`,
      });
    }

    const [user, clothes, dailyForecast] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
      getMultiDayForecast(location.latitude, location.longitude, tripDays),
    ]);

    if (dailyForecast.length === 0) {
      return res.status(502).json({
        error: "Nie udało się pobrać prognozy pogody dla tego miasta.",
      });
    }

    const weatherTypes = Array.from(
      new Set(dailyForecast.map((d) => d.weatherType)),
    );

    const capsuleData = generateTripCapsuleWardrobe(
      clothes,
      user,
      weatherTypes,
      tripDays,
    );

    res.json({
      ...capsuleData,
      city: location.name,
      country: location.country,
      days: tripDays,
      requestedDays: tripDays,
      dailyForecast,
      weatherTypes,
    });
  } catch (error) {
    error.publicMessage = "Błąd generowania kapsuły podróżnej.";
    next(error);
  }
});

app.post(
  "/api/analyze/:id/feedback",
  authenticateToken,
  async (req, res, next) => {
    const idValidation = objectIdSchema.safeParse(req.params.id);
    const bodyValidation = analysisFeedbackSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        error:
          idValidation.error?.issues[0].message ||
          bodyValidation.error?.issues[0].message,
      });
    }

    const id = idValidation.data;
    const { modelType, feedback } = bodyValidation.data;

    try {
      const scoreValue = feedback === "LIKE" ? 1 : 0;
      const updateData = {};

      if (modelType === "gemini") {
        updateData.geminiScore = scoreValue;
      } else if (modelType === "llama") {
        updateData.mistralScore = scoreValue;
      }

      const updateResult = await prisma.analysis.updateMany({
        where: {
          id,
          userId: req.user.userId,
        },
        data: updateData,
      });

      if (updateResult.count === 0) {
        return res.status(404).json({
          error: "Nie znaleziono analizy należącej do tego użytkownika",
        });
      }

      res.json({ success: true });
    } catch (error) {
      error.publicMessage = "Nie udało się zapisać feedbacku.";
      next(error);
    }
  },
);

app.post(
  "/api/recommendations/:id/feedback",
  authenticateToken,
  async (req, res, next) => {
    const idValidation = objectIdSchema.safeParse(req.params.id);
    const bodyValidation = recommendationFeedbackSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        error:
          idValidation.error?.issues[0].message ||
          bodyValidation.error?.issues[0].message,
      });
    }

    const id = idValidation.data;
    const { feedback, analysisId } = bodyValidation.data;
    const userId = req.user.userId;

    try {
      const rec = await prisma.outfitRecommendation.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!rec) {
        return res.status(404).json({
          error: "Nie znaleziono rekomendacji użytkownika",
        });
      }

      if (rec.status !== "PENDING") {
        return res.status(409).json({
          error: "Ta rekomendacja została już oceniona",
        });
      }

      if (analysisId) {
        const analysis = await prisma.analysis.findFirst({
          where: {
            id: analysisId,
            userId,
          },
          select: {
            id: true,
          },
        });

        if (!analysis) {
          return res.status(404).json({
            error: "Nie znaleziono analizy użytkownika",
          });
        }
      }

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          styleWeights: true,
          colorWeights: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: "Nie znaleziono użytkownika",
        });
      }

      const clothes = await prisma.cloth.findMany({
        where: {
          id: {
            in: rec.clothIds,
          },
          userId,
        },
      });

      let styleWeights = user.styleWeights ? JSON.parse(user.styleWeights) : {};

      let colorWeights = user.colorWeights ? JSON.parse(user.colorWeights) : {};

      const factor = feedback === "LIKE" ? 0.1 : -0.1;

      clothes.forEach((item) => {
        if (item.style) {
          styleWeights[item.style] = (styleWeights[item.style] || 1.0) + factor;
        }

        if (item.color) {
          colorWeights[item.color] = (colorWeights[item.color] || 1.0) + factor;
        }
      });

      const operations = [
        prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            styleWeights: JSON.stringify(styleWeights),
            colorWeights: JSON.stringify(colorWeights),
          },
        }),

        prisma.outfitRecommendation.updateMany({
          where: {
            id,
            userId,
            status: "PENDING",
          },
          data: {
            status: feedback === "LIKE" ? "LIKED" : "DISLIKED",
          },
        }),
      ];

      if (analysisId) {
        operations.push(
          prisma.analysis.updateMany({
            where: {
              id: analysisId,
              userId,
            },
            data: {
              ragScore: feedback === "LIKE" ? 1 : 0,
            },
          }),
        );
      }

      await prisma.$transaction(operations);

      res.json({
        success: true,
        styleWeights,
        colorWeights,
      });
    } catch (error) {
      error.publicMessage = "Nie udało się zapisać oceny rekomendacji.";
      next(error);
    }
  },
);

app.get("/api/profile", authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, gender: true, styleTags: true, name: true },
    });
    res.json({ ...user, firstName: user.name });
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać profilu.";
    next(error);
  }
});

app.patch("/api/profile", authenticateToken, async (req, res, next) => {
  const validation = updateProfileSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const { firstName, email, gender } = validation.data;
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
    error.publicMessage = "Nie udało się zaktualizować profilu.";
    next(error);
  }
});

app.post(
  "/api/profile/change-password",
  authenticateToken,
  async (req, res, next) => {
    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.issues[0].message,
      });
    }

    const { currentPassword, newPassword } = validation.data;
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
      error.publicMessage = "Nie udało się zmienić hasła.";
      next(error);
    }
  },
);

app.get("/api/history", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [history, recommendations, allClothes] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.outfitRecommendation.findMany({
        where: { userId },
      }),
      prisma.cloth.findMany({
        where: { userId },
      }),
    ]);

    // Ten sam filtr co przy generowaniu — bielizna/strój kąpielowy nie mają się pojawiać w dopasowanych zdjęciach,
    // nawet przy ponownym parsowaniu starszych wpisów historii.
    const clothes = allClothes.filter((c) => !isNonOutfitItem(c));
    const clothesMap = new Map(clothes.map((c) => [c.id, c]));

    const richHistory = history.map((item) => {
      const geminiRaw = item.geminiResponse || "";
      const mistralRaw = item.mistralResponse || "";

      const geminiResolved = resolveMatchedItems(geminiRaw, clothes);
      const llamaResolved = resolveMatchedItems(mistralRaw, clothes);

      const matchingRec = recommendations.find(
        (r) => r.analysisId === item.id || r.id === item.recommendationId,
      );

      let ragItems = [];
      if (matchingRec && matchingRec.clothIds) {
        const ids = Array.isArray(matchingRec.clothIds)
          ? matchingRec.clothIds
          : JSON.parse(matchingRec.clothIds || "[]");

        ragItems = ids.map((id) => clothesMap.get(id)).filter(Boolean);
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
        ragItems: ragItems,
      };
    });

    res.json(richHistory);
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać historii.";
    next(error);
  }
});

app.get("/api/events", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [events, user, clothes] = await Promise.all([
      prisma.event.findMany({
        where: { userId },
        orderBy: { date: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
      }),
      prisma.cloth.findMany({
        where: { userId },
      }),
    ]);

    const dailyWeatherMap = {};
    try {
      const weatherRes = await resilientFetch(
        "open-meteo",
        "https://api.open-meteo.com/v1/forecast?latitude=51.2465&longitude=22.5684&daily=temperature_2m_max,rain_sum&timezone=auto",

        {},
        {
          timeoutMs: 5000,
          retries: 2,
        },
      );

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();

        weatherData.daily.time.forEach((dateString, index) => {
          const maxTemperature = weatherData.daily.temperature_2m_max[index];
          const rainSum = weatherData.daily.rain_sum[index];

          dailyWeatherMap[dateString] = classifyDailyWeather(
            maxTemperature,
            rainSum,
          );
        });
      }
    } catch (error) {
      writeLog("warn", "calendar_weather_fallback", {
        provider: "open-meteo",
        errorName: error.name,
      });
    }

    const eventsWithOutfits = events.map((event) => {
      const eventDate = new Date(event.date).toISOString().split("T")[0];
      const weatherType = dailyWeatherMap[eventDate] || "Clear";

      const topOutfits = generateBestOutfits(
        clothes,
        user,
        event,
        event.occasion,
        weatherType,
      );

      const bestOutfitItems = topOutfits.length > 0 ? topOutfits[0].outfit : [];

      return {
        ...event,
        aiProposedOutfit: bestOutfitItems,
      };
    });

    res.json({ events: eventsWithOutfits });
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać wydarzeń.";
    next(error);
  }
});

app.post("/api/events", authenticateToken, async (req, res, next) => {
  const validation = createEventSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  const { title, date, occasion, formality, outfitIds } = validation.data;

  try {
    const newEvent = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        occasion,
        formality,
        outfitIds,
        userId: req.user.userId,
      },
    });
    res.json({ success: true, event: newEvent });
  } catch (error) {
    error.publicMessage = "Nie udało się zapisać wydarzenia.";
    next(error);
  }
});

app.delete("/api/events/:id", authenticateToken, async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);

  if (!idValidation.success) {
    return res.status(400).json({
      error: idValidation.error.issues[0].message,
    });
  }

  const eventId = idValidation.data;

  try {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        userId: req.user.userId,
      },
    });

    if (!event) {
      return res.status(404).json({
        error: "Nie znaleziono wydarzenia użytkownika.",
      });
    }

    await prisma.event.delete({
      where: { id: eventId },
    });

    res.json({
      success: true,
      message: "Wydarzenie usunięte.",
    });
  } catch (error) {
    error.publicMessage = "Nie udało się usunąć wydarzenia.";
    next(error);
  }
});
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let publicMessage = error.publicMessage;

  if (error instanceof multer.MulterError) {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    publicMessage =
      error.code === "LIMIT_FILE_SIZE"
        ? "Plik przekracza maksymalny rozmiar 15 MB."
        : "Nie udało się przesłać pliku.";
  }

  if (!publicMessage) {
    publicMessage =
      statusCode >= 500
        ? "Wystąpił wewnętrzny błąd serwera."
        : "Nie udało się wykonać żądania.";
  }

  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      errorName: error.name,
      errorCode: error.code || null,
    }),
  );

  res.status(statusCode).json({
    error: publicMessage,
    requestId: req.requestId,
  });
});
const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  writeLog("info", "server_started", {
    port: Number(PORT),
  }),
);
