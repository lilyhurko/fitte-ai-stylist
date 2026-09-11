const {
  RECENT_RECOMMENDATION_LIMIT,
  REPETITION_PENALTIES,
  QUALITY_POOL_MAX_SCORE_GAP,
  PREFERENCE_WEIGHT_CONFIG,
} = require("./config/algorithm");

const {
  normalizeStyleNames,
  normalizeColorName,
} = require("./services/attributeNormalizationService");
const {
  scoreOutfitWeatherFit,
} = require("./services/weatherScoringService");
const {
  clampPreferenceWeight,
} = require("./services/preferenceLearningService");

const OCCASION_STYLE_MATCH = {
  Randka: ["Chic", "Romantic"],
  Praca: ["Classic", "Minimalizm"],
  Casual: ["Casual", "Streetwear", "Boho"],
  Impreza: ["Modern", "Streetwear", "Chic"],
  Sport: ["Sport", "Streetwear"],
  Podróż: ["Casual", "Streetwear"],
};

const OCCASION_KEYWORDS = {
  Randka: ["sukien", "elegan", "satyn", "koronk", "obcas"],
  Praca: ["marynark", "koszul", "garnitur", "biznes", "klasyczn"],
  Casual: ["jeans", "t-shirt", "sneakers", "bluz", "codzien"],
  Impreza: ["cekin", "błyszcz", "satyn", "wieczorow", "glamour"],
  Sport: ["sportow", "dresow", "legginsy", "termoaktyw", "sneakers"],
  Podróż: ["wygodn", "sportow", "praktyczn", "casual"],
};

const WEATHER_BLACKLIST = {
  Rain: {
    categories: ["Sukienki", "Sandały"],
    colors: [],
    forbiddenKeywords: ["sandał", "klapk", "siatkow"],
  },
  Hot: {
    categories: [],
    styles: ["Classic"],
    colors: ["czarny", "ciemnobrązowy", "granatowy"],
    forbiddenKeywords: [
      "bufiast",
      "grub",
      "wełn",
      "skórz",
      "kozak",
      "śniegowc",
      "marynark",
      "żakiet",
      "garnitur",
    ],
  },
  Cold: {
    categories: ["Sukienki", "Sandały"],
    styles: ["Boho"],
    colors: [],
    forbiddenKeywords: [
      "cienki",
      "krótki",
      "jedwab",
      "sandał",
      "klapk",
      "letni",
    ],
  },
};

const COLOR_HARMONIES = {
  czarny: ["biały", "kremowy", "beżowy", "szary", "pastelowy róż"],
  granatowy: ["biały", "beżowy", "kremowy", "ecru", "czerwony"],
  biały: ["czarny", "granatowy", "ciemnobrązowy", "beżowy", "zielono-biały"],
  kremowy: ["ciemnobrązowy", "czarny", "granatowy", "beżowy", "ecru"],
  beżowy: ["ciemnobrązowy", "biały", "kremowy", "ecru"],
  ciemnobrązowy: ["kremowy", "beżowy", "pastelowy róż", "ecru"],
};

function parseStyles(item) {
  return normalizeStyleNames(item?.style);
}

function nameMatchesForbiddenKeyword(name, keyword) {
  if (keyword === "wełn") {
    return /(?<!ba)wełn/i.test(name);
  }
  return name.includes(keyword);
}

function createOutfitKey(ids) {
  return ids.filter(Boolean).map(String).sort().join(":");
}

function calculateRepetitionPenalty(outfit, recommendationHistory = []) {
  const currentIds = outfit
    .map((item) => item.id)
    .filter(Boolean)
    .map(String);

  if (currentIds.length === 0 || !Array.isArray(recommendationHistory)) {
    return 0;
  }

  const currentKey = createOutfitKey(currentIds);
  let penalty = 0;

  recommendationHistory
    .slice(0, RECENT_RECOMMENDATION_LIMIT)
    .forEach((recommendation, index) => {
      const previousIds = Array.isArray(recommendation.clothIds)
        ? recommendation.clothIds.map(String)
        : [];

      const previousIdsSet = new Set(previousIds);

      const reusedItemsCount = currentIds.filter((id) =>
        previousIdsSet.has(id),
      ).length;

      const itemPenalty = REPETITION_PENALTIES.reusedItemByRecency[index] || 0;

      penalty -= reusedItemsCount * itemPenalty;

      const previousKey = createOutfitKey(previousIds);

      if (previousKey && previousKey === currentKey) {
        penalty -= REPETITION_PENALTIES.identicalOutfit;
      }
    });

  return penalty;
}
const SCORE_COMPONENT_KEYS = [
  "baseScore",
  "weatherScore",
  "occasionScore",
  "colorScore",
  "preferenceScore",
  "formalityScore",
  "repetitionPenalty",
];

function roundScore(value) {
  return Number(value.toFixed(2));
}
function calculateOutfitScore(
  outfit,
  userProfile,
  eventContext,
  selectedOccasion,
  weatherType = "Clear",
  recommendationHistory = [],
) {
  const userStyleWeights = userProfile?.styleWeights
    ? typeof userProfile.styleWeights === "string"
      ? JSON.parse(userProfile.styleWeights)
      : userProfile.styleWeights
    : {};

  const userColorWeights = userProfile?.colorWeights
    ? typeof userProfile.colorWeights === "string"
      ? JSON.parse(userProfile.colorWeights)
      : userProfile.colorWeights
    : {};

  const activeOccasion = eventContext?.occasion || selectedOccasion;

  const details = {
    baseScore: 100,
    weatherScore: 0,
    weatherReasons: [],
    occasionScore: 0,
    colorScore: 0,
    preferenceScore: 0,
    formalityScore: 0,
    repetitionPenalty: 0,
    totalScore: 100,
    appliedOccasion: activeOccasion,
    appliedWeather: weatherType,
    hardVeto: false,
    vetoReasons: [],
    styleWeights: userStyleWeights,
    colorWeights: userColorWeights,
  };

const weatherResult = scoreOutfitWeatherFit(outfit, weatherType);

details.weatherScore = weatherResult.score;
details.weatherReasons = weatherResult.itemResults.flatMap(
  ({ itemId, reasons }) =>
    reasons.map((reason) => ({
      itemId,
      ...reason,
    })),
);

  let matchingStylesCount = 0;

  if (activeOccasion && OCCASION_STYLE_MATCH[activeOccasion]) {
    const allowedStyles = OCCASION_STYLE_MATCH[activeOccasion];

    const occasionKeywords = OCCASION_KEYWORDS[activeOccasion] || [];

    outfit.forEach((item) => {
      const name = item.name?.toLowerCase() || "";
      const itemStyles = parseStyles(item);

      const styleMatches = itemStyles.some((style) =>
        allowedStyles.includes(style),
      );

      if (styleMatches) {
        details.occasionScore += 40;
        matchingStylesCount += 1;
      } else {
        details.occasionScore -= 25;
      }

      if (occasionKeywords.some((keyword) => name.includes(keyword))) {
        details.occasionScore += 10;
      }
    });

    if (matchingStylesCount === 0) {
      details.occasionScore -= 70;
    }
  }

  if (outfit.length > 1) {
    const firstColor = normalizeColorName(outfit[0].color);
    const secondColor = normalizeColorName(outfit[1].color);

    if (firstColor && secondColor) {
      const firstHarmony = COLOR_HARMONIES[firstColor]?.includes(secondColor);

      const secondHarmony = COLOR_HARMONIES[secondColor]?.includes(firstColor);

      if (firstHarmony || secondHarmony || firstColor === secondColor) {
        details.colorScore += 25;
      }
    }

    if (outfit.length === 3) {
      const shoesColor = normalizeColorName(outfit[2].color);
      if (shoesColor === firstColor || shoesColor === secondColor) {
        details.colorScore += 15;
      }
    }
  }

  outfit.forEach((item) => {
    parseStyles(item).forEach((style) => {
      const styleWeight = clampPreferenceWeight(
        userStyleWeights[style] ?? PREFERENCE_WEIGHT_CONFIG.neutral,
      );

      details.preferenceScore +=
        (styleWeight - PREFERENCE_WEIGHT_CONFIG.neutral) * 12;
    });

    const normalizedColor = normalizeColorName(item.color);

    if (normalizedColor) {
      const colorWeight = clampPreferenceWeight(
        userColorWeights[normalizedColor] ??
          PREFERENCE_WEIGHT_CONFIG.neutral,
      );

      details.preferenceScore +=
        (colorWeight - PREFERENCE_WEIGHT_CONFIG.neutral) * 8;
    }
  });

  if (eventContext) {
    const formalityTarget = eventContext.formality;

    outfit.forEach((item) => {
      const itemStyles = parseStyles(item);

      if (
        formalityTarget === "Formal" &&
        (itemStyles.includes("Minimalizm") || itemStyles.includes("Classic"))
      ) {
        details.formalityScore += 20;
      }

      if (formalityTarget === "Formal" && itemStyles.includes("Streetwear")) {
        details.formalityScore -= 40;
      }
    });
  }
  details.repetitionPenalty = calculateRepetitionPenalty(
    outfit,
    recommendationHistory,
  );
  SCORE_COMPONENT_KEYS.forEach((key) => {
    details[key] = roundScore(details[key]);
  });

  const totalScore = roundScore(
    SCORE_COMPONENT_KEYS.reduce((sum, key) => sum + details[key], 0),
  );

  details.totalScore = totalScore;

  return {
    totalScore,
    details,
  };
}

const NON_OUTFIT_KEYWORDS = [
  "strój kąpielowy",
  "stroj kapielowy",
  "kostium kąpielowy",
  "kostium kapielowy",
  "kąpielówki",
  "kapielowki",
  "bikini",
  "biustonosz",
  "stanik",
  "majtki",
  "figi",
  "bielizna",
  "piżama",
  "pizama",
  "szlafrok",
  "bokserki",
];

function isNonOutfitItem(item) {
  if (!item) return false;
  const category = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();

  if (category === "bielizna") return true;

  return NON_OUTFIT_KEYWORDS.some((kw) => name.includes(kw));
}
function createQualityPool(
  combinations,
  maxScoreGap = QUALITY_POOL_MAX_SCORE_GAP,
) {
  if (!Array.isArray(combinations) || combinations.length === 0) {
    return [];
  }

  const sortedCombinations = [...combinations].sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  const bestScore = sortedCombinations[0].totalScore;

  return sortedCombinations.filter(
    (candidate) => candidate.totalScore >= bestScore - maxScoreGap,
  );
}
function excludeRecentOutfitsWhenAlternativeExists(
  qualityPool,
  recommendationHistory = [],
) {
  if (!Array.isArray(qualityPool) || qualityPool.length <= 1) {
    return qualityPool;
  }

  const recentOutfitKeys = new Set(
    recommendationHistory
      .slice(0, RECENT_RECOMMENDATION_LIMIT)
      .map((recommendation) => createOutfitKey(recommendation.clothIds || []))
      .filter(Boolean),
  );

  if (recentOutfitKeys.size === 0) {
    return qualityPool;
  }

  const freshAlternatives = qualityPool.filter((candidate) => {
    const candidateKey = createOutfitKey(
      candidate.outfit.map((item) => item.id),
    );

    return !recentOutfitKeys.has(candidateKey);
  });

  return freshAlternatives.length > 0 ? freshAlternatives : qualityPool;
}
function generateBestOutfits(
  clothes,
  userProfile,
  eventContext,
  selectedOccasion,
  weatherType = "Clear",
  recommendationHistory = [],
) {
  const wearableClothes = (clothes || []).filter((c) => !isNonOutfitItem(c));

  const goras = wearableClothes.filter((c) => c.category === "Góra");
  const dols = wearableClothes.filter((c) => c.category === "Dół");
  const sukienki = wearableClothes.filter((c) => c.category === "Sukienki");
  const buty = wearableClothes.filter(
    (c) => c.category === "Buty" || c.category === "Obuwie",
  );

  let combinations = [];

  if (buty.length === 0) {
    goras.forEach((g) => {
      dols.forEach((d) => {
        const outfit = [g, d];
        const scoring = calculateOutfitScore(
          outfit,
          userProfile,
          eventContext,
          selectedOccasion,
          weatherType,
          recommendationHistory,
        );
        combinations.push({ outfit, ...scoring });
      });
    });

    sukienki.forEach((s) => {
      const outfit = [s];
      const scoring = calculateOutfitScore(
        outfit,
        userProfile,
        eventContext,
        selectedOccasion,
        weatherType,
        recommendationHistory,
      );
      combinations.push({ outfit, ...scoring });
    });
  } else {
    goras.forEach((g) => {
      dols.forEach((d) => {
        buty.forEach((b) => {
          const outfit = [g, d, b];
          const scoring = calculateOutfitScore(
            outfit,
            userProfile,
            eventContext,
            selectedOccasion,
            weatherType,
            recommendationHistory,
          );
          combinations.push({ outfit, ...scoring });
        });
      });
    });

    sukienki.forEach((s) => {
      buty.forEach((b) => {
        const outfit = [s, b];
        const scoring = calculateOutfitScore(
          outfit,
          userProfile,
          eventContext,
          selectedOccasion,
          weatherType,
          recommendationHistory,
        );
        combinations.push({ outfit, ...scoring });
      });
    });
  }

  const qualityPool = createQualityPool(combinations);

  const selectablePool = excludeRecentOutfitsWhenAlternativeExists(
    qualityPool,
    recommendationHistory,
  );

  return selectablePool.slice(0, 3);
}

const WEATHER_FRIENDLY_KEYWORDS = {
  Hot: [
    "lnian",
    "bawełnian",
    "przewiewn",
    "letni",
    "krótk",
    "sandał",
    "bez rękaw",
    "koszulk",
  ],
  Cold: [
    "wełn",
    "ciepł",
    "grub",
    "dzianin",
    "swetr",
    "kurtk",
    "płaszcz",
    "polar",
    "kożuch",
  ],
  Rain: ["nieprzemakaln", "wodoodporn", "goretex", "płaszcz"],
  Clear: [],
};

const WEATHER_COLOR_BONUS = {
  Hot: ["biały", "kremowy", "beżowy", "żółty", "różowy", "błękitny"],
  Cold: ["czarny", "ciemnobrązowy", "granatowy", "bordowy", "szary"],
  Rain: [],
  Clear: [],
};

function scoreWeatherFit(item, weatherTypes) {
  if (!weatherTypes || weatherTypes.length === 0) return 0;

  const name = item.name ? item.name.toLowerCase() : "";
  const color = normalizeColorName(item.color);
  let score = 0;

  weatherTypes.forEach((wt) => {
    const keywords = WEATHER_FRIENDLY_KEYWORDS[wt] || [];
    if (keywords.some((k) => name.includes(k))) score += 15;

    const bonusColors = WEATHER_COLOR_BONUS[wt] || [];
    if (bonusColors.includes(color)) score += 8;
  });

  return score / weatherTypes.length;
}

module.exports = {
  generateBestOutfits,
  calculateOutfitScore,
  parseStyles,
  isNonOutfitItem,
  NON_OUTFIT_KEYWORDS,
  scoreWeatherFit,
  nameMatchesForbiddenKeyword,
  OCCASION_STYLE_MATCH,
  OCCASION_KEYWORDS,
  WEATHER_BLACKLIST,
  COLOR_HARMONIES,
  createOutfitKey,
  calculateRepetitionPenalty,
  roundScore,
  createQualityPool,
  excludeRecentOutfitsWhenAlternativeExists,
};
