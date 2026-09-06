const { prisma } = require("../config/prisma");
const { deleteImage } = require("./wardrobeService");
const { writeLog } = require("./logger");

const deleteClothWithDependencies = async ({ clothId, userId, requestId }) => {
  const cloth = await prisma.cloth.findFirst({
    where: {
      id: clothId,
      userId,
    },
  });

  if (!cloth) {
    return false;
  }

  const [events, recommendations] = await Promise.all([
    prisma.event.findMany({
      where: {
        userId,
        outfitIds: {
          has: clothId,
        },
      },
      select: {
        id: true,
        outfitIds: true,
      },
    }),

    prisma.outfitRecommendation.findMany({
      where: {
        userId,
        clothIds: {
          has: clothId,
        },
      },
      select: {
        id: true,
        clothIds: true,
      },
    }),
  ]);

  const databaseOperations = [
    ...events.map((event) =>
      prisma.event.update({
        where: { id: event.id },
        data: {
          outfitIds: {
            set: event.outfitIds.filter((id) => id !== clothId),
          },
        },
      }),
    ),

    ...recommendations.map((recommendation) =>
      prisma.outfitRecommendation.update({
        where: { id: recommendation.id },
        data: {
          clothIds: {
            set: recommendation.clothIds.filter((id) => id !== clothId),
          },
        },
      }),
    ),

    prisma.cloth.delete({
      where: { id: cloth.id },
    }),
  ];

  await prisma.$transaction(databaseOperations);

  if (cloth.cloudinaryPublicId) {
    try {
      await deleteImage(cloth.cloudinaryPublicId);
    } catch (error) {
      writeLog("warn", "cloudinary_delete_after_cloth_failed", {
        requestId,
        clothId,
        errorName: error.name,
      });
    }
  }

  return true;
};

const deleteUserAccountWithDependencies = async ({ userId, requestId }) => {
  const clothes = await prisma.cloth.findMany({
    where: { userId },
    select: {
      cloudinaryPublicId: true,
    },
  });

  const databaseOperations = [
    prisma.outfitRecommendation.deleteMany({
      where: { userId },
    }),

    prisma.analysis.deleteMany({
      where: { userId },
    }),

    prisma.event.deleteMany({
      where: { userId },
    }),

    prisma.cloth.deleteMany({
      where: { userId },
    }),

    prisma.user.deleteMany({
      where: { id: userId },
    }),
  ];

  const results = await prisma.$transaction(databaseOperations);
  const userDeletionResult = results.at(-1);

  if (userDeletionResult.count === 0) {
    return false;
  }

  const publicIds = clothes
    .map((cloth) => cloth.cloudinaryPublicId)
    .filter(Boolean);

  const cloudinaryResults = await Promise.allSettled(
    publicIds.map((publicId) => deleteImage(publicId)),
  );

  const failedImages = cloudinaryResults.filter(
    (result) => result.status === "rejected",
  );

  if (failedImages.length > 0) {
    writeLog("warn", "account_cloudinary_cleanup_incomplete", {
      requestId,
      userId,
      failedImages: failedImages.length,
    });
  }

  return true;
};

module.exports = {
  deleteClothWithDependencies,
  deleteUserAccountWithDependencies,
};
