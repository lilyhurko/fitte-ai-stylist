const { normalizeColorName } = require("./attributeNormalizationService");

const DARK_COLORS = new Set([
  "czarny",
  "ciemnobrązowy",
  "granatowy",
  "bordowy",
]);

const includesKeyword = (item, keywords) => {
  const name = item?.name?.toLowerCase() || "";
  return keywords.some((keyword) => name.includes(keyword));
};

const addReason = (reasons, code, value) => {
  reasons.push({ code, value });
  return value;
};

const normalizeWeatherInput = (weatherInput) => {
  if (typeof weatherInput === "string") {
    return {
      conditions: [weatherInput],
      temperatureC: null,
      apparentTemperatureC: null,
      temperatureMinC: null,
      temperatureMaxC: null,
      apparentTemperatureMinC: null,
      apparentTemperatureMaxC: null,
      precipitationMm: 0,
      rainMm: 0,
      snowfallCm: 0,
      windSpeedKmh: 0,
    };
  }

  if (weatherInput && typeof weatherInput === "object") {
    return {
      conditions:
        Array.isArray(weatherInput.conditions) &&
        weatherInput.conditions.length > 0
          ? weatherInput.conditions
          : ["Clear"],
      temperatureC: weatherInput.temperatureC ?? null,
      apparentTemperatureC: weatherInput.apparentTemperatureC ?? null,
      temperatureMinC: weatherInput.temperatureMinC ?? null,
      temperatureMaxC: weatherInput.temperatureMaxC ?? null,
      apparentTemperatureMinC:
        weatherInput.apparentTemperatureMinC ?? null,
      apparentTemperatureMaxC:
        weatherInput.apparentTemperatureMaxC ?? null,
      precipitationMm: weatherInput.precipitationMm ?? 0,
      rainMm: weatherInput.rainMm ?? 0,
      snowfallCm: weatherInput.snowfallCm ?? 0,
      windSpeedKmh: weatherInput.windSpeedKmh ?? 0,
    };
  }

  return {
    conditions: ["Clear"],
    temperatureC: null,
    apparentTemperatureC: null,
    temperatureMinC: null,
    temperatureMaxC: null,
    apparentTemperatureMinC: null,
    apparentTemperatureMaxC: null,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 0,
  };
};

const scoreItemWeatherFit = (item, weatherInput = "Clear") => {
  const weatherContext = normalizeWeatherInput(weatherInput);
  const { conditions } = weatherContext;
  const reasons = [];
  const materials = new Set(item?.materials || []);
  const seasons = new Set(item?.seasons || []);
  const warmthLevel = item?.warmthLevel;
  const color = normalizeColorName(item?.color);
  let score = 0;

  if (conditions.includes("Rain") && !conditions.includes("Snow")) {
    if (item?.waterResistance === "WATERPROOF") {
      score += addReason(reasons, "waterproof", 18);
    } else if (item?.waterResistance === "WATER_REPELLENT") {
      score += addReason(reasons, "water-repellent", 8);
    } else if (item?.waterResistance === "NONE") {
      score += addReason(reasons, "no-water-resistance", -10);
    }

    if (materials.has("SUEDE")) {
      score += addReason(reasons, "suede-in-rain", -20);
    }

    if (includesKeyword(item, ["sandał", "klapk"])) {
      score += addReason(reasons, "open-shoes-in-rain", -30);
    }
  }
  if (conditions.includes("Snow")) {
    if (item?.waterResistance === "WATERPROOF") {
      score += addReason(reasons, "waterproof-in-snow", 15);
    } else if (item?.waterResistance === "WATER_REPELLENT") {
      score += addReason(reasons, "water-repellent-in-snow", 7);
    } else if (item?.waterResistance === "NONE") {
      score += addReason(reasons, "no-water-resistance-in-snow", -15);
    }

    if (materials.has("SUEDE")) {
      score += addReason(reasons, "suede-in-snow", -15);
    }

    if (includesKeyword(item, ["sandał", "klapk"])) {
      score += addReason(reasons, "open-shoes-in-snow", -35);
    }
  }

  if (conditions.includes("Hot")) {
    const warmthScores = {
      1: 10,
      2: 5,
      3: -10,
      4: -28,
      5: -40,
    };

    if (warmthLevel && warmthScores[warmthLevel] !== undefined) {
      score += addReason(
        reasons,
        `warmth-${warmthLevel}-in-hot-weather`,
        warmthScores[warmthLevel],
      );
    }

    if (seasons.has("SUMMER")) {
      score += addReason(reasons, "summer-season-in-heat", 10);
    }

    if (seasons.has("WINTER")) {
      score += addReason(reasons, "winter-season-in-heat", -22);
    }

    if (materials.has("LINEN")) {
      score += addReason(reasons, "linen-in-heat", 12);
    }

    if (materials.has("COTTON")) {
      score += addReason(reasons, "cotton-in-heat", 6);
    }

    if (materials.has("WOOL") || materials.has("CASHMERE")) {
      score += addReason(reasons, "warm-material-in-heat", -20);
    }

    if (materials.has("LEATHER") || materials.has("FAUX_LEATHER")) {
      score += addReason(reasons, "leather-in-heat", -12);
    }

    if (DARK_COLORS.has(color)) {
      score += addReason(reasons, "dark-color-in-heat", -6);
    }
  }

  if (conditions.includes("Cold")) {
    const warmthScores = {
      1: -35,
      2: -20,
      3: -5,
      4: 8,
      5: 12,
    };

    if (warmthLevel && warmthScores[warmthLevel] !== undefined) {
      score += addReason(
        reasons,
        `warmth-${warmthLevel}-in-cold-weather`,
        warmthScores[warmthLevel],
      );
    }

    if (seasons.has("SUMMER")) {
      score += addReason(reasons, "summer-season-in-cold", -18);
    }

    if (seasons.has("WINTER")) {
      score += addReason(reasons, "winter-season-in-cold", 10);
    }

    if (materials.has("WOOL") || materials.has("CASHMERE")) {
      score += addReason(reasons, "warm-material-in-cold", 10);
    }

    if (
      !conditions.includes("Snow") &&
      includesKeyword(item, ["sandał", "klapk"])
    ) {
      score += addReason(reasons, "open-shoes-in-cold", -30);
    }
  }
  if (conditions.includes("Windy")) {
    if (warmthLevel === 1) {
      score += addReason(reasons, "very-light-item-in-wind", -12);
    }

    if (warmthLevel >= 4) {
      score += addReason(reasons, "warm-item-in-wind", 5);
    }

    if (item?.category === "Okrycia wierzchnie") {
      score += addReason(reasons, "outerwear-in-wind", 6);
    }
  }

  const observedTemperatures = [
    weatherContext.temperatureC,
    weatherContext.apparentTemperatureC,
    weatherContext.temperatureMinC,
    weatherContext.temperatureMaxC,
    weatherContext.apparentTemperatureMinC,
    weatherContext.apparentTemperatureMaxC,
  ].filter((value) => Number.isFinite(value));

  if (conditions.includes("Hot") && observedTemperatures.length > 0) {
    const highestTemperature = Math.max(...observedTemperatures);

    if (highestTemperature >= 30 && warmthLevel >= 3) {
      const penalty = -Math.min(16, Math.round((highestTemperature - 29) * 2));

      score += addReason(reasons, "high-heat-intensity", penalty);
    }
  }

  if (conditions.includes("Cold") && observedTemperatures.length > 0) {
    const lowestTemperature = Math.min(...observedTemperatures);

    if (lowestTemperature <= 0 && warmthLevel <= 2) {
      score += addReason(reasons, "freezing-temperature-light-item", -15);
    }

    if (lowestTemperature <= 0 && warmthLevel >= 4) {
      score += addReason(reasons, "freezing-temperature-warm-item", 5);
    }
  }

  if (conditions.includes("Rain") && weatherContext.precipitationMm >= 5) {
    if (item?.waterResistance === "NONE") {
      score += addReason(reasons, "heavy-rain-no-protection", -10);
    }

    if (item?.waterResistance === "WATERPROOF") {
      score += addReason(reasons, "heavy-rain-waterproof", 5);
    }
  }

  if (
    conditions.includes("Windy") &&
    weatherContext.windSpeedKmh >= 50 &&
    warmthLevel <= 2
  ) {
    score += addReason(reasons, "strong-wind-light-item", -8);
  }
  return { score, reasons };
};

const scoreOutfitWeatherFit = (outfit, weatherInput = "Clear") => {
  const itemResults = outfit.map((item) => ({
    itemId: item.id,
    ...scoreItemWeatherFit(item, weatherInput),
  }));

  const rawScore = itemResults.reduce((sum, result) => sum + result.score, 0);

  return {
    score: Math.max(-90, Math.min(45, rawScore)),
    rawScore,
    itemResults,
  };
};

module.exports = {
  scoreItemWeatherFit,
  scoreOutfitWeatherFit,
  normalizeWeatherInput,
};
