const { prisma } = require("../config/prisma");
const { analyzeSchema } = require("../validators/analysisValidators");
const { getLiveWeatherContext } = require("../services/weatherService");
const { askGemini, askGroqCloud } = require("../services/aiService");
const { askFitteEngine } = require("../services/recommendationService");
const {
  generateContextString,
  resolveMatchedItems,
} = require("../services/clothingMatchService");
const { writeLog } = require("../services/logger");
const { isNonOutfitItem } = require("../outfitEngine");

const shuffle = (items) => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
};

const analyze = async (req, res, next) => {
  const validation = analyzeSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });

  try {
    const { query, latitude, longitude } = validation.data;
    const userId = req.user.userId;
    const weatherContext = await getLiveWeatherContext(latitude, longitude);
    const occasionMatch = query.match(/Okazja:\s*([^.]+)/);
    const selectedOccasion = occasionMatch?.[1]?.trim() || "Casual";
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
    const [user, allClothes, currentEvent] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
      prisma.event.findFirst({
        where: {
          userId,
          occasion: selectedOccasion,
          date: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
        orderBy: { date: "asc" },
      }),
    ]);
    const clothes = allClothes.filter((cloth) => !isNonOutfitItem(cloth));

    let context = generateContextString(clothes, user);
    if (currentEvent) {
      context += `\nAKTYWNE WYDARZENIE Z KALENDARZA: ${currentEvent.title} (Okazja: ${currentEvent.occasion}, Formalność: ${currentEvent.formality})\n`;
    }
    writeLog("info", "ai_analysis_started", { requestId: req.requestId });

    const geminiStart = Date.now();
    const geminiResponse = await askGemini(
      query,
      context,
      weatherContext,
      req.requestId,
    );
    const geminiTime = Date.now() - geminiStart;
    writeLog(
      geminiResponse === "Model Gemini jest chwilowo niedostępny."
        ? "warn"
        : "info",
      "ai_provider_completed",
      {
        requestId: req.requestId,
        provider: "gemini",
        model: "gemini-2.5-flash",
        status:
          geminiResponse === "Model Gemini jest chwilowo niedostępny."
            ? "fallback"
            : "success",
        durationMs: geminiTime,
      },
    );
    const groqStart = Date.now();
    const groqResponse = await askGroqCloud(
      query,
      context,
      weatherContext,
      req.requestId,
    );
    const groqTime = Date.now() - groqStart;
    writeLog(
      groqResponse === "Model Groq jest chwilowo niedostępny."
        ? "warn"
        : "info",
      "ai_provider_completed",
      {
        requestId: req.requestId,
        provider: "groq",
        status:
          groqResponse === "Model Groq jest chwilowo niedostępny."
            ? "fallback"
            : "success",
        durationMs: groqTime,
      },
    );
    const fitteStart = Date.now();
    const fitteResult = await askFitteEngine(
      query,
      clothes,
      user,
      currentEvent,
      selectedOccasion,
      weatherContext,
      req.requestId,
    );
    const fitteTime = Date.now() - fitteStart;
    writeLog(
      fitteResult.recommendationAvailability ? "info" : "warn",
      "fitte_engine_completed",
      {
        requestId: req.requestId,
        provider: "fitte-engine",
        status: fitteResult.recommendationAvailability
          ? fitteResult.recommendationAvailability.status
          : "fallback",
        algorithmVersion: fitteResult.algorithmVersion,
        durationMs: fitteTime,
      },
    );
    const geminiResolved = resolveMatchedItems(geminiResponse, clothes);
    const groqResolved = resolveMatchedItems(groqResponse, clothes);

    const comparisonOrder = shuffle(["gemini", "groq", "fitte"]);

    const record = await prisma.analysis.create({
      data: {
        query,
        geminiResponse: `${geminiResponse} (Czas: ${geminiTime}ms)`,
        groqResponse: `${groqResponse} (Czas: ${groqTime}ms)`,
        fitteResponse: `${fitteResult.explanation} (Czas: ${fitteTime}ms)`,
        contextUsed: context,
        comparisonOrder,
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

    const comparisonSources = {
      gemini: {
        response: `${geminiResolved.cleanText} (Czas: ${geminiTime}ms)`,
        items: geminiResolved.items,
        feedbackType: "gemini",
      },
      groq: {
        response: `${groqResolved.cleanText} (Czas: ${groqTime}ms)`,
        items: groqResolved.items,
        feedbackType: "groq",
      },
      fitte: {
        response: `${fitteResult.explanation} (Czas: ${fitteTime}ms)`,
        items: fitteResult.fitteItems,
        feedbackType: "fitte",
        recommendationId: fitteResult.recommendationId,
        availability: fitteResult.recommendationAvailability,
      },
    };

    const anonymousComparisons = comparisonOrder.map((source, index) => ({
      id: `proposal-${index + 1}`,
      label: `Propozycja ${String.fromCharCode(65 + index)}`,
      ...comparisonSources[source],
    }));

    res.json({
      ...record,
      anonymousComparisons,
      weatherContext,
    });
  } catch (error) {
    error.publicMessage = "Błąd serwera podczas analizy AI.";
    next(error);
  }
};
module.exports = { analyze };
