const { prisma } = require("../config/prisma");
const { analyzeSchema } = require("../validators/analysisValidators");
const { getLiveWeather } = require("../services/weatherService");
const { askGemini, askGroqCloud } = require("../services/aiService");
const {
  askFitteEngine,
} = require("../services/recommendationService");
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
    const fitteStart = Date.now();
    const fitteResult = await askFitteEngine(
      query,
      clothes,
      user,
      currentEvent,
      selectedOccasion,
      weatherType,
    );
    const fitteTime = Date.now() - fitteStart;
    const geminiResolved = resolveMatchedItems(geminiResponse, clothes);
    const groqResolved = resolveMatchedItems(groqResponse, clothes);

    const record = await prisma.analysis.create({
      data: {
        query,
        geminiResponse: `${geminiResponse} (Czas: ${geminiTime}ms)`,
        groqResponse: `${groqResponse} (Czas: ${groqTime}ms)`,
        fitteResponse: `${fitteResult.explanation} (Czas: ${fitteTime}ms)`,
        contextUsed: context,
        userId,
      },
    });
    
    if (fitteResult.recommendationId) {
      const linkResult = await prisma.outfitRecommendation.updateMany({
        where: {
          id: fitteResult.recommendationId,
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
      groqResponse: `${groqResolved.cleanText} (Czas: ${groqTime}ms)`,
      recommendationId: fitteResult.recommendationId,
      fitteItems: fitteResult.fitteItems,
      geminiItems: geminiResolved.items,
      groqItems: groqResolved.items,
    });
  } catch (error) {
    error.publicMessage = "Błąd serwera podczas analizy AI.";
    next(error);
  }
};

module.exports = { analyze };
