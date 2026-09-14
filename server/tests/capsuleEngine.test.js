const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generateCapsuleWardrobe,
  generateTripCapsuleWardrobe,
  selectOccasionDiverseCombos,
  calculateJaccardSimilarity,
  calculateOverlapPenalty,
} = require("../capsuleEngine");

const createItem = (id, category, overrides = {}) => ({
  id,
  name: `Ubranie ${id}`,
  category,
  style: "Casual",
  color: "biały",
  ...overrides,
});

const completeWardrobe = [
  createItem("top-1", "Góra"),
  createItem("top-2", "Góra", {
    style: "Classic",
    color: "kremowy",
  }),
  createItem("bottom-1", "Dół"),
  createItem("bottom-2", "Dół", {
    style: "Classic",
    color: "granatowy",
  }),
  createItem("shoes-1", "Obuwie"),
  createItem("shoes-2", "Obuwie", {
    style: "Classic",
    color: "czarny",
  }),
];

test("pusta garderoba zwraca pustą kapsułę", () => {
  const result = generateCapsuleWardrobe([]);

  assert.deepEqual(result, {
    capsuleItems: [],
    totalCombinations: 0,
    combinations: [],
  });
});

test("mniej niż pięć ubrań nie tworzy kapsuły", () => {
  const result = generateCapsuleWardrobe(completeWardrobe.slice(0, 4));

  assert.equal(result.capsuleItems.length, 0);
  assert.equal(result.totalCombinations, 0);
  assert.equal(result.combinations.length, 0);
});

test("bielizna nie jest liczona jako element kapsuły", () => {
  const wardrobe = [
    ...completeWardrobe.slice(0, 4),
    createItem("underwear", "Bielizna", {
      name: "Bawełniana bielizna",
    }),
  ];

  const result = generateCapsuleWardrobe(wardrobe);

  assert.equal(result.capsuleItems.length, 0);
  assert.equal(result.totalCombinations, 0);
});

test("kompletna garderoba tworzy poprawne kombinacje", () => {
  const result = generateCapsuleWardrobe(completeWardrobe, {}, "Clear");

  assert.ok(result.capsuleItems.length >= 5);
  assert.equal(result.totalCombinations, 8);
  assert.ok(result.combinations.length > 0);

  result.combinations.forEach((outfit) => {
    assert.equal(outfit.length, 3);
    assert.ok(
      outfit.some(
        (item) => item.category === "Buty" || item.category === "Obuwie",
      ),
    );
  });
});

test("kapsuła podróżna ogranicza wynik do liczby dni", () => {
  const result = generateTripCapsuleWardrobe(
    completeWardrobe,
    {},
    ["Clear"],
    3,
  );

  assert.equal(result.combinations.length, 3);
  assert.equal(result.requestedDays, 3);
  assert.equal(result.generatedOutfitCount, 3);
  assert.equal(result.missingOutfitCount, 0);
  assert.equal(result.hasEnoughOutfits, true);
  assert.equal(result.availabilityMessage, null);
});

test("sandały są wykluczane z kapsuły na deszcz", () => {
  const wardrobe = [
    ...completeWardrobe,
    createItem("sandals", "Obuwie", {
      name: "Lekkie sandały",
      style: "Casual, Boho",
      color: "beżowy",
    }),
  ];

  const result = generateCapsuleWardrobe(wardrobe, {}, "Rain");

  const usedIds = new Set(result.capsuleItems.map((item) => item.id));

  assert.equal(usedIds.has("sandals"), false);
});

test("sandały pozostają dostępne podczas deszczu, gdy nie ma innych butów", () => {
  const wardrobe = [
    createItem("top-1", "Góra"),
    createItem("top-2", "Góra"),
    createItem("bottom-1", "Dół"),
    createItem("bottom-2", "Dół"),
    createItem("sandals", "Obuwie", {
      name: "Lekkie sandały",
      style: "Casual, Boho",
      color: "beżowy",
      materials: [],
      seasons: ["SUMMER"],
      waterResistance: "NONE",
    }),
  ];

  const result = generateCapsuleWardrobe(wardrobe, {}, "Rain");

  const usedIds = new Set(result.capsuleItems.map((item) => item.id));

  assert.equal(usedIds.has("sandals"), true);
  assert.ok(result.combinations.length > 0);
});

test("kapsuła bez obuwia tworzy i oznacza niekompletne zestawy", () => {
  const wardrobeWithoutShoes = [
    createItem("top-1", "Góra"),
    createItem("top-2", "Góra"),
    createItem("top-3", "Góra"),
    createItem("bottom-1", "Dół"),
    createItem("bottom-2", "Dół"),
  ];

  const result = generateCapsuleWardrobe(wardrobeWithoutShoes, {}, "Clear");

  assert.ok(result.combinations.length > 0);
  assert.equal(result.combinationDetails.length, result.combinations.length);

  result.combinationDetails.forEach((combination) => {
    assert.equal(combination.isComplete, false);
    assert.deepEqual(combination.missingCategories, ["Obuwie"]);
    assert.equal(combination.outfit.length, 2);
  });
});

test("końcowy limit kapsuły zachowuje różnorodność okazji", () => {
  const candidates = [
    {
      outfit: [createItem("work-1", "Góra")],
      occasion: "Praca",
      score: 200,
    },
    {
      outfit: [createItem("work-2", "Góra")],
      occasion: "Praca",
      score: 190,
    },
    {
      outfit: [createItem("work-3", "Góra")],
      occasion: "Praca",
      score: 180,
    },
    {
      outfit: [createItem("date-1", "Góra")],
      occasion: "Randka",
      score: 170,
    },
    {
      outfit: [createItem("casual-1", "Góra")],
      occasion: "Casual",
      score: 160,
    },
  ];

  const selected = selectOccasionDiverseCombos(candidates, 3);

  assert.equal(selected.length, 3);
  assert.deepEqual(
    new Set(selected.map((candidate) => candidate.occasion)),
    new Set(["Praca", "Randka", "Casual"]),
  );
});

test("podobieństwo Jaccarda mierzy nakładanie się elementów zestawu", () => {
  const firstOutfit = [
    createItem("top-1", "Góra"),
    createItem("bottom-1", "Dół"),
    createItem("shoes-1", "Obuwie"),
  ];

  const secondOutfit = [
    createItem("top-1", "Góra"),
    createItem("bottom-1", "Dół"),
    createItem("shoes-2", "Obuwie"),
  ];

  const similarity = calculateJaccardSimilarity(firstOutfit, secondOutfit);

  assert.equal(similarity, 0.5);
});

test("kara za nakładanie wybiera mniej podobny zestaw", () => {
  const firstCandidate = {
    occasion: "Casual",
    score: 100,
    outfit: [
      createItem("top-1", "Góra"),
      createItem("bottom-1", "Dół"),
      createItem("shoes-1", "Obuwie"),
    ],
  };

  const similarCandidate = {
    occasion: "Casual",
    score: 99,
    outfit: [
      createItem("top-1", "Góra"),
      createItem("bottom-1", "Dół"),
      createItem("shoes-2", "Obuwie"),
    ],
  };

  const differentCandidate = {
    occasion: "Casual",
    score: 90,
    outfit: [
      createItem("top-2", "Góra"),
      createItem("bottom-2", "Dół"),
      createItem("shoes-3", "Obuwie"),
    ],
  };

  const penalty = calculateOverlapPenalty(similarCandidate, [firstCandidate]);

  assert.equal(penalty, 15);

  const selected = selectOccasionDiverseCombos(
    [firstCandidate, similarCandidate, differentCandidate],
    2,
  );

  assert.equal(selected.length, 2);
  assert.equal(selected[0].outfit[0].id, "top-1");
  assert.equal(selected[1].outfit[0].id, "top-2");
  assert.equal(selected[1].overlapPenalty, 0);
});

test("kapsuła informuje o brakujących zestawach względem liczby dni", () => {
  const limitedWardrobe = [
    createItem("top-1", "Góra"),
    createItem("bottom-1", "Dół"),
    createItem("bottom-2", "Dół"),
    createItem("bottom-3", "Dół"),
    createItem("bottom-4", "Dół"),
  ];

  const result = generateTripCapsuleWardrobe(limitedWardrobe, {}, ["Clear"], 5);

  assert.equal(result.requestedDays, 5);
  assert.equal(result.generatedOutfitCount, 4);
  assert.equal(result.missingOutfitCount, 1);
  assert.equal(result.hasEnoughOutfits, false);
  assert.match(result.availabilityMessage, /4 z 5/);
});
