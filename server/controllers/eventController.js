const { prisma } = require("../config/prisma");
const { generateBestOutfits } = require("../outfitEngine");
const {
  getCalendarWeatherMap,
  createWeatherContext,
  geocodeCity,
} = require("../services/weatherService");
const {
  resolveEventWeatherLocation,
  createLocationKey,
} = require("../services/locationService");
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
    const uniqueLocations = new Map();

    for (const event of events) {
      const location = resolveEventWeatherLocation(event, user);

      if (location) {
        uniqueLocations.set(createLocationKey(location), location);
      }
    }

    const weatherMapsByLocation = new Map();

    await Promise.all(
      [...uniqueLocations.entries()].map(async ([locationKey, location]) => {
        try {
          const weatherMap = await getCalendarWeatherMap(
            location.latitude,
            location.longitude,
          );

          weatherMapsByLocation.set(locationKey, weatherMap);
        } catch (error) {
          writeLog("warn", "calendar_weather_fallback", {
            provider: "open-meteo",
            errorName: error.name,
            locationSource: location.source,
          });

          weatherMapsByLocation.set(locationKey, {});
        }
      }),
    );

    const neutralWeatherContext = createWeatherContext({});

    const eventsWithOutfits = events.map((event) => {
      const date = new Date(event.date).toISOString().split("T")[0];
      const location = resolveEventWeatherLocation(event, user);

      const weatherContext = location
        ? weatherMapsByLocation.get(createLocationKey(location))?.[date]
        : null;

      const appliedWeather = weatherContext || neutralWeatherContext;

      const outfits = generateBestOutfits(
        clothes,
        user,
        event,
        event.occasion,
        appliedWeather,
      );

      return {
        ...event,
        aiProposedOutfit: outfits[0]?.outfit || [],
        weatherContext: weatherContext || null,
        weatherLocation: location,
      };
    });
    res.json({ events: eventsWithOutfits });
  } catch (error) {
    error.publicMessage = "Nie udało się pobrać wydarzeń.";
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  const validation = createEventSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });
  try {
    const {
      title,
      date,
      occasion,
      formality,
      outfitIds,
      locationName,
      latitude,
      longitude,
    } = validation.data;
    let resolvedLocationName = locationName;
    let resolvedLatitude = latitude;
    let resolvedLongitude = longitude;

    if (locationName && (latitude === undefined || longitude === undefined)) {
      const geocodedLocation = await geocodeCity(locationName);

      if (!geocodedLocation) {
        return res.status(400).json({
          error: "Nie znaleziono podanej lokalizacji.",
        });
      }

      resolvedLocationName = [geocodedLocation.name, geocodedLocation.country]
        .filter(Boolean)
        .join(", ");

      resolvedLatitude = geocodedLocation.latitude;
      resolvedLongitude = geocodedLocation.longitude;
    }
    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        occasion,
        formality,
        outfitIds,
        locationName: resolvedLocationName,
        latitude: resolvedLatitude,
        longitude: resolvedLongitude,
        userId: req.user.userId,
      },
    });
    res.json({ success: true, event });
  } catch (error) {
    error.publicMessage = "Nie udało się zapisać wydarzenia.";
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  const validation = objectIdSchema.safeParse(req.params.id);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });
  try {
    const event = await prisma.event.findFirst({
      where: { id: validation.data, userId: req.user.userId },
    });
    if (!event)
      return res
        .status(404)
        .json({ error: "Nie znaleziono wydarzenia użytkownika." });
    await prisma.event.delete({ where: { id: event.id } });
    res.json({ success: true, message: "Wydarzenie usunięte." });
  } catch (error) {
    error.publicMessage = "Nie udało się usunąć wydarzenia.";
    next(error);
  }
};

module.exports = { getEvents, createEvent, deleteEvent };
