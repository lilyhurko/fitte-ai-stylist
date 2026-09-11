const {
  normalizeColorName,
} = require("./attributeNormalizationService");

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

const scoreItemWeatherFit = (item, weatherType = "Clear") => {
  const reasons = [];
  const materials = new Set(item?.materials || []);
  const seasons = new Set(item?.seasons || []);
  const warmthLevel = item?.warmthLevel;
  const color = normalizeColorName(item?.color);
  let score = 0;

  if (weatherType === "Rain") {
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

  if (weatherType === "Hot") {
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

  if (weatherType === "Cold") {
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

    if (includesKeyword(item, ["sandał", "klapk"])) {
      score += addReason(reasons, "open-shoes-in-cold", -30);
    }
  }

  return { score, reasons };
};

const scoreOutfitWeatherFit = (outfit, weatherType = "Clear") => {
  const itemResults = outfit.map((item) => ({
    itemId: item.id,
    ...scoreItemWeatherFit(item, weatherType),
  }));

  const rawScore = itemResults.reduce(
    (sum, result) => sum + result.score,
    0,
  );

  return {
    score: Math.max(-90, Math.min(45, rawScore)),
    rawScore,
    itemResults,
  };
};

module.exports = {
  scoreItemWeatherFit,
  scoreOutfitWeatherFit,
};