require("../config/env");

const { prisma } = require("../config/prisma");

const parseLegacyValue = (value, expectedType) => {
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);

    if (expectedType === "array" && !Array.isArray(parsed)) {
      return null;
    }

    if (
      expectedType === "object" &&
      (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const migrate = async () => {
  let updatedUsers = 0;
  let updatedRecommendations = 0;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      styleTags: true,
      favoriteColors: true,
      styleWeights: true,
      colorWeights: true,
    },
  });

  for (const user of users) {
    const data = {};

    const styleTags = parseLegacyValue(user.styleTags, "array");
    const favoriteColors = parseLegacyValue(user.favoriteColors, "array");
    const styleWeights = parseLegacyValue(user.styleWeights, "object");
    const colorWeights = parseLegacyValue(user.colorWeights, "object");

    if (styleTags !== null) data.styleTags = styleTags;
    if (favoriteColors !== null) data.favoriteColors = favoriteColors;
    if (styleWeights !== null) data.styleWeights = styleWeights;
    if (colorWeights !== null) data.colorWeights = colorWeights;

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data,
      });

      updatedUsers += 1;
    }
  }

  const recommendations = await prisma.outfitRecommendation.findMany({
    select: {
      id: true,
      scoreDetails: true,
    },
  });

  for (const recommendation of recommendations) {
    const scoreDetails = parseLegacyValue(
      recommendation.scoreDetails,
      "object",
    );

    if (scoreDetails !== null) {
      await prisma.outfitRecommendation.update({
        where: { id: recommendation.id },
        data: { scoreDetails },
      });

      updatedRecommendations += 1;
    }
  }

  console.log({
    updatedUsers,
    updatedRecommendations,
  });
};

migrate()
  .catch((error) => {
    console.error("Migracja nie powiodła się:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });