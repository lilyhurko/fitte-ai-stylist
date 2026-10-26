const { prisma } = require("../config/prisma");

const createUserDataExport = async (userId) => {
  const [user, clothes, clothingDrafts, events, analyses, recommendations] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
          name: true,
          gender: true,
          styleTags: true,
          favoriteColors: true,
          styleWeights: true,
          colorWeights: true,
          defaultLocationName: true,
          defaultLatitude: true,
          defaultLongitude: true,
          defaultTimezone: true,
          createdAt: true,
          authIdentities: {
            select: {
              provider: true,
              email: true,
              createdAt: true,
            },
          },
        },
      }),

      prisma.cloth.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),

      prisma.clothDraft.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),

      prisma.event.findMany({
        where: { userId },
        orderBy: { date: "asc" },
      }),

      prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),

      prisma.outfitRecommendation.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  if (!user) {
    return null;
  }

  return {
    exportFormatVersion: 1,
    exportedAt: new Date().toISOString(),
    user,
    wardrobe: {
      clothes,
      drafts: clothingDrafts,
    },
    calendar: {
      events,
    },
    analyses,
    recommendations,
  };
};

module.exports = {
  createUserDataExport,
};
