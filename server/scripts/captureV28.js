const fs = require("node:fs");
const path = require("node:path");
const { generateBestOutfits } = require("../outfitEngine");
const { createWeatherContext } = require("../services/weatherService");
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
    materials: ["COTTON"],
    seasons: ["ALL_SEASON"],
    warmthLevel: 2,
    waterResistance: "NONE",
    formality: "BUSINESS",
    pattern: "SOLID",
    sleeveLength: "LONG",
  },
  {
    id: "pink-blouse",
    name: "Satynowa romantyczna bluzka",
    category: "Góra",
    style: "Romantic, Chic",
    color: "pastelowy róż",
    materials: ["POLYESTER"],
    seasons: ["SPRING", "SUMMER"],
    warmthLevel: 1,
    waterResistance: "NONE",
    formality: "SMART_CASUAL",
    pattern: "SOLID",
    sleeveLength: "LONG",
  },
  {
    id: "casual-tshirt",
    name: "Bawełniany casualowy t-shirt",
    category: "Góra",
    style: "Casual, Streetwear",
    color: "biały",
    materials: ["COTTON"],
    seasons: ["SPRING", "SUMMER"],
    warmthLevel: 1,
    waterResistance: "NONE",
    formality: "CASUAL",
    pattern: "SOLID",
    sleeveLength: "SHORT",
  },
  {
    id: "wool-sweater",
    name: "Ciepły wełniany sweter",
    category: "Góra",
    style: "Classic, Casual",
    color: "kremowy",
    materials: ["WOOL"],
    seasons: ["AUTUMN", "WINTER"],
    warmthLevel: 5,
    waterResistance: "NONE",
    formality: "CASUAL",
    pattern: "SOLID",
    sleeveLength: "LONG",
  },
  {
    id: "navy-trousers",
    name: "Klasyczne spodnie biznesowe",
    category: "Dół",
    style: "Classic, Minimalizm",
    color: "granatowy",
    materials: ["WOOL", "POLYESTER"],
    seasons: ["AUTUMN", "WINTER"],
    warmthLevel: 3,
    waterResistance: "NONE",
    formality: "BUSINESS",
    pattern: "SOLID",
    sleeveLength: "NOT_APPLICABLE",
  },
  {
    id: "blue-jeans",
    name: "Codzienne jeansy",
    category: "Dół",
    style: "Casual, Streetwear",
    color: "granatowy",
    materials: ["DENIM"],
    seasons: ["ALL_SEASON"],
    warmthLevel: 3,
    waterResistance: "NONE",
    formality: "CASUAL",
    pattern: "SOLID",
    sleeveLength: "NOT_APPLICABLE",
  },
  {
    id: "beige-skirt",
    name: "Elegancka spódnica",
    category: "Dół",
    style: "Romantic, Chic",
    color: "beżowy",
    materials: ["POLYESTER"],
    seasons: ["SPRING", "AUTUMN"],
    warmthLevel: 2,
    waterResistance: "REPELLENT",
    formality: "SMART_CASUAL",
    pattern: "SOLID",
    sleeveLength: "NOT_APPLICABLE",
  },
  {
    id: "pink-dress",
    name: "Pastelowa satynowa sukienka",
    category: "Sukienki",
    style: "Romantic, Chic",
    color: "pastelowy róż",
    materials: ["SILK"],
    seasons: ["SUMMER"],
    warmthLevel: 1,
    waterResistance: "NONE",
    formality: "FORMAL",
    pattern: "SOLID",
    sleeveLength: "SLEEVELESS",
  },
  {
    id: "black-heels",
    name: "Czarne eleganckie obcasy",
    category: "Obuwie",
    style: "Classic, Chic",
    color: "czarny",
    materials: ["LEATHER"],
    seasons: ["ALL_SEASON"],
    warmthLevel: 2,
    waterResistance: "NONE",
    formality: "FORMAL",
    pattern: "SOLID",
    sleeveLength: "NOT_APPLICABLE",
  },
  {
    id: "white-sneakers",
    name: "Białe wygodne sneakersy",
    category: "Obuwie",
    style: "Casual, Streetwear",
    color: "biały",
    materials: ["LEATHER"],
    seasons: ["ALL_SEASON"],
    warmthLevel: 2,
    waterResistance: "WATER_REPELLENT",
    formality: "CASUAL",
    pattern: "SOLID",
    sleeveLength: "NOT_APPLICABLE",
  },
  {
    id: "beige-boots",
    name: "Ciepłe beżowe botki",
    category: "Obuwie",
    style: "Classic",
    color: "beżowy",
    materials: ["LEATHER"],
    seasons: ["AUTUMN", "WINTER"],
    warmthLevel: 4,
    waterResistance: "WATER_REPELLENT",
    formality: "SMART_CASUAL",
    pattern: "SOLID",
    sleeveLength: "NOT_APPLICABLE",
  },
  {
    id: "summer-sandals",
    name: "Lekkie letnie sandały",
    category: "Obuwie",
    style: "Boho, Casual",
    color: "beżowy",
    materials: ["LEATHER"],
    seasons: ["SUMMER"],
    warmthLevel: 1,
    waterResistance: "NONE",
    formality: "CASUAL",
    pattern: "SOLID",
    sleeveLength: "NOT_APPLICABLE",
  },
];

const userProfile = {
  styleWeights: {
    Classic: 1.5,
    Minimalizm: 1,
    Casual: 1,
    Romantic: 1,
  },
  colorWeights: {
    biały: 1.5,
    granatowy: 1,
    beżowy: 1,
  },
};
const weatherContexts = {
  mild: createWeatherContext({
    temperatureC: 18,
    apparentTemperatureC: 18,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 8,
  }),

  hot: createWeatherContext({
    temperatureC: 32,
    apparentTemperatureC: 35,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 10,
  }),

  heavyRain: createWeatherContext({
    temperatureC: 12,
    apparentTemperatureC: 9,
    precipitationMm: 18,
    rainMm: 18,
    snowfallCm: 0,
    windSpeedKmh: 25,
  }),

  cold: createWeatherContext({
    temperatureC: 2,
    apparentTemperatureC: -3,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 20,
  }),

  snow: createWeatherContext({
    temperatureC: -4,
    apparentTemperatureC: -9,
    precipitationMm: 8,
    rainMm: 0,
    snowfallCm: 6,
    windSpeedKmh: 35,
  }),

  windy: createWeatherContext({
    temperatureC: 13,
    apparentTemperatureC: 9,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 45,
  }),
};

const scenarios = [
  {
    id: "work-mild",
    occasion: "Praca",
    weather: weatherContexts.mild,
    event: { occasion: "Praca", formality: "Formal" },
  },
  {
    id: "date-mild",
    occasion: "Randka",
    weather: weatherContexts.mild,
    event: { occasion: "Randka", formality: "Smart Casual" },
  },
  {
    id: "casual-hot",
    occasion: "Casual",
    weather: weatherContexts.hot,
    event: null,
  },
  {
    id: "casual-heavy-rain",
    occasion: "Casual",
    weather: weatherContexts.heavyRain,
    event: null,
  },
  {
    id: "work-cold",
    occasion: "Praca",
    weather: weatherContexts.cold,
    event: { occasion: "Praca", formality: "Formal" },
  },
  {
    id: "casual-snow",
    occasion: "Casual",
    weather: weatherContexts.snow,
    event: null,
  },
  {
    id: "casual-strong-wind",
    occasion: "Casual",
    weather: weatherContexts.windy,
    event: null,
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
      weatherScore: selectedCandidate.details.weatherScore,
      weatherReasons: selectedCandidate.details.weatherReasons || [],
      occasionScore: selectedCandidate.details.occasionScore,
      formalityScore: selectedCandidate.details.formalityScore,
      preferenceScore: selectedCandidate.details.preferenceScore,
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
  const weatherScores = successfulRuns.map((run) => run.weatherScore);

  const occasionScores = successfulRuns.map((run) => run.occasionScore);

  const formalityScores = successfulRuns.map((run) => run.formalityScore);

  const weatherPenaltyRuns = weatherScores.filter((score) => score < 0).length;
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
      recentRuns.some((previousRun) => previousRun.signature === run.signature)
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
    averageWeatherScore: roundMetric(calculateAverage(weatherScores)),

    minimumWeatherScore:
      weatherScores.length === 0 ? 0 : Math.min(...weatherScores),

    maximumWeatherScore:
      weatherScores.length === 0 ? 0 : Math.max(...weatherScores),

    weatherPenaltySelectionRate: roundMetric(
      successfulRuns.length === 0
        ? 0
        : weatherPenaltyRuns / successfulRuns.length,
    ),

    averageOccasionScore: roundMetric(calculateAverage(occasionScores)),

    averageFormalityScore: roundMetric(calculateAverage(formalityScores)),
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
const allSuccessfulRuns = results.flatMap((result) =>
  result.runs.filter((run) => run.signature !== null),
);

const allWeatherScores = allSuccessfulRuns.map((run) => run.weatherScore);

const totalWeatherPenaltyRuns = allWeatherScores.filter(
  (score) => score < 0,
).length;

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
  averageWeatherScore: roundMetric(calculateAverage(allWeatherScores)),

  minimumWeatherScore:
    allWeatherScores.length === 0 ? 0 : Math.min(...allWeatherScores),

  maximumWeatherScore:
    allWeatherScores.length === 0 ? 0 : Math.max(...allWeatherScores),

  weatherPenaltySelectionRate: roundMetric(
    allSuccessfulRuns.length === 0
      ? 0
      : totalWeatherPenaltyRuns / allSuccessfulRuns.length,
  ),
};

const report = {
  experiment: "fitte-v2.8-weather-guardrail-evaluation",
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

const outputPath = path.resolve(
  __dirname,
  `../../docs/v2.8-results-${RUNS_PER_SCENARIO}-runs.json`,
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Zapisano wyniki v2.8: ${outputPath}`);
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
