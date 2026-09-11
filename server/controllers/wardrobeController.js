const { prisma } = require("../config/prisma");
const { objectIdSchema } = require("../validators/commonValidators");
const {
  normalizeColorName,
} = require("../services/attributeNormalizationService");
const { updateClothSchema } = require("../validators/wardrobeValidators");
const { clothDraftSchema } = require("../validators/clothDraftValidators");
const { writeLog } = require("../services/logger");
const {
  processAndUploadImage,
  deleteImage,
} = require("../services/wardrobeService");
const { deleteClothWithDependencies } = require("../services/deletionService");
const {
  getCorrectedFields,
  isDraftExpired,
} = require("../services/clothDraftService");
const CLOTH_DRAFT_LIFETIME_MS = 30 * 60 * 1000;
const analyzeClothDraft = async (req, res, next) => {
  let uploadedImage = null;

  try {
    if (!req.file) {
      writeLog("warn", "draft_upload_without_file", {
        requestId: req.requestId,
      });

      return res.status(400).json({
        error: "Brak pliku obrazu.",
      });
    }

    const processingResult = await processAndUploadImage(
      req.file,
      req.requestId,
    );

    uploadedImage = processingResult.uploadedImage;

    const normalizedAnalysis = {
      ...processingResult.analysis,
      color: normalizeColorName(processingResult.analysis.color),
    };

    const validation = clothDraftSchema.safeParse(normalizedAnalysis);

    if (!validation.success) {
      await deleteImage(uploadedImage.publicId);

      writeLog("warn", "invalid_ai_clothing_analysis", {
        requestId: req.requestId,
        issues: validation.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
      });

      return res.status(502).json({
        error: "Usługa AI zwróciła nieprawidłowe dane ubrania.",
      });
    }

    const expiresAt = new Date(Date.now() + CLOTH_DRAFT_LIFETIME_MS);

    const draft = await prisma.clothDraft.create({
      data: {
        userId: req.user.userId,
        aiAnalysis: validation.data,
        imageUrl: uploadedImage.imageUrl,
        cloudinaryPublicId: uploadedImage.publicId,
        expiresAt,
      },
    });

    return res.json({
      success: true,
      draft: {
        id: draft.id,
        ...validation.data,
        imageUrl: draft.imageUrl,
        expiresAt: draft.expiresAt,
      },
    });
  } catch (error) {
    if (uploadedImage?.publicId) {
      try {
        await deleteImage(uploadedImage.publicId);
      } catch (cleanupError) {
        writeLog("warn", "draft_image_cleanup_failed", {
          requestId: req.requestId,
          errorName: cleanupError.name,
        });
      }
    }

    error.publicMessage = "Nie udało się przygotować wersji roboczej ubrania.";

    next(error);
  }
};
const confirmClothDraft = async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);
  const bodyValidation = clothDraftSchema.safeParse(req.body);

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      error:
        idValidation.error?.issues[0].message ||
        bodyValidation.error?.issues[0].message,
    });
  }

  try {
    const draft = await prisma.clothDraft.findFirst({
      where: {
        id: idValidation.data,
        userId: req.user.userId,
      },
    });

    if (!draft) {
      return res.status(404).json({
        error: "Nie znaleziono wersji roboczej ubrania.",
      });
    }

    if (isDraftExpired(draft.expiresAt)) {
      try {
        await deleteImage(draft.cloudinaryPublicId);
      } catch (cleanupError) {
        writeLog("warn", "expired_draft_image_cleanup_failed", {
          requestId: req.requestId,
          errorName: cleanupError.name,
        });
      }

      await prisma.clothDraft.deleteMany({
        where: {
          id: draft.id,
          userId: req.user.userId,
        },
      });

      return res.status(410).json({
        error: "Wersja robocza wygasła. Prześlij zdjęcie ponownie.",
      });
    }

    const confirmedData = {
      ...bodyValidation.data,
      color: normalizeColorName(bodyValidation.data.color),
    };

    const correctedFields = getCorrectedFields(draft.aiAnalysis, confirmedData);

    const [item] = await prisma.$transaction([
      prisma.cloth.create({
        data: {
          ...confirmedData,
          imageUrl: draft.imageUrl,
          cloudinaryPublicId: draft.cloudinaryPublicId,
          userId: req.user.userId,
          aiSuggestedAttributes: draft.aiAnalysis,
          correctedFields,
          attributesConfirmedAt: new Date(),
        },
      }),

      prisma.clothDraft.delete({
        where: {
          id: draft.id,
        },
      }),
    ]);

    return res.status(201).json({
      success: true,
      item,
      correctedFields,
    });
  } catch (error) {
    error.publicMessage = "Nie udało się potwierdzić ubrania.";

    next(error);
  }
};


const cancelClothDraft = async (req, res, next) => {
    const idValidation = objectIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return res.status(400).json({
        error: idValidation.error.issues[0].message,
      });
    }

    try {
      const draft = await prisma.clothDraft.findFirst({
        where: {
          id: idValidation.data,
          userId: req.user.userId,
        },
      });

      if (!draft) {
        return res.status(404).json({
          error: "Nie znaleziono wersji roboczej ubrania.",
        });
      }

      await deleteImage(draft.cloudinaryPublicId);

      await prisma.clothDraft.delete({
        where: {
          id: draft.id,
        },
      });

      return res.json({
        success: true,
        message: "Wersja robocza została usunięta.",
      });
    } catch (error) {
      error.publicMessage = "Nie udało się anulować wersji roboczej ubrania.";

      next(error);
    }
  };


const addCloth = async (req, res, next) => {
  try {
    if (!req.file) {
      writeLog("warn", "upload_without_file", { requestId: req.requestId });
      return res.status(400).json({ error: "Brak pliku obrazu." });
    }
    const { analysis, uploadedImage } = await processAndUploadImage(
      req.file,
      req.requestId,
    );
    const item = await prisma.cloth.create({
      data: {
        name: analysis.name || "Eleganckie ubranie",
        category: analysis.category || "Góra",
        style: analysis.style || "Minimalizm",
        color: normalizeColorName(analysis.color) || "kremowy",
        materials: Array.isArray(analysis.materials) ? analysis.materials : [],
        seasons: Array.isArray(analysis.seasons) ? analysis.seasons : [],
        warmthLevel: analysis.warmthLevel ?? null,
        waterResistance: analysis.waterResistance ?? null,
        formality: analysis.formality ?? null,
        pattern: analysis.pattern ?? null,
        sleeveLength: analysis.sleeveLength ?? null,
        imageUrl: uploadedImage.imageUrl,
        cloudinaryPublicId: uploadedImage.publicId,
        userId: req.user.userId,
      },
    });
    res.json({ success: true, item });
  } catch (error) {
    error.publicMessage = "Błąd serwera podczas dodawania ubrania.";
    next(error);
  }
};

const getWardrobe = async (req, res, next) => {
  try {
    const clothes = await prisma.cloth.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ clothes });
  } catch (error) {
    error.publicMessage = "Błąd pobierania szafy.";
    next(error);
  }
};

const deleteCloth = async (req, res, next) => {
  const validation = objectIdSchema.safeParse(req.params.id);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues[0].message,
    });
  }

  try {
    const deleted = await deleteClothWithDependencies({
      clothId: validation.data,
      userId: req.user.userId,
      requestId: req.requestId,
    });

    if (!deleted) {
      return res.status(404).json({
        error: "Nie znaleziono ubrania użytkownika.",
      });
    }

    res.json({
      success: true,
      message: "Ubranie i jego powiązania zostały usunięte.",
    });
  } catch (error) {
    error.publicMessage = "Błąd usuwania ubrania.";
    next(error);
  }
};

const updateCloth = async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);
  const bodyValidation = updateClothSchema.safeParse(req.body);
  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      error:
        idValidation.error?.issues[0].message ||
        bodyValidation.error?.issues[0].message,
    });
  }
  try {
    const cloth = await prisma.cloth.findFirst({
      where: { id: idValidation.data, userId: req.user.userId },
    });
    if (!cloth) return res.status(403).json({ error: "Brak uprawnień" });
    const item = await prisma.cloth.update({
      where: { id: cloth.id },
      data: bodyValidation.data,
    });
    res.json({ success: true, item });
  } catch (error) {
    error.publicMessage = "Błąd aktualizacji ubrania.";
    next(error);
  }
};

module.exports = {
  analyzeClothDraft,
  confirmClothDraft,
  cancelClothDraft,
  addCloth,
  getWardrobe,
  deleteCloth,
  updateCloth,
};