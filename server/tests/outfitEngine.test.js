const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateOutfitScore,
  generateBestOutfits,
  isNonOutfitItem,
  parseStyles,
} = require("../outfitEngine");

const createItem = (overrides = {}) => ({
  id: "item",
  name: "Ubranie",
  category: "Góra",
  style: "Casual",
  color: "biały",
  ...overrides,
});

test("parseStyles rozdziela wiele stylów ubrania", () => {
  const item = createItem({
    style: "Classic, Minimalizm, Romantic",
  });

  assert.deepEqual(parseStyles(item), [
    "Classic",
    "Minimalizm",
    "Romantic",
  ]);
});

test("isNonOutfitItem odrzuca bieliznę i ubrania domowe", () => {
  assert.equal(
    isNonOutfitItem(
      createItem({
        name: "Bawełniana piżama",
        category: "Inne",
      }),
    ),
    true,
  );

  assert.equal(
    isNonOutfitItem(
      createItem({
        name: "Biała koszula",
        category: "Góra",
      }),
    ),
    false,
  );
});

test("zgodność z okazją zwiększa wynik zestawu", () => {
  const workItem = createItem({
    name: "Klasyczna koszula",
    style: "Classic",
  });

  const matchingScore = calculateOutfitScore(
    [workItem],
    {},
    null,
    "Praca",
    "Clear",
  ).totalScore;

  const mismatchingScore = calculateOutfitScore(
    [workItem],
    {},
    null,
    "Sport",
    "Clear",
  ).totalScore;

  assert.ok(matchingScore > mismatchingScore);
});

test("preferencje użytkownika zwiększają punktację", () => {
  const item = createItem({
    style: "Classic",
    color: "biały",
  });

  const neutralScore = calculateOutfitScore(
    [item],
    {},
    null,
    null,
    "Clear",
  ).totalScore;

  const personalizedScore = calculateOutfitScore(
    [item],
    {
      styleWeights: { Classic: 2 },
      colorWeights: { biały: 2 },
    },
    null,
    null,
    "Clear",
  ).totalScore;

  assert.equal(personalizedScore - neutralScore, 40);
});

test("twarde niedopasowanie pogodowe daje wynik -999", () => {
  const sandals = createItem({
    name: "Lekkie sandały",
    category: "Obuwie",
    style: "Casual",
    color: "beżowy",
  });

  const result = calculateOutfitScore(
    [sandals],
    {},
    null,
    "Casual",
    "Rain",
  );

  assert.equal(result.totalScore, -999);
  assert.match(result.details.message, /Rain/);
});

test("generateBestOutfits zwraca maksymalnie trzy posortowane zestawy", () => {
  const clothes = [
    createItem({
      id: "top-classic",
      name: "Klasyczna koszula",
      category: "Góra",
      style: "Classic",
      color: "biały",
    }),
    createItem({
      id: "top-casual",
      name: "Casualowy t-shirt",
      category: "Góra",
      style: "Casual",
      color: "czarny",
    }),
    createItem({
      id: "bottom-classic",
      name: "Klasyczne spodnie",
      category: "Dół",
      style: "Classic",
      color: "granatowy",
    }),
    createItem({
      id: "bottom-casual",
      name: "Codzienne jeansy",
      category: "Dół",
      style: "Casual",
      color: "granatowy",
    }),
    createItem({
      id: "shoes-classic",
      name: "Klasyczne półbuty",
      category: "Obuwie",
      style: "Classic",
      color: "czarny",
    }),
    createItem({
      id: "shoes-casual",
      name: "Białe sneakersy",
      category: "Obuwie",
      style: "Casual",
      color: "biały",
    }),
  ];

  const results = generateBestOutfits(
    clothes,
    {},
    null,
    "Praca",
    "Clear",
  );

  assert.equal(results.length, 3);

  assert.ok(results[0].totalScore >= results[1].totalScore);
  assert.ok(results[1].totalScore >= results[2].totalScore);

  results.forEach((result) => {
    assert.equal(result.outfit.length, 3);
  });
});

test("identyczne dane wejściowe dają identyczny ranking baseline", () => {
  const clothes = [
    createItem({
      id: "top-1",
      category: "Góra",
      style: "Casual",
    }),
    createItem({
      id: "top-2",
      category: "Góra",
      style: "Streetwear",
    }),
    createItem({
      id: "bottom-1",
      category: "Dół",
      style: "Casual",
    }),
    createItem({
      id: "shoes-1",
      category: "Obuwie",
      style: "Casual",
    }),
  ];

  const firstRun = generateBestOutfits(
    clothes,
    {},
    null,
    "Casual",
    "Clear",
  );

  const secondRun = generateBestOutfits(
    clothes,
    {},
    null,
    "Casual",
    "Clear",
  );

  assert.deepEqual(secondRun, firstRun);
});