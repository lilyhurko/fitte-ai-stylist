const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateOutfitScore,
  generateBestOutfits,
  isNonOutfitItem,
  parseStyles,
  calculateRepetitionPenalty,
  createOutfitKey,
  createQualityPool,
  roundScore,
  excludeRecentOutfitsWhenAlternativeExists,
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

  assert.deepEqual(parseStyles(item), ["Classic", "Minimalizm", "Romantic"]);
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

  assert.equal(personalizedScore - neutralScore, 10);
});

test("twarde niedopasowanie pogodowe daje wynik -999", () => {
  const sandals = createItem({
    name: "Lekkie sandały",
    category: "Obuwie",
    style: "Casual",
    color: "beżowy",
  });

  const result = calculateOutfitScore([sandals], {}, null, "Casual", "Rain");

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

  const results = generateBestOutfits(clothes, {}, null, "Praca", "Clear");

  assert.ok(results.length >= 1);
  assert.ok(results.length <= 3);

  for (let index = 1; index < results.length; index += 1) {
    assert.ok(results[index - 1].totalScore >= results[index].totalScore);
  }

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

  const firstRun = generateBestOutfits(clothes, {}, null, "Casual", "Clear");

  const secondRun = generateBestOutfits(clothes, {}, null, "Casual", "Clear");

  assert.deepEqual(secondRun, firstRun);
});

test("ciemne ubranie otrzymuje twarde weto podczas upału", () => {
  const darkItem = createItem({
    name: "Czarny casualowy t-shirt",
    style: "Casual",
    color: "czarny",
  });

  const result = calculateOutfitScore([darkItem], {}, null, "Casual", "Hot");

  assert.equal(result.totalScore, -999);
});

test("letnia sukienka otrzymuje twarde weto podczas zimna", () => {
  const summerDress = createItem({
    name: "Lekka letnia sukienka",
    category: "Sukienki",
    style: "Romantic",
    color: "pastelowy róż",
  });

  const result = calculateOutfitScore(
    [summerDress],
    {},
    null,
    "Randka",
    "Cold",
  );

  assert.equal(result.totalScore, -999);
});

test("wynik końcowy jest sumą jawnych składników punktacji", () => {
  const outfit = [
    createItem({
      id: "shirt",
      name: "Klasyczna koszula",
      category: "Góra",
      style: "Classic",
      color: "biały",
    }),
    createItem({
      id: "trousers",
      name: "Klasyczne spodnie",
      category: "Dół",
      style: "Classic",
      color: "granatowy",
    }),
    createItem({
      id: "shoes",
      name: "Klasyczne półbuty",
      category: "Obuwie",
      style: "Classic",
      color: "biały",
    }),
  ];

  const result = calculateOutfitScore(
    outfit,
    {
      styleWeights: { Classic: 1 },
      colorWeights: { biały: 1 },
    },
    {
      occasion: "Praca",
      formality: "Formal",
    },
    "Praca",
    "Clear",
  );

  const {
    baseScore,
    weatherScore,
    occasionScore,
    colorScore,
    preferenceScore,
    formalityScore,
    repetitionPenalty,
  } = result.details;

  const calculatedTotal =
    baseScore +
    weatherScore +
    occasionScore +
    colorScore +
    preferenceScore +
    formalityScore +
    repetitionPenalty;

  assert.equal(result.totalScore, calculatedTotal);
  assert.equal(result.details.totalScore, calculatedTotal);

  assert.equal(baseScore, 100);
  assert.equal(weatherScore, 0);
  assert.equal(occasionScore, 150);
  assert.equal(colorScore, 40);
  assert.equal(preferenceScore, 0);
  assert.equal(formalityScore, 60);
  assert.equal(repetitionPenalty, 0);
  assert.equal(result.totalScore, 350);
});

test("kara za styl niedopasowany do pogody jest osobnym składnikiem", () => {
  const item = createItem({
    name: "Lekka biała bluzka",
    category: "Góra",
    style: "Classic",
    color: "biały",
  });

  const result = calculateOutfitScore([item], {}, null, null, "Hot");

  assert.equal(result.details.baseScore, 100);
  assert.equal(result.details.weatherScore, -45);
  assert.equal(result.details.occasionScore, 0);
  assert.equal(result.details.colorScore, 0);
  assert.equal(result.totalScore, 55);
});

test("klucz zestawu nie zależy od kolejności elementów", () => {
  assert.equal(
    createOutfitKey(["shoe", "top", "bottom"]),
    createOutfitKey(["bottom", "shoe", "top"]),
  );
});

test("brak historii nie nakłada kary za powtórzenie", () => {
  const outfit = [
    createItem({ id: "top" }),
    createItem({ id: "bottom", category: "Dół" }),
  ];

  assert.equal(calculateRepetitionPenalty(outfit, []), 0);
});

test("niedawno użyte elementy otrzymują karę", () => {
  const outfit = [
    createItem({ id: "top" }),
    createItem({ id: "bottom", category: "Dół" }),
    createItem({ id: "shoes", category: "Obuwie" }),
  ];

  const history = [
    {
      clothIds: ["top", "different-bottom", "shoes"],
    },
  ];

  assert.equal(calculateRepetitionPenalty(outfit, history), -24);
});

test("identyczny ostatni zestaw otrzymuje dodatkową karę", () => {
  const outfit = [
    createItem({ id: "top" }),
    createItem({ id: "bottom", category: "Dół" }),
    createItem({ id: "shoes", category: "Obuwie" }),
  ];

  const history = [
    {
      clothIds: ["shoes", "top", "bottom"],
    },
  ];

  assert.equal(calculateRepetitionPenalty(outfit, history), -76);
});

test("historia obniża ranking niedawno pokazanego zestawu", () => {
  const clothes = [
    createItem({
      id: "top-a",
      category: "Góra",
      style: "Casual",
    }),
    createItem({
      id: "top-b",
      category: "Góra",
      style: "Casual",
    }),
    createItem({
      id: "bottom",
      category: "Dół",
      style: "Casual",
    }),
    createItem({
      id: "shoes",
      category: "Obuwie",
      style: "Casual",
    }),
  ];

  const withoutHistory = generateBestOutfits(
    clothes,
    {},
    null,
    "Casual",
    "Clear",
  );

  const withHistory = generateBestOutfits(
    clothes,
    {},
    null,
    "Casual",
    "Clear",
    [
      {
        clothIds: ["top-a", "bottom", "shoes"],
      },
    ],
  );

  assert.equal(withoutHistory[0].outfit[0].id, "top-a");

  assert.equal(withHistory[0].outfit[0].id, "top-b");

  assert.equal(withHistory[0].details.repetitionPenalty, -24);
});

test("punktacja nie zapisuje artefaktów zmiennoprzecinkowych", () => {
  assert.equal(roundScore(7.400000000000002), 7.4);
  assert.equal(roundScore(41.800000000000004), 41.8);
});

test("pula jakości odrzuca zestawy słabsze od ustalonego progu", () => {
  const combinations = [
    { id: "weak", totalScore: 79.99 },
    { id: "best", totalScore: 100 },
    { id: "boundary", totalScore: 80 },
    { id: "close", totalScore: 92 },
  ];

  const qualityPool = createQualityPool(combinations, 20);

  assert.deepEqual(
    qualityPool.map((candidate) => candidate.id),
    ["best", "close", "boundary"],
  );
});


test("ostatni zestaw jest wykluczany, gdy istnieje świeża alternatywa", () => {
  const recentCandidate = {
    outfit: [
      { id: "top-a" },
      { id: "bottom" },
      { id: "shoes" },
    ],
    totalScore: 100,
  };

  const freshCandidate = {
    outfit: [
      { id: "top-b" },
      { id: "bottom" },
      { id: "shoes" },
    ],
    totalScore: 95,
  };

  const result = excludeRecentOutfitsWhenAlternativeExists(
    [recentCandidate, freshCandidate],
    [
      {
        clothIds: ["shoes", "bottom", "top-a"],
      },
    ],
  );

  assert.deepEqual(result, [freshCandidate]);
});

test("ostatnie zestawy pozostają dostępne, gdy nie ma świeżej alternatywy", () => {
  const firstCandidate = {
    outfit: [
      { id: "top-a" },
      { id: "bottom" },
      { id: "shoes" },
    ],
    totalScore: 100,
  };

  const secondCandidate = {
    outfit: [
      { id: "top-b" },
      { id: "bottom" },
      { id: "shoes" },
    ],
    totalScore: 95,
  };

  const qualityPool = [firstCandidate, secondCandidate];

  const result = excludeRecentOutfitsWhenAlternativeExists(
    qualityPool,
    [
      { clothIds: ["top-a", "bottom", "shoes"] },
      { clothIds: ["top-b", "bottom", "shoes"] },
    ],
  );

  assert.deepEqual(result, qualityPool);
});

test("odmiany stylu i koloru korzystają z tych samych wag preferencji", () => {
  const userProfile = {
    styleWeights: {
      Classic: 1.2,
    },
    colorWeights: {
      biały: 1.1,
    },
  };

  const canonicalResult = calculateOutfitScore(
    [
      createItem({
        style: "Classic",
        color: "biały",
      }),
    ],
    userProfile,
    null,
    null,
    "Clear",
  );

  const aliasResult = calculateOutfitScore(
    [
      createItem({
        style: "klasyczna",
        color: "BIAŁA",
      }),
    ],
    userProfile,
    null,
    null,
    "Clear",
  );

  assert.equal(
    aliasResult.details.preferenceScore,
    canonicalResult.details.preferenceScore,
  );

  assert.ok(aliasResult.details.preferenceScore > 0);
});

test("odmieniona nazwa ciemnego koloru nadal uruchamia weto na upał", () => {
  const result = calculateOutfitScore(
    [
      createItem({
        name: "Lekki t-shirt",
        style: "Casual",
        color: "CZARNA",
      }),
    ],
    {},
    null,
    "Casual",
    "Hot",
  );

  assert.equal(result.totalScore, -999);
  assert.ok(result.details.vetoReasons.includes("color:czarny"));
});
