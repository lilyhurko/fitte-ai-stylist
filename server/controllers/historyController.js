const { prisma } = require("../config/prisma");
const { isNonOutfitItem } = require("../outfitEngine");
const { findMatchingClothes, resolveMatchedItems } = require("../services/clothingMatchService");

const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [history, recommendations, allClothes] = await Promise.all([
      prisma.analysis.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.outfitRecommendation.findMany({ where: { userId } }),
      prisma.cloth.findMany({ where: { userId } }),
    ]);
    const clothes = allClothes.filter((cloth) => !isNonOutfitItem(cloth));
    const clothesMap = new Map(clothes.map((cloth) => [cloth.id, cloth]));
    const richHistory = history.map((item) => {
      const geminiResolved = resolveMatchedItems(item.geminiResponse || "", clothes);
      const groqResolved = resolveMatchedItems(item.mistralResponse || "", clothes);
      const matchingRecommendation = recommendations.find(
        (recommendation) => recommendation.analysisId === item.id || recommendation.id === item.recommendationId,
      );
      let ragItems = [];
      if (matchingRecommendation?.clothIds) {
        const ids = Array.isArray(matchingRecommendation.clothIds)
          ? matchingRecommendation.clothIds
          : JSON.parse(matchingRecommendation.clothIds || "[]");
        ragItems = ids.map((id) => clothesMap.get(id)).filter(Boolean);
      }
      if (ragItems.length === 0) ragItems = findMatchingClothes(item.ragResponse || "", clothes);
      return {
        ...item,
        geminiResponse: geminiResolved.cleanText,
        mistralResponse: groqResolved.cleanText,
        geminiItems: geminiResolved.items,
        llamaItems: groqResolved.items,
        ragItems,
      };
    });
    res.json(richHistory);
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać historii.";
    next(error);
  }
};

module.exports = { getHistory };
