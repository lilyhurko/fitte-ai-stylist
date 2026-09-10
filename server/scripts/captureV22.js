const fs = require("node:fs");
const path = require("node:path");
const { generateBestOutfits } = require("../outfitEngine");

const {
  selectCandidateFromPool,
} = require("../services/recommendationSelectionService");

const {
  FITTE_ALGORITHM_VERSION,
  RECENT_RECOMMENDATION_LIMIT,
  QUALITY_POOL_MAX_SCORE_GAP,
} = require("../config/algorithm");

const clothes = [
  {
    id: "white-shirt",
    name: "Biała klasyczna koszula",
    category: "Góra",
    style: "Classic, Minimalizm",
    color: "biały",
  },
  {
    id: "pink-blouse",
    name: "Satynowa romantyczna bluzka",
    category: "Góra",
    style: "Romantic, Chic",
    color: "pastelowy róż",
  },
  {
    id: "casual-tshirt",
    name: "Bawełniany casualowy t-shirt",
    category: "Góra",
    style: "Casual, Streetwear",
    color: "biały",
  },
  {
    id: "wool-sweater",
    name: "Ciepły wełniany sweter",
    category: "Góra",
    style: "Classic, Casual",
    color: "kremowy",
  },
  {
    id: "navy-trousers",
    name: "Klasyczne spodnie biznesowe",
    category: "Dół",
    style: "Classic, Minimalizm",
    color: "granatowy",
  },
  {
    id: "blue-jeans",
    name: "Codzienne jeansy",
    category: "Dół",
    style: "Casual, Streetwear",
    color: "granatowy",
  },
  {
    id: "beige-skirt",
    name: "Elegancka spódnica",
    category: "Dół",
    style: "Romantic, Chic",
    color: "beżowy",
  },
  {
    id: "pink-dress",
    name: "Pastelowa satynowa sukienka",
    category: "Sukienki",
    style: "Romantic, Chic",
    color: "pastelowy róż",
  },
  {
    id: "black-heels",
    name: "Czarne eleganckie obcasy",
    category: "Obuwie",
    style: "Classic, Chic",
    color: "czarny",
  },
  {
    id: "white-sneakers",
    name: "Białe wygodne sneakersy",
    category: "Obuwie",
    style: "Casual, Streetwear",
    color: "biały",
  },
  {
    id: "beige-boots",
    name: "Ciepłe beżowe botki",
    category: "Obuwie",
    style: "Classic",
    color: "beżowy",
  },
  {
    id: "summer-sandals",
    name: "Lekkie letnie sandały",
    category: "Obuwie",
    style: "Boho, Casual",
    color: "beżowy",
  },
];

const userProfile = {
  styleWeights: {
    Classic: 2,
    Minimalizm: 1,
    Casual: 1,
    Romantic: 1,
  },
  colorWeights: {
    biały: 2,
    granatowy: 1,
    beżowy: 1,
  },
};

const scenarios = [
  {
    id: "work-clear",
    occasion: "Praca",
    weather: "Clear",
    event: { occasion: "Praca", formality: "Formal" },
  },
  {
    id: "date-clear",
    occasion: "Randka",
    weather: "Clear",
    event: { occasion: "Randka", formality: "Semi-formal" },
  },
  {
    id: "casual-hot",
    occasion: "Casual",
    weather: "Hot",
    event: null,
  },
  {
    id: "casual-rain",
    occasion: "Casual",
    weather: "Rain",
    event: null,
  },
  {
    id: "work-cold",
    occasion: "Praca",
    weather: "Cold",
    event: { occasion: "Praca", formality: "Formal" },
  },
];
const RUNS_PER_SCENARIO = Number.parseInt(
  process.env.EXPERIMENT_RUNS || "100",
  10,
);

if (!Number.isInteger(RUNS_PER_SCENARIO) || RUNS_PER_SCENARIO <= 0) {
  throw new Error("EXPERIMENT_RUNS musi być dodatnią liczbą całkowitą");
}

function createOutfitSignature(outfit) {
  return outfit
    .map((item) => String(item.id))
    .sort()
    .join("+");
}

function roundMetric(value) {
  return Number(value.toFixed(2));
}

function calculateAverage(values) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateJaccardSimilarity(firstIds, secondIds) {
  const firstSet = new Set(firstIds);
  const secondSet = new Set(secondIds);

  const intersectionSize = [...firstSet].filter((id) =>
    secondSet.has(id),
  ).length;

  const unionSize = new Set([...firstSet, ...secondSet]).size;

  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

function calculateJaccardSimilarity(firstIds, secondIds) {
  const firstSet = new Set(firstIds);
  const secondSet = new Set(secondIds);

  const intersectionSize = [...firstSet].filter((id) =>
    secondSet.has(id),
  ).length;

  const unionSize = new Set([...firstSet, ...secondSet]).size;

  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

const results = scenarios.map((scenario) => {
  let recommendationHistory = [];
  const seenSignatures = new Set();
  const runs = [];

  for (let runIndex = 0; runIndex < RUNS_PER_SCENARIO; runIndex += 1) {
    const qualityPool = generateBestOutfits(
      clothes,
      userProfile,
      scenario.event,
      scenario.occasion,
      scenario.weather,
      recommendationHistory,
    );

    const selectionSeed = `${scenario.id}-run-${runIndex + 1}`;

    const { candidate: selectedCandidate, selectionIndex } =
      selectCandidateFromPool(qualityPool, selectionSeed);

    if (!selectedCandidate) {
      runs.push({
        run: runIndex + 1,
        selectionSeed,
        selectedCandidateIndex: null,
        signature: null,
        itemIds: [],
        score: null,
        bestAvailableScore: null,
        qualityLoss: null,
        repeated: false,
      });

      continue;
    }

    const itemIds = selectedCandidate.outfit.map((item) => item.id);
    const signature = createOutfitSignature(selectedCandidate.outfit);
    const bestAvailableScore = qualityPool[0].totalScore;
    const qualityLoss = roundMetric(
      bestAvailableScore - selectedCandidate.totalScore,
    );
    const repeated = seenSignatures.has(signature);

    runs.push({
      run: runIndex + 1,
      selectionSeed,
      selectedCandidateIndex: selectionIndex,
      qualityPoolSize: qualityPool.length,
      signature,
      itemIds,
      score: selectedCandidate.totalScore,
      bestAvailableScore,
      qualityLoss,
      repetitionPenalty: selectedCandidate.details.repetitionPenalty,
      repeated,
    });

    seenSignatures.add(signature);

    recommendationHistory = [
      { clothIds: itemIds },
      ...recommendationHistory,
    ].slice(0, RECENT_RECOMMENDATION_LIMIT);
  }

  const successfulRuns = runs.filter((run) => run.signature !== null);
  const scores = successfulRuns.map((run) => run.score);
  const qualityLosses = successfulRuns.map((run) => run.qualityLoss);
  const signatureCounts = new Map();

  let cumulativeRepeatedRuns = 0;
  let recentWindowRepeatedRuns = 0;
  let consecutiveRepeatedTransitions = 0;
  const adjacentSimilarities = [];

  successfulRuns.forEach((run, index) => {
    const previousCount = signatureCounts.get(run.signature) || 0;

    if (previousCount > 0) {
      cumulativeRepeatedRuns += 1;
    }

    signatureCounts.set(run.signature, previousCount + 1);

    const recentRuns = successfulRuns.slice(
      Math.max(0, index - RECENT_RECOMMENDATION_LIMIT),
      index,
    );

    if (
      recentRuns.some(
        (previousRun) => previousRun.signature === run.signature,
      )
    ) {
      recentWindowRepeatedRuns += 1;
    }

    if (index > 0) {
      const previousRun = successfulRuns[index - 1];

      if (previousRun.signature === run.signature) {
        consecutiveRepeatedTransitions += 1;
      }

      adjacentSimilarities.push(
        calculateJaccardSimilarity(previousRun.itemIds, run.itemIds),
      );
    }
  });

  const probabilities = [...signatureCounts.values()].map(
    (count) => count / successfulRuns.length,
  );

  const entropy = probabilities.reduce(
    (sum, probability) => sum - probability * Math.log(probability),
    0,
  );

  const normalizedEntropy =
    signatureCounts.size <= 1 ? 0 : entropy / Math.log(signatureCounts.size);

  const dominantOutfitCount =
    signatureCounts.size === 0 ? 0 : Math.max(...signatureCounts.values());

  return {
    scenario: scenario.id,
    inputs: {
      occasion: scenario.occasion,
      weather: scenario.weather,
      formality: scenario.event?.formality ?? null,
    },
    totalRuns: RUNS_PER_SCENARIO,
    successfulRuns: successfulRuns.length,
    uniqueResults: signatureCounts.size,
    cumulativeRepeatedRuns,
    recentWindowRepeatedRuns,
    consecutiveRepeatedTransitions,
    cumulativeRepetitionRate: roundMetric(
      successfulRuns.length === 0
        ? 0
        : cumulativeRepeatedRuns / successfulRuns.length,
    ),
    recentWindowRepeatRate: roundMetric(
      successfulRuns.length === 0
        ? 0
        : recentWindowRepeatedRuns / successfulRuns.length,
    ),
    consecutiveRepeatRate: roundMetric(
      successfulRuns.length <= 1
        ? 0
        : consecutiveRepeatedTransitions / (successfulRuns.length - 1),
    ),
    normalizedEntropy: roundMetric(normalizedEntropy),
    effectiveOutfitCount: roundMetric(Math.exp(entropy)),
    dominantOutfitShare: roundMetric(
      successfulRuns.length === 0
        ? 0
        : dominantOutfitCount / successfulRuns.length,
    ),
    averageAdjacentItemSimilarity: roundMetric(
      calculateAverage(adjacentSimilarities),
    ),
    averageScore: roundMetric(calculateAverage(scores)),
    averageQualityLoss: roundMetric(calculateAverage(qualityLosses)),
    maximumQualityLoss:
      qualityLosses.length === 0 ? 0 : Math.max(...qualityLosses),
    runs,
  };
});

const totalSuccessfulRuns = results.reduce(
  (sum, result) => sum + result.successfulRuns,
  0,
);

const totalUniqueResults = results.reduce(
  (sum, result) => sum + result.uniqueResults,
  0,
);

const totalCumulativeRepeatedRuns = results.reduce(
  (sum, result) => sum + result.cumulativeRepeatedRuns,
  0,
);

const totalRecentWindowRepeatedRuns = results.reduce(
  (sum, result) => sum + result.recentWindowRepeatedRuns,
  0,
);

const totalQualityLoss = results.reduce(
  (sum, result) => sum + result.averageQualityLoss * result.successfulRuns,
  0,
);

const totalTransitions = results.reduce(
  (sum, result) => sum + Math.max(result.successfulRuns - 1, 0),
  0,
);

const totalConsecutiveRepeats = results.reduce(
  (sum, result) => sum + result.consecutiveRepeatedTransitions,
  0,
);

const summary = {
  totalSuccessfulRuns,
  totalUniqueResults,
  averageUniqueResultsPerScenario: roundMetric(
    totalUniqueResults / results.length,
  ),
  cumulativeRepetitionRate: roundMetric(
    totalCumulativeRepeatedRuns / totalSuccessfulRuns,
  ),
  recentWindowRepeatRate: roundMetric(
    totalRecentWindowRepeatedRuns / totalSuccessfulRuns,
  ),
  consecutiveRepeatRate: roundMetric(
    totalTransitions === 0 ? 0 : totalConsecutiveRepeats / totalTransitions,
  ),
  averageNormalizedEntropy: roundMetric(
    calculateAverage(results.map((result) => result.normalizedEntropy)),
  ),
  averageEffectiveOutfitCount: roundMetric(
    calculateAverage(results.map((result) => result.effectiveOutfitCount)),
  ),
  averageDominantOutfitShare: roundMetric(
    calculateAverage(results.map((result) => result.dominantOutfitShare)),
  ),
  averageAdjacentItemSimilarity: roundMetric(
    calculateAverage(
      results.map((result) => result.averageAdjacentItemSimilarity),
    ),
  ),
  averageQualityLoss: roundMetric(totalQualityLoss / totalSuccessfulRuns),
  maximumQualityLoss: Math.max(
    ...results.map((result) => result.maximumQualityLoss),
  ),
};

const report = {
  experiment: "fitte-v2.2-evaluation",
  algorithmVersion: FITTE_ALGORITHM_VERSION,
  generatedAt: new Date().toISOString(),
  configuration: {
    runsPerScenario: RUNS_PER_SCENARIO,
    recentRecommendationLimit: RECENT_RECOMMENDATION_LIMIT,
    qualityPoolMaxScoreGap: QUALITY_POOL_MAX_SCORE_GAP,
    seedStrategy: "fixed-scenario-run-seed",
  },
  scenarioCount: results.length,
  summary,
  results,
};

const outputPath = path.resolve(__dirname, `../../docs/v2.2-results-${RUNS_PER_SCENARIO}-runs.json`,);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Zapisano wyniki v2.2: ${outputPath}`);
console.log("Podsumowanie:", summary);
results.forEach((result) => {
  console.log(
      `${result.scenario}: ` +
      `${result.uniqueResults}/${result.successfulRuns} unikalnych, ` +
      `powtórzenia skumulowane: ${result.cumulativeRepetitionRate}, ` +
      `powtórzenia w ostatnich ${RECENT_RECOMMENDATION_LIMIT}: ${result.recentWindowRepeatRate}, ` +
      `średnia utrata jakości: ${result.averageQualityLoss}`,
  );
});
