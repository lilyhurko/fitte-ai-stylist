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
const RUNS_PER_SCENARIO = 5;

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

    const {
      candidate: selectedCandidate,
      selectionIndex,
    } = selectCandidateFromPool(qualityPool, selectionSeed);

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
      repetitionPenalty:
        selectedCandidate.details.repetitionPenalty,
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
  const repeatedRuns = successfulRuns.filter((run) => run.repeated).length;

  let consecutiveRepeats = 0;

  for (let index = 1; index < successfulRuns.length; index += 1) {
    if (
      successfulRuns[index].signature ===
      successfulRuns[index - 1].signature
    ) {
      consecutiveRepeats += 1;
    }
  }

  return {
    scenario: scenario.id,
    inputs: {
      occasion: scenario.occasion,
      weather: scenario.weather,
      formality: scenario.event?.formality ?? null,
    },
    totalRuns: RUNS_PER_SCENARIO,
    successfulRuns: successfulRuns.length,
    uniqueResults: seenSignatures.size,
    repetitionRate: roundMetric(
      successfulRuns.length === 0
        ? 0
        : repeatedRuns / successfulRuns.length,
    ),
    consecutiveRepeatRate: roundMetric(
      successfulRuns.length <= 1
        ? 0
        : consecutiveRepeats / (successfulRuns.length - 1),
    ),
    averageScore: roundMetric(calculateAverage(scores)),
    averageQualityLoss: roundMetric(
      calculateAverage(qualityLosses),
    ),
    maximumQualityLoss:
      qualityLosses.length === 0 ? 0 : Math.max(...qualityLosses),
    runs,
  };
});

const report = {
  experiment: "fitte-v2.1-evaluation",
  algorithmVersion: FITTE_ALGORITHM_VERSION,
  generatedAt: new Date().toISOString(),
  configuration: {
    runsPerScenario: RUNS_PER_SCENARIO,
    recentRecommendationLimit: RECENT_RECOMMENDATION_LIMIT,
    qualityPoolMaxScoreGap: QUALITY_POOL_MAX_SCORE_GAP,
    seedStrategy: "fixed-scenario-run-seed",
  },
  scenarioCount: results.length,
  results,
};

const outputPath = path.resolve(
  __dirname,
  "../../docs/v2.1-results.json",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(`Zapisano wyniki v2.1: ${outputPath}`);

results.forEach((result) => {
  console.log(
    `${result.scenario}: ` +
      `${result.uniqueResults}/${result.successfulRuns} unikalnych, ` +
      `powtórzenia: ${result.repetitionRate}, ` +
      `średnia utrata jakości: ${result.averageQualityLoss}`,
  );
});