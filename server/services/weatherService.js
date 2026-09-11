const { writeLog } = require("./logger");
const { resilientFetch } = require("./resilienceService");

const toNumberOrDefault = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const createWeatherContext = ({
  temperatureC,
  apparentTemperatureC,
  precipitationMm,
  rainMm,
  snowfallCm,
  windSpeedKmh,
  temperatureMinC,
  temperatureMaxC,
  apparentTemperatureMinC,
  apparentTemperatureMaxC,
}) => {
  const normalizedTemperature = toNumberOrDefault(temperatureC, null);
  const normalizedApparentTemperature = toNumberOrDefault(
    apparentTemperatureC,
    normalizedTemperature,
  );
  const normalizedTemperatureMin = toNumberOrDefault(temperatureMinC, null);
  const normalizedTemperatureMax = toNumberOrDefault(temperatureMaxC, null);
  const normalizedApparentTemperatureMin = toNumberOrDefault(
    apparentTemperatureMinC,
    null,
  );
  const normalizedApparentTemperatureMax = toNumberOrDefault(
    apparentTemperatureMaxC,
    null,
  );

  const hotTemperatures = [
    normalizedTemperature,
    normalizedApparentTemperature,
    normalizedTemperatureMax,
    normalizedApparentTemperatureMax,
  ].filter(Number.isFinite);

  const coldTemperatures = [
    normalizedTemperature,
    normalizedApparentTemperature,
    normalizedTemperatureMin,
    normalizedApparentTemperatureMin,
  ].filter(Number.isFinite);
  const normalizedPrecipitation = toNumberOrDefault(precipitationMm);
  const normalizedRain = toNumberOrDefault(rainMm);
  const normalizedSnowfall = toNumberOrDefault(snowfallCm);
  const normalizedWindSpeed = toNumberOrDefault(windSpeedKmh);

  const conditions = [];

  if (normalizedSnowfall > 0) {
    conditions.push("Snow");
  } else if (normalizedRain > 0.1 || normalizedPrecipitation > 0.1) {
    conditions.push("Rain");
  }

  if (hotTemperatures.some((value) => value >= 24)) {
    conditions.push("Hot");
  }

  if (coldTemperatures.some((value) => value <= 10)) {
    conditions.push("Cold");
  }

  if (normalizedWindSpeed >= 30) {
    conditions.push("Windy");
  }

  if (conditions.length === 0) {
    conditions.push("Clear");
  }

  return {
    conditions,
    temperatureC: normalizedTemperature,
    apparentTemperatureC: normalizedApparentTemperature,
    temperatureMinC: normalizedTemperatureMin,
    temperatureMaxC: normalizedTemperatureMax,
    apparentTemperatureMinC: normalizedApparentTemperatureMin,
    apparentTemperatureMaxC: normalizedApparentTemperatureMax,
    precipitationMm: normalizedPrecipitation,
    rainMm: normalizedRain,
    snowfallCm: normalizedSnowfall,
    windSpeedKmh: normalizedWindSpeed,
  };
};

const getLiveWeatherContext = async (latitude, longitude) => {
  try {
    const currentVariables = [
      "temperature_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "snowfall",
      "wind_speed_10m",
    ].join(",");

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=${currentVariables}` +
      `&timezone=auto`;

    const response = await resilientFetch(
      "open-meteo",
      url,
      {},
      {
        timeoutMs: 5000,
        retries: 2,
      },
    );

    if (!response.ok) {
      throw new Error("Błąd pobierania pogody");
    }

    const data = await response.json();
    const current = data.current;

    if (!current) {
      throw new Error("Brak aktualnych danych pogodowych");
    }

    return createWeatherContext({
      temperatureC: current.temperature_2m,
      apparentTemperatureC: current.apparent_temperature,
      precipitationMm: current.precipitation,
      rainMm: current.rain,
      snowfallCm: current.snowfall,
      windSpeedKmh: current.wind_speed_10m,
    });
  } catch (error) {
    writeLog("warn", "weather_fallback", {
      provider: "open-meteo",
      errorName: error.name,
    });

    return createWeatherContext({});
  }
};

const geocodeCity = async (cityName) => {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(cityName)}` +
    `&count=1&language=pl&format=json`;

  const response = await resilientFetch(
    "open-meteo",
    url,
    {},
    {
      timeoutMs: 5000,
      retries: 2,
    },
  );

  if (!response.ok) {
    throw new Error("Błąd geokodowania miasta");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const best = data.results[0];

  return {
    name: best.name,
    country: best.country,
    latitude: best.latitude,
    longitude: best.longitude,
  };
};

const getMultiDayForecast = async (latitude, longitude, days) => {
  const dailyVariables = [
    "temperature_2m_min",
    "temperature_2m_max",
    "temperature_2m_mean",
    "apparent_temperature_min",
    "apparent_temperature_max",
    "apparent_temperature_mean",
    "precipitation_sum",
    "rain_sum",
    "snowfall_sum",
    "wind_speed_10m_max",
  ].join(",");

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&daily=${dailyVariables}` +
    `&forecast_days=${days}` +
    `&timezone=auto`;

  const response = await resilientFetch(
    "open-meteo",
    url,
    {},
    {
      timeoutMs: 5000,
      retries: 2,
    },
  );

  if (!response.ok) {
    throw new Error("Błąd pobierania prognozy wielodniowej");
  }

  const data = await response.json();

  if (!data.daily?.time) {
    return [];
  }

  return data.daily.time.map((date, index) => {
    const weatherContext = createWeatherContext({
      temperatureC: data.daily.temperature_2m_mean?.[index],
      apparentTemperatureC: data.daily.apparent_temperature_mean?.[index],
      temperatureMinC: data.daily.temperature_2m_min?.[index],
      temperatureMaxC: data.daily.temperature_2m_max?.[index],
      apparentTemperatureMinC: data.daily.apparent_temperature_min?.[index],
      apparentTemperatureMaxC: data.daily.apparent_temperature_max?.[index],
      precipitationMm: data.daily.precipitation_sum?.[index],
      rainMm: data.daily.rain_sum?.[index],
      snowfallCm: data.daily.snowfall_sum?.[index],
      windSpeedKmh: data.daily.wind_speed_10m_max?.[index],
    });

    return {
      date,
      weatherContext,
      weatherType: weatherContext.conditions[0] || "Clear",
    };
  });
};

const getCalendarWeatherMap = async (
  latitude = 51.2465,
  longitude = 22.5684,
) => {
  const dailyForecast = await getMultiDayForecast(latitude, longitude, 7);

  return Object.fromEntries(
    dailyForecast.map((day) => [day.date, day.weatherContext]),
  );
};

module.exports = {
  getLiveWeatherContext,
  getMultiDayForecast,
  getCalendarWeatherMap,
  createWeatherContext,
  geocodeCity,
};
