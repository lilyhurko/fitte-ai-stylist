const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generateCapsuleWardrobe,
  generateTripCapsuleWardrobe,
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
  const result = generateCapsuleWardrobe(
    completeWardrobe.slice(0, 4),
  );

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
  const result = generateCapsuleWardrobe(
    completeWardrobe,
    {},
    "Clear",
  );

  assert.ok(result.capsuleItems.length >= 5);
  assert.equal(result.totalCombinations, 8);
  assert.ok(result.combinations.length > 0);

  result.combinations.forEach((outfit) => {
    assert.equal(outfit.length, 3);
    assert.ok(
      outfit.some(
        (item) =>
          item.category === "Buty" ||
          item.category === "Obuwie",
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

  const result = generateCapsuleWardrobe(
    wardrobe,
    {},
    "Rain",
  );

  const usedIds = new Set(
    result.capsuleItems.map((item) => item.id),
  );

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

  const result = generateCapsuleWardrobe(
    wardrobe,
    {},
    "Rain",
  );

  const usedIds = new Set(
    result.capsuleItems.map((item) => item.id),
  );

  assert.equal(usedIds.has("sandals"), true);
  assert.ok(result.combinations.length > 0);
});

test("baseline nie tworzy kombinacji kapsuły bez obuwia", () => {
  const wardrobeWithoutShoes = [
    createItem("top-1", "Góra"),
    createItem("top-2", "Góra"),
    createItem("top-3", "Góra"),
    createItem("bottom-1", "Dół"),
    createItem("bottom-2", "Dół"),
  ];

  const result = generateCapsuleWardrobe(
    wardrobeWithoutShoes,
    {},
    "Clear",
  );

  assert.equal(result.combinations.length, 0);
});