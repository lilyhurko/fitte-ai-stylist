const { prisma } = require("../config/prisma");
const { isNonOutfitItem } = require("../outfitEngine");
const {
  findMatchingClothes,
  resolveMatchedItems,
} = require("../services/clothingMatchService");

const COMPARISON_SOURCES = ["gemini", "groq", "fitte"];

const getFeedbackStatus = (score, recommendationStatus) => {
  if (score === 1) return "LIKE";
  if (score === 0) return "DISLIKE";
  if (recommendationStatus === "LIKED") return "LIKE";
  if (recommendationStatus === "DISLIKED") return "DISLIKE";
  return "PENDING";
};

const getComparisonOrder = (comparisonOrder) => {
  if (!Array.isArray(comparisonOrder)) return COMPARISON_SOURCES;

  const validOrder = comparisonOrder.filter((source) =>
    COMPARISON_SOURCES.includes(source),
  );

  return new Set(validOrder).size === COMPARISON_SOURCES.length
    ? validOrder
    : COMPARISON_SOURCES;
};

const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [history, allClothes] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          recommendations: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.cloth.findMany({ where: { userId } }),
    ]);
    const clothes = allClothes.filter((cloth) => !isNonOutfitItem(cloth));
    const clothesMap = new Map(clothes.map((cloth) => [cloth.id, cloth]));
    const richHistory = history.map((item) => {
      const geminiResolved = resolveMatchedItems(
        item.geminiResponse || "",
        clothes,
      );
      const groqResolved = resolveMatchedItems(
        item.groqResponse || "",
        clothes,
      );
      const matchingRecommendation = item.recommendations?.[0];
      let fitteItems = [];
      if (matchingRecommendation?.clothIds) {
        const ids = Array.isArray(matchingRecommendation.clothIds)
          ? matchingRecommendation.clothIds
          : JSON.parse(matchingRecommendation.clothIds || "[]");
        fitteItems = ids.map((id) => clothesMap.get(id)).filter(Boolean);
      }
      if (fitteItems.length === 0)
        fitteItems = findMatchingClothes(item.fitteResponse || "", clothes);

      const comparisonsBySource = {
        gemini: {
          response: geminiResolved.cleanText,
          items: geminiResolved.items,
          feedback: getFeedbackStatus(item.geminiScore),
        },
        groq: {
          response: groqResolved.cleanText,
          items: groqResolved.items,
          feedback: getFeedbackStatus(item.groqScore),
        },
        fitte: {
          response: item.fitteResponse || "",
          items: fitteItems,
          feedback: getFeedbackStatus(
            item.fitteScore,
            matchingRecommendation?.status,
          ),
        },
      };

      const anonymousComparisons = getComparisonOrder(item.comparisonOrder).map(
        (source, index) => ({
          id: `proposal-${index + 1}`,
          label: `Propozycja ${String.fromCharCode(65 + index)}`,
          ...comparisonsBySource[source],
        }),
      );

      return {
        id: item.id,
        query: item.query,
        createdAt: item.createdAt,
        anonymousComparisons,
      };
    });
    res.json(richHistory);
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać historii.";
    next(error);
  }
};

module.exports = { getHistory };
