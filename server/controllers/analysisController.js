const { prisma } = require("../config/prisma");
const { analyzeSchema } = require("../validators/analysisValidators");
const { getLiveWeather } = require("../services/weatherService");
const { askGemini, askGroqCloud } = require("../services/aiService");
const { askRAG } = require("../services/ragService");
const {
  generateContextString,
  resolveMatchedItems,
} = require("../services/clothingMatchService");
const { writeLog } = require("../services/logger");
const { isNonOutfitItem } = require("../outfitEngine");

const analyze = async (req, res, next) => {
  const validation = analyzeSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });

  try {
    const { query, latitude, longitude } = validation.data;
    const userId = req.user.userId;
    const weatherType = await getLiveWeather(latitude, longitude);
    const occasionMatch = query.match(/Okazja:\s*([^.]+)/);
    const selectedOccasion = occasionMatch?.[1]?.trim() || "Casual";
    const [user, allClothes, events] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
      prisma.event.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        take: 3,
      }),
    ]);
    const clothes = allClothes.filter((cloth) => !isNonOutfitItem(cloth));
    const changedTopic = [
      "spacer",
      "kino",
      "impreza",
      "sport",
      "zajęć",
      "uczeln",
    ].some((phrase) => query.toLowerCase().includes(phrase));
    const today = new Date().toISOString().split("T")[0];
    let currentEvent =
      events.find(
        (event) => new Date(event.date).toISOString().split("T")[0] === today,
      ) ||
      events[0] ||
      null;
    if (changedTopic) currentEvent = null;

    let context = generateContextString(clothes, user);
    if (currentEvent) {
      context += `\nAKTYWNE WYDARZENIE Z KALENDARZA: ${currentEvent.title} (Okazja: ${currentEvent.occasion}, Formalność: ${currentEvent.formality})\n`;
    }
    writeLog("info", "ai_analysis_started", { requestId: req.requestId });

    const geminiStart = Date.now();
    const geminiResponse = await askGemini(query, context, weatherType);
    const geminiTime = Date.now() - geminiStart;
    const groqStart = Date.now();
    const groqResponse = await askGroqCloud(query, context, weatherType);
    const groqTime = Date.now() - groqStart;
    const ragStart = Date.now();
    const ragResult = await askRAG(
      query,
      clothes,
      user,
      currentEvent,
      selectedOccasion,
      weatherType,
    );
    const ragTime = Date.now() - ragStart;
    const geminiResolved = resolveMatchedItems(geminiResponse, clothes);
    const groqResolved = resolveMatchedItems(groqResponse, clothes);

    const record = await prisma.analysis.create({
      data: {
        query,
        geminiResponse: `${geminiResponse} (Czas: ${geminiTime}ms)`,
        mistralResponse: `${groqResponse} (Czas: ${groqTime}ms)`,
        ragResponse: `${ragResult.explanation} (Czas: ${ragTime}ms)`,
        contextUsed: context,
        userId,
      },
    });
    
    if (ragResult.recommendationId) {
      const linkResult = await prisma.outfitRecommendation.updateMany({
        where: {
          id: ragResult.recommendationId,
          userId,
        },
        data: {
          analysisId: record.id,
        },
      });

      if (linkResult.count === 0) {
        writeLog("warn", "recommendation_analysis_link_failed", {
          requestId: req.requestId,
          analysisId: record.id,
        });
      }
    }

    res.json({
      ...record,
      geminiResponse: `${geminiResolved.cleanText} (Czas: ${geminiTime}ms)`,
      mistralResponse: `${groqResolved.cleanText} (Czas: ${groqTime}ms)`,
      recommendationId: ragResult.recommendationId,
      ragItems: ragResult.ragItems,
      geminiItems: geminiResolved.items,
      llamaItems: groqResolved.items,
    });
  } catch (error) {
    error.publicMessage = "Błąd serwera podczas analizy AI.";
    next(error);
  }
};

module.exports = { analyze };
