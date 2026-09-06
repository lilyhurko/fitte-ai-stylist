const { prisma } = require("../config/prisma");
const { isNonOutfitItem } = require("../outfitEngine");
const {
  findMatchingClothes,
  resolveMatchedItems,
} = require("../services/clothingMatchService");

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
      const { recommendations: _recommendations, ...analysis } = item;
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
      return {
        ...analysis,
        geminiResponse: geminiResolved.cleanText,
        groqResponse: groqResolved.cleanText,
        geminiItems: geminiResolved.items,
        groqItems: groqResolved.items,
        fitteItems,
      };
    });
    res.json(richHistory);
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać historii.";
    next(error);
  }
};

module.exports = { getHistory };
