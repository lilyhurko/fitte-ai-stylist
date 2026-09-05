const { prisma } = require("../config/prisma");
const { objectIdSchema } = require("../validators/commonValidators");
const { updateClothSchema } = require("../validators/wardrobeValidators");
const { writeLog } = require("../services/logger");
const { processAndUploadImage, deleteImage } = require("../services/wardrobeService");

const addCloth = async (req, res, next) => {
  try {
    if (!req.file) {
      writeLog("warn", "upload_without_file", { requestId: req.requestId });
      return res.status(400).json({ error: "Brak pliku obrazu." });
    }
    const { analysis, uploadedImage } = await processAndUploadImage(req.file, req.requestId);
    const item = await prisma.cloth.create({
      data: {
        name: analysis.name || "Eleganckie ubranie",
        category: analysis.category || "Góra",
        style: analysis.style || "Minimalizm",
        color: analysis.color || "kremowy",
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
  if (!validation.success) return res.status(400).json({ error: validation.error.issues[0].message });
  try {
    const cloth = await prisma.cloth.findFirst({ where: { id: validation.data, userId: req.user.userId } });
    if (!cloth) return res.status(403).json({ error: "Brak uprawnień" });
    await deleteImage(cloth.cloudinaryPublicId);
    await prisma.cloth.delete({ where: { id: cloth.id } });
    res.json({ success: true, message: "Ubranie usunięte." });
  } catch (error) {
    error.publicMessage = "Błąd usuwania ubrania.";
    next(error);
  }
};

const updateCloth = async (req, res, next) => {
  const idValidation = objectIdSchema.safeParse(req.params.id);
  const bodyValidation = updateClothSchema.safeParse(req.body);
  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({ error: idValidation.error?.issues[0].message || bodyValidation.error?.issues[0].message });
  }
  try {
    const cloth = await prisma.cloth.findFirst({ where: { id: idValidation.data, userId: req.user.userId } });
    if (!cloth) return res.status(403).json({ error: "Brak uprawnień" });
    const item = await prisma.cloth.update({ where: { id: cloth.id }, data: bodyValidation.data });
    res.json({ success: true, item });
  } catch (error) {
    error.publicMessage = "Błąd aktualizacji ubrania.";
    next(error);
  }
};

module.exports = { addCloth, getWardrobe, deleteCloth, updateCloth };
