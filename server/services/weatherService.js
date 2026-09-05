const { writeLog } = require("./logger");
const { resilientFetch } = require("./resilienceService");

const classifyDailyWeather = (maxTemp, rainSum) => {
  if (rainSum > 0.2) return "Rain";
  if (maxTemp >= 24) return "Hot";
  if (maxTemp <= 10) return "Cold";
  return "Clear";
};

const getLiveWeather = async (latitude, longitude) => {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m,rain,snow_depth`;

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
    const temperature = data.current.temperature_2m;
    const rain = data.current.rain;
    const snow = data.current.snow_depth;

    if (rain > 0.1 || snow > 0) return "Rain";
    if (temperature >= 24) return "Hot";
    if (temperature <= 10) return "Cold";

    return "Clear";
  } catch (error) {
    writeLog("warn", "weather_fallback", {
      provider: "open-meteo",
      errorName: error.name,
    });

    return "Clear";
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
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&daily=temperature_2m_max,rain_sum` +
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
    const maxTemp = data.daily.temperature_2m_max[index];
    const rainSum = data.daily.rain_sum[index];

    return {
      date,
      maxTemp,
      rainSum,
      weatherType: classifyDailyWeather(maxTemp, rainSum),
    };
  });
};

module.exports = {
  classifyDailyWeather,
  getLiveWeather,
  geocodeCity,
  getMultiDayForecast,
};