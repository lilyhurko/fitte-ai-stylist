const test = require("node:test");
const assert = require("node:assert/strict");

const { generateBestOutfits } = require("../outfitEngine");
const {
  adjustPreferenceWeight,
} = require("../services/preferenceLearningService");

const clothes = [
  {
    id: "top-classic",
    name: "Bluzka A",
    category: "Góra",
    style: "Classic",
    color: "biały",
  },
  {
    id: "top-casual",
    name: "Bluzka B",
    category: "Góra",
    style: "Casual",
    color: "biały",
  },
  {
    id: "bottom",
    name: "Spodnie",
    category: "Dół",
    style: "Minimalizm",
    color: "granatowy",
  },
  {
    id: "shoes",
    name: "Półbuty",
    category: "Obuwie",
    style: "Minimalizm",
    color: "biały",
  },
];

function generateForClassicWeight(classicWeight) {
  return generateBestOutfits(
    clothes,
    {
      styleWeights: {
        Classic: classicWeight,
        Casual: 1,
        Minimalizm: 1,
      },
      colorWeights: { biały: 1, granatowy: 1 },
    },
    null,
    null,
    "Clear",
  );
}

function selectedTopId(results) {
  return results[0].outfit.find((item) => item.category === "Góra").id;
}

test("LIKE zwiększa wynik i wybiera polubiony styl w kolejnej rekomendacji", () => {
  const neutralWeight = 1;
  const likedWeight = adjustPreferenceWeight(neutralWeight, "LIKE");

  const neutralResults = generateForClassicWeight(neutralWeight);
  const likedResults = generateForClassicWeight(likedWeight);

  const neutralClassic = neutralResults.find(
    (result) => selectedTopId([result]) === "top-classic",
  );
  const likedClassic = likedResults.find(
    (result) => selectedTopId([result]) === "top-classic",
  );

  assert.ok(likedClassic.totalScore > neutralClassic.totalScore);
  assert.equal(selectedTopId(likedResults), "top-classic");
});

test("DISLIKE zmniejsza wynik i wybiera alternatywny styl", () => {
  const dislikedWeight = adjustPreferenceWeight(1, "DISLIKE");
  const results = generateForClassicWeight(dislikedWeight);

  assert.equal(selectedTopId(results), "top-casual");

  const classicResult = results.find(
    (result) => selectedTopId([result]) === "top-classic",
  );
  const casualResult = results.find(
    (result) => selectedTopId([result]) === "top-casual",
  );

  assert.ok(classicResult.totalScore < casualResult.totalScore);
});

test("brak oceny nie zmienia kolejnej rekomendacji", () => {
  const neutralResults = generateForClassicWeight(1);
  const unchangedWeight = adjustPreferenceWeight(1, null);
  const resultsWithoutFeedback = generateForClassicWeight(unchangedWeight);

  assert.deepEqual(resultsWithoutFeedback, neutralResults);
});
