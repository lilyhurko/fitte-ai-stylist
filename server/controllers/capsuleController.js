const { prisma } = require("../config/prisma");
const {
  generateCapsuleWardrobe,
  generateTripCapsuleWardrobe,
} = require("../capsuleEngine");
const {
  getLiveWeatherContext,
  geocodeCity,
  getMultiDayForecast,
} = require("../services/weatherService");
const {
  capsuleQuerySchema,
  tripCapsuleSchema,
} = require("../validators/capsuleValidators");

const getCapsule = async (req, res, next) => {
  const validation = capsuleQuerySchema.safeParse(req.query);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });
  try {
    const userId = req.user.userId;
    const [user, clothes, weatherContext] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
      getLiveWeatherContext(
        validation.data.latitude,
        validation.data.longitude,
      ),
    ]);
    res.json({
      ...generateCapsuleWardrobe(clothes, user, weatherContext),
      weatherContext,
    });
  } catch (error) {
    error.publicMessage = "Błąd generowania szafy kapsułowej.";
    next(error);
  }
};

const getTripCapsule = async (req, res, next) => {
  const validation = tripCapsuleSchema.safeParse(req.body);
  if (!validation.success)
    return res.status(400).json({ error: validation.error.issues[0].message });
  try {
    const userId = req.user.userId;
    const { city, days } = validation.data;
    const location = await geocodeCity(city);
    if (!location)
      return res.status(404).json({
        error: `Nie znaleziono miasta "${city}". Sprawdź pisownię i spróbuj ponownie.`,
      });

    const [user, clothes, dailyForecast] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.cloth.findMany({ where: { userId } }),
      getMultiDayForecast(location.latitude, location.longitude, days),
    ]);
    if (dailyForecast.length === 0)
      return res.status(502).json({
        error: "Nie udało się pobrać prognozy pogody dla tego miasta.",
      });
    const weatherContexts = dailyForecast.map((day) => day.weatherContext);

    const weatherTypes = [
      ...new Set(
        weatherContexts.flatMap((weatherContext) => weatherContext.conditions),
      ),
    ];

    const capsule = generateTripCapsuleWardrobe(
      clothes,
      user,
      weatherContexts,
      days,
    );
    res.json({
      ...capsule,
      city: location.name,
      country: location.country,
      days,
      requestedDays: days,
      dailyForecast,
      weatherTypes,
    });
  } catch (error) {
    error.publicMessage = "Błąd generowania kapsuły podróżnej.";
    next(error);
  }
};

module.exports = { getCapsule, getTripCapsule };
