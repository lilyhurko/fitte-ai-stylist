const { prisma } = require("../config/prisma");
const { generateBestOutfits } = require("../outfitEngine");
const { getCalendarWeatherMap } = require("../services/weatherService");
const { writeLog } = require("../services/logger");
const { objectIdSchema } = require("../validators/commonValidators");
const { createEventSchema } = require("../validators/eventValidators");

const getEvents = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [events, user, clothes] = await Promise.all([
      prisma.event.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
    ]);
    let weatherMap = {};
    try {
      weatherMap = await getCalendarWeatherMap();
    } catch (error) {
      writeLog("warn", "calendar_weather_fallback", { provider: "open-meteo", errorName: error.name });
    }
    const eventsWithOutfits = events.map((event) => {
      const date = new Date(event.date).toISOString().split("T")[0];
      const outfits = generateBestOutfits(clothes, user, event, event.occasion, weatherMap[date] || "Clear");
      return { ...event, aiProposedOutfit: outfits[0]?.outfit || [] };
    });
    res.json({ events: eventsWithOutfits });
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać wydarzeń.";
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  const validation = createEventSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: validation.error.issues[0].message });
  try {
    const { title, date, occasion, formality, outfitIds } = validation.data;
    const event = await prisma.event.create({
      data: { title, date: new Date(date), occasion, formality, outfitIds, userId: req.user.userId },
    });
    res.json({ success: true, event });
  } catch (error) {
    error.publicMessage = "Nie udało się zapisać wydarzenia.";
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  const validation = objectIdSchema.safeParse(req.params.id);
  if (!validation.success) return res.status(400).json({ error: validation.error.issues[0].message });
  try {
    const event = await prisma.event.findFirst({ where: { id: validation.data, userId: req.user.userId } });
    if (!event) return res.status(404).json({ error: "Nie znaleziono wydarzenia użytkownika." });
    await prisma.event.delete({ where: { id: event.id } });
    res.json({ success: true, message: "Wydarzenie usunięte." });
  } catch (error) {
    error.publicMessage = "Nie udało się usunąć wydarzenia.";
    next(error);
  }
};

module.exports = { getEvents, createEvent, deleteEvent };
