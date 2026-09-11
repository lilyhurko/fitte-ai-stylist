const {
  calculateOutfitScore,
  parseStyles,
  isNonOutfitItem,
  OCCASION_STYLE_MATCH,
} = require("./outfitEngine");

const { scoreItemWeatherFit } = require("./services/weatherScoringService");

const NEUTRAL_COLORS = [
  "czarny",
  "biały",
  "kremowy",
  "beżowy",
  "szary",
  "granatowy",
];

const scoreItemAcrossWeather = (item, weatherTypes) => {
  if (!Array.isArray(weatherTypes) || weatherTypes.length === 0) {
    return 0;
  }

  const totalScore = weatherTypes.reduce(
    (sum, weatherType) => sum + scoreItemWeatherFit(item, weatherType).score,
    0,
  );

  return totalScore / weatherTypes.length;
};

const scoreVersatility = (item, userProfile = {}) => {
  let score = 0;
  const itemStyles = parseStyles(item);

  const occasions = Object.keys(OCCASION_STYLE_MATCH);
  const matchingOccasions = occasions.filter((occasion) =>
    itemStyles.some((style) =>
      OCCASION_STYLE_MATCH[occasion].includes(style),
    ),
  );

  score += matchingOccasions.length * 20;

  if (NEUTRAL_COLORS.includes(item.color?.toLowerCase())) {
    score += 10;
  }

  const styleWeights = userProfile?.styleWeights
    ? typeof userProfile.styleWeights === "string"
      ? JSON.parse(userProfile.styleWeights)
      : userProfile.styleWeights
    : {};

  const colorWeights = userProfile?.colorWeights
    ? typeof userProfile.colorWeights === "string"
      ? JSON.parse(userProfile.colorWeights)
      : userProfile.colorWeights
    : {};

  itemStyles.forEach((style) => {
    if (styleWeights[style]) {
      score += styleWeights[style] * 8;
    }
  });

  if (item.color && colorWeights[item.color]) {
    score += colorWeights[item.color] * 5;
  }

  return score;
};

const scoreComboAcrossWeather = (
  outfit,
  userProfile,
  occasion,
  weatherTypes,
) => {
  const scores = weatherTypes.map(
    (wt) =>
      calculateOutfitScore(outfit, userProfile, null, occasion, wt).totalScore,
  );
  return scores.reduce((a, b) => a + b, 0) / scores.length;
};

function selectMinimalForTarget(goras, dols, sukienki, buty, targetCombos) {
  let nG = goras.length > 0 ? 1 : 0;
  let nD = dols.length > 0 ? 1 : 0;
  let nB = buty.length > 0 ? 1 : 0;
  let nS = sukienki.length > 0 ? 1 : 0;

  const comboCount = () => nG * nD * nB + nS * nB;

  const maxIterations =
    goras.length + dols.length + sukienki.length + buty.length;
  let iterations = 0;

  while (comboCount() < targetCombos && iterations < maxIterations) {
    iterations++;
    const candidates = [];
    if (nG < goras.length) candidates.push({ cat: "g", gain: nD * nB });
    if (nD < dols.length) candidates.push({ cat: "d", gain: nG * nB });
    if (nB < buty.length) candidates.push({ cat: "b", gain: nG * nD + nS });
    if (nS < sukienki.length) candidates.push({ cat: "s", gain: nB });

    if (candidates.length === 0) break;

    candidates.sort((a, b) => b.gain - a.gain);
    const pick = candidates[0];
    if (pick.cat === "g") nG++;
    else if (pick.cat === "d") nD++;
    else if (pick.cat === "b") nB++;
    else nS++;
  }

  return {
    selectedGoras: goras.slice(0, nG),
    selectedDols: dols.slice(0, nD),
    selectedSukienki: sukienki.slice(0, nS),
    selectedButy: buty.slice(0, nB),
  };
}
function buildCapsule(
  wearableClothes,
  userProfile,
  weatherTypes,
  options = {},
) {
  const { targetCombos = null } = options;

  const pool = wearableClothes;
  const byVersatility = (a, b) =>
    scoreVersatility(b, userProfile) +
    scoreItemAcrossWeather(b, weatherTypes) -
    (scoreVersatility(a, userProfile) +
      scoreItemAcrossWeather(a, weatherTypes));

  const goras = pool.filter((c) => c.category === "Góra").sort(byVersatility);
  const dols = pool.filter((c) => c.category === "Dół").sort(byVersatility);
  const sukienki = pool
    .filter((c) => c.category === "Sukienki")
    .sort(byVersatility);
  const buty = pool
    .filter((c) => c.category === "Buty" || c.category === "Obuwie")
    .sort(byVersatility);
  const { selectedGoras, selectedDols, selectedSukienki, selectedButy } =
    targetCombos
      ? selectMinimalForTarget(goras, dols, sukienki, buty, targetCombos)
      : {
          selectedGoras: goras.slice(0, 4),
          selectedDols: dols.slice(0, 3),
          selectedSukienki: sukienki.slice(0, 1),
          selectedButy: buty.slice(0, 2),
        };

  const capsuleItems = [
    ...selectedGoras,
    ...selectedDols,
    ...selectedSukienki,
    ...selectedButy,
  ];

  let rawCombos = [];

  selectedGoras.forEach((g) => {
    selectedDols.forEach((d) => {
      selectedButy.forEach((b) => {
        rawCombos.push([g, d, b]);
      });
    });
  });

  selectedSukienki.forEach((s) => {
    selectedButy.forEach((b) => {
      rawCombos.push([s, b]);
    });
  });

  const occasions = Object.keys(OCCASION_STYLE_MATCH);
  const scoredCombos = rawCombos.map((outfit) => {
    let best = { score: -Infinity, occasion: null };
    occasions.forEach((occ) => {
      const score = scoreComboAcrossWeather(
        outfit,
        userProfile,
        occ,
        weatherTypes,
      );
      if (score > best.score) best = { score, occasion: occ };
    });
    return { outfit, ...best };
  });

  const byOccasion = {};
  scoredCombos.forEach((c) => {
    if (!byOccasion[c.occasion]) byOccasion[c.occasion] = [];
    byOccasion[c.occasion].push(c);
  });
  Object.values(byOccasion).forEach((list) =>
    list.sort((a, b) => b.score - a.score),
  );

  const diversified = [];
  const usedKeys = new Set();

  Object.values(byOccasion).forEach((list) => {
    list.slice(0, 3).forEach((c) => {
      const key = c.outfit.map((i) => i.id).join(",");
      if (!usedKeys.has(key)) {
        diversified.push(c);
        usedKeys.add(key);
      }
    });
  });

  scoredCombos
    .sort((a, b) => b.score - a.score)
    .forEach((c) => {
      if (diversified.length >= 30) return;
      const key = c.outfit.map((i) => i.id).join(",");
      if (!usedKeys.has(key)) {
        diversified.push(c);
        usedKeys.add(key);
      }
    });

  diversified.sort((a, b) => b.score - a.score);

  const finalLimit = targetCombos || 30;

  return {
    capsuleItems,
    totalCombinations: rawCombos.length,
    combinations: diversified.slice(0, finalLimit).map((c) => c.outfit),
  };
}

function generateCapsuleWardrobe(
  clothes,
  userProfile = {},
  weatherType = "Clear",
) {
  if (!clothes) {
    return { capsuleItems: [], totalCombinations: 0, combinations: [] };
  }

  const wearableClothes = clothes.filter((c) => !isNonOutfitItem(c));
  if (wearableClothes.length < 5) {
    return { capsuleItems: [], totalCombinations: 0, combinations: [] };
  }

  return buildCapsule(wearableClothes, userProfile, [weatherType]);
}

function generateTripCapsuleWardrobe(
  clothes,
  userProfile = {},
  weatherTypes = ["Clear"],
  days = 1,
) {
  if (!clothes) {
    return { capsuleItems: [], totalCombinations: 0, combinations: [] };
  }

  const wearableClothes = clothes.filter((c) => !isNonOutfitItem(c));
  if (wearableClothes.length < 5) {
    return { capsuleItems: [], totalCombinations: 0, combinations: [] };
  }

  const safeWeatherTypes = weatherTypes.length > 0 ? weatherTypes : ["Clear"];
  const targetCombos = Math.max(1, parseInt(days, 10) || 1);
  return buildCapsule(wearableClothes, userProfile, safeWeatherTypes, {
    targetCombos,
  });
}

module.exports = { generateCapsuleWardrobe, generateTripCapsuleWardrobe };
