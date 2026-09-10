const { prisma } = require("../config/prisma");
const { objectIdSchema } = require("../validators/commonValidators");
const {
  analysisFeedbackSchema,
  recommendationFeedbackSchema,
} = require("../validators/analysisValidators");
const {
  adjustPreferenceWeight,
} = require("../services/preferenceLearningService");
const {
  normalizeStyleNames,
  normalizeColorName,
} = require("../services/attributeNormalizationService");

const parseWeights = (value) => {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
};

const saveAnalysisFeedback = async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);
  const bodyValidation = analysisFeedbackSchema.safeParse(req.body);
  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      error:
        idValidation.error?.issues[0].message ||
        bodyValidation.error?.issues[0].message,
    });
  }
  try {
    const { modelType, feedback } = bodyValidation.data;
    const data =
      modelType === "gemini"
        ? { geminiScore: feedback === "LIKE" ? 1 : 0 }
        : { groqScore: feedback === "LIKE" ? 1 : 0 };
    const result = await prisma.analysis.updateMany({
      where: { id: idValidation.data, userId: req.user.userId },
      data,
    });
    if (result.count === 0)
      return res.status(404).json({
        error: "Nie znaleziono analizy należącej do tego użytkownika",
      });
    res.json({ success: true });
  } catch (error) {
    error.publicMessage = "Nie udało się zapisać feedbacku.";
    next(error);
  }
};

const saveRecommendationFeedback = async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);
  const bodyValidation = recommendationFeedbackSchema.safeParse(req.body);
  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      error:
        idValidation.error?.issues[0].message ||
        bodyValidation.error?.issues[0].message,
    });
  }
  const userId = req.user.userId;
  const { feedback, analysisId } = bodyValidation.data;
  try {
    const recommendation = await prisma.outfitRecommendation.findFirst({
      where: { id: idValidation.data, userId },
    });
    if (!recommendation)
      return res
        .status(404)
        .json({ error: "Nie znaleziono rekomendacji użytkownika" });
    if (recommendation.status !== "PENDING")
      return res
        .status(409)
        .json({ error: "Ta rekomendacja została już oceniona" });

    if (analysisId) {
      const analysis = await prisma.analysis.findFirst({
        where: { id: analysisId, userId },
        select: { id: true },
      });
      if (!analysis)
        return res
          .status(404)
          .json({ error: "Nie znaleziono analizy użytkownika" });
    }
    const [user, clothes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { styleWeights: true, colorWeights: true },
      }),
      prisma.cloth.findMany({
        where: { id: { in: recommendation.clothIds }, userId },
      }),
    ]);
    if (!user)
      return res.status(404).json({ error: "Nie znaleziono użytkownika" });

    const styleWeights = parseWeights(user.styleWeights);
    const colorWeights = parseWeights(user.colorWeights);
    clothes.forEach((item) => {
      const normalizedStyles = normalizeStyleNames(item.style);
      const normalizedColor = normalizeColorName(item.color);

      normalizedStyles.forEach((style) => {
        styleWeights[style] = adjustPreferenceWeight(
          styleWeights[style],
          feedback,
        );
      });

      if (normalizedColor) {
        colorWeights[normalizedColor] = adjustPreferenceWeight(
          colorWeights[normalizedColor],
          feedback,
        );
      }
    });

    const operations = [
      prisma.user.update({
        where: { id: userId },
        data: {
          styleWeights,
          colorWeights,
        },
      }),
      prisma.outfitRecommendation.updateMany({
        where: { id: idValidation.data, userId, status: "PENDING" },
        data: { status: feedback === "LIKE" ? "LIKED" : "DISLIKED" },
      }),
    ];
    if (analysisId)
      operations.push(
        prisma.analysis.updateMany({
          where: { id: analysisId, userId },
          data: { fitteScore: feedback === "LIKE" ? 1 : 0 },
        }),
      );
    await prisma.$transaction(operations);
    res.json({ success: true, styleWeights, colorWeights });
  } catch (error) {
    error.publicMessage = "Nie udało się zapisać oceny rekomendacji.";
    next(error);
  }
};

module.exports = { saveAnalysisFeedback, saveRecommendationFeedback };
