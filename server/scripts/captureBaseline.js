const fs = require("node:fs");
const path = require("node:path");
const { generateBestOutfits } = require("../outfitEngine");

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

function simplifyRecommendations(recommendations) {
  return recommendations.map((recommendation, position) => ({
    position: position + 1,
    totalScore: recommendation.totalScore,
    itemIds: recommendation.outfit.map((item) => item.id),
    itemNames: recommendation.outfit.map((item) => item.name),
    details: recommendation.details,
  }));
}

function createSignature(recommendations) {
  return recommendations
    .map((recommendation) =>
      recommendation.outfit.map((item) => item.id).join("+"),
    )
    .join("|");
}

const results = scenarios.map((scenario) => {
  const repeatedRuns = Array.from({ length: 5 }, () =>
    generateBestOutfits(
      clothes,
      userProfile,
      scenario.event,
      scenario.occasion,
      scenario.weather,
    ),
  );

  const signatures = repeatedRuns.map(createSignature);
  const uniqueSignatures = [...new Set(signatures)];

  return {
    scenario: scenario.id,
    inputs: {
      occasion: scenario.occasion,
      weather: scenario.weather,
      formality: scenario.event?.formality ?? null,
    },
    repeatedRuns: repeatedRuns.length,
    uniqueResults: uniqueSignatures.length,
    deterministic: uniqueSignatures.length === 1,
    recommendations: simplifyRecommendations(repeatedRuns[0]),
  };
});

const report = {
  baseline: "baseline-v1",
  commit: "2f0bc5a6b05ff55d3755bf5439d2adcc820a0f5d",
  generatedAt: new Date().toISOString(),
  algorithm: "Fitte Engine v1",
  scenarioCount: results.length,
  results,
};

const outputPath = path.resolve(
  __dirname,
  "../../docs/baseline-results.json",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(`Zapisano wyniki baseline: ${outputPath}`);

results.forEach((result) => {
  console.log(
    `${result.scenario}: ${result.uniqueResults} unikalny wynik w ${result.repeatedRuns} próbach`,
  );
});