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
const CAPSULE_OVERLAP_PENALTY_WEIGHT = 30;
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
    itemStyles.some((style) => OCCASION_STYLE_MATCH[occasion].includes(style)),
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

  const hasShoes = buty.length > 0;

  const comboCount = () => (hasShoes ? nG * nD * nB + nS * nB : nG * nD + nS);
  nS * nB;

  const maxIterations =
    goras.length + dols.length + sukienki.length + buty.length;
  let iterations = 0;

  while (comboCount() < targetCombos && iterations < maxIterations) {
    iterations++;
    const candidates = [];
    const shoeMultiplier = hasShoes ? nB : 1;

    if (nG < goras.length) {
      candidates.push({ cat: "g", gain: nD * shoeMultiplier });
    }

    if (nD < dols.length) {
      candidates.push({ cat: "d", gain: nG * shoeMultiplier });
    }

    if (nB < buty.length) {
      candidates.push({ cat: "b", gain: nG * nD + nS });
    }

    if (nS < sukienki.length) {
      candidates.push({ cat: "s", gain: shoeMultiplier });
    }

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
function calculateJaccardSimilarity(firstOutfit, secondOutfit) {
  const firstIds = new Set(firstOutfit.map((item) => item.id));
  const secondIds = new Set(secondOutfit.map((item) => item.id));

  const intersectionSize = [...firstIds].filter((id) =>
    secondIds.has(id),
  ).length;

  const unionSize = new Set([...firstIds, ...secondIds]).size;

  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

function calculateOverlapPenalty(candidate, selectedCandidates) {
  if (selectedCandidates.length === 0) {
    return 0;
  }

  const maximumSimilarity = Math.max(
    ...selectedCandidates.map((selected) =>
      calculateJaccardSimilarity(candidate.outfit, selected.outfit),
    ),
  );

  return maximumSimilarity * CAPSULE_OVERLAP_PENALTY_WEIGHT;
}

function selectOccasionDiverseCombos(scoredCombos, limit) {
  if (!Array.isArray(scoredCombos) || limit <= 0) {
    return [];
  }

  const groups = new Map();

  scoredCombos.forEach((candidate) => {
    const occasion = candidate.occasion || "Inne";

    if (!groups.has(occasion)) {
      groups.set(occasion, []);
    }

    groups.get(occasion).push(candidate);
  });

  const orderedGroups = [...groups.values()].sort((a, b) => {
    const bestScoreA = Math.max(...a.map((candidate) => candidate.score));
    const bestScoreB = Math.max(...b.map((candidate) => candidate.score));

    return bestScoreB - bestScoreA;
  });

  const selected = [];
  const usedKeys = new Set();

  while (selected.length < limit) {
    let addedInRound = false;

    for (const group of orderedGroups) {
      const availableCandidates = group
        .filter((candidate) => {
          const key = candidate.outfit
            .map((item) => item.id)
            .sort()
            .join(",");

          return !usedKeys.has(key);
        })
        .map((candidate) => {
          const overlapPenalty = calculateOverlapPenalty(candidate, selected);

          return {
            candidate,
            overlapPenalty,
            adjustedScore: candidate.score - overlapPenalty,
          };
        })
        .sort((a, b) => b.adjustedScore - a.adjustedScore);

      const selectedEntry = availableCandidates[0];

      if (!selectedEntry) {
        continue;
      }

      const selectedCandidate = {
        ...selectedEntry.candidate,
        overlapPenalty: selectedEntry.overlapPenalty,
        adjustedScore: selectedEntry.adjustedScore,
      };

      const key = selectedCandidate.outfit
        .map((item) => item.id)
        .sort()
        .join(",");

      selected.push(selectedCandidate);
      usedKeys.add(key);
      addedInRound = true;

      if (selected.length >= limit) {
        break;
      }
    }

    if (!addedInRound) {
      break;
    }
  }

  return selected;
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

  if (selectedButy.length > 0) {
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
  } else {
    selectedGoras.forEach((g) => {
      selectedDols.forEach((d) => {
        rawCombos.push([g, d]);
      });
    });

    selectedSukienki.forEach((s) => {
      rawCombos.push([s]);
    });
  }

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
    const hasShoes = outfit.some(
      (item) => item.category === "Buty" || item.category === "Obuwie",
    );

    return {
      outfit,
      ...best,
      isComplete: hasShoes,
      missingCategories: hasShoes ? [] : ["Obuwie"],
    };
  });

  const finalLimit = targetCombos || 30;

  const diversified = selectOccasionDiverseCombos(scoredCombos, finalLimit);

  return {
    capsuleItems,
    totalCombinations: rawCombos.length,
    combinations: diversified.map((candidate) => candidate.outfit),
    combinationDetails: diversified.map((candidate) => ({
      outfit: candidate.outfit,
      occasion: candidate.occasion,
      score: candidate.score,
      overlapPenalty: candidate.overlapPenalty,
      adjustedScore: candidate.adjustedScore,
      isComplete: candidate.isComplete,
      missingCategories: candidate.missingCategories,
    })),
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

function addTripAvailability(capsule, requestedDays) {
  const generatedOutfitCount = capsule.combinations.length;
  const missingOutfitCount = Math.max(
    0,
    requestedDays - generatedOutfitCount,
  );

  return {
    ...capsule,
    requestedDays,
    generatedOutfitCount,
    missingOutfitCount,
    hasEnoughOutfits: missingOutfitCount === 0,
    availabilityMessage:
      missingOutfitCount > 0
        ? `Udało się przygotować ${generatedOutfitCount} z ${requestedDays} wymaganych zestawów. Brakuje ${missingOutfitCount}.`
        : null,
  };
}

function generateTripCapsuleWardrobe(
  clothes,
  userProfile = {},
  weatherTypes = ["Clear"],
  days = 1,
) {
  const requestedDays = Math.max(
    1,
    parseInt(days, 10) || 1,
  );

  const emptyCapsule = {
    capsuleItems: [],
    totalCombinations: 0,
    combinations: [],
    combinationDetails: [],
  };

  if (!Array.isArray(clothes)) {
    return addTripAvailability(emptyCapsule, requestedDays);
  }

  const wearableClothes = clothes.filter(
    (item) => !isNonOutfitItem(item),
  );

  if (wearableClothes.length < 5) {
    return addTripAvailability(emptyCapsule, requestedDays);
  }

  const safeWeatherTypes =
    Array.isArray(weatherTypes) && weatherTypes.length > 0
      ? weatherTypes
      : ["Clear"];

  const capsule = buildCapsule(
    wearableClothes,
    userProfile,
    safeWeatherTypes,
    {
      targetCombos: requestedDays,
    },
  );

  return addTripAvailability(capsule, requestedDays);
}

module.exports = {
  generateCapsuleWardrobe,
  generateTripCapsuleWardrobe,
  selectOccasionDiverseCombos,
  calculateJaccardSimilarity,
  calculateOverlapPenalty,
};
