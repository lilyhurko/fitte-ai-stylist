const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCorrectedFields,
  isDraftExpired,
} = require("../services/clothDraftService");

const aiAnalysis = {
  name: "Brązowa kurtka",
  category: "Okrycia wierzchnie",
  style: "Modern",
  color: "ciemnobrązowy",
  materials: ["FAUX_LEATHER"],
  seasons: ["SPRING", "AUTUMN"],
  warmthLevel: 3,
  waterResistance: "WATER_REPELLENT",
  formality: "SMART_CASUAL",
  pattern: "SOLID",
  sleeveLength: "LONG",
};

test("brak zmian zwraca pustą listę poprawionych pól", () => {
  assert.deepEqual(
    getCorrectedFields(aiAnalysis, aiAnalysis),
    [],
  );
});

test("wykrywa właściwości poprawione przez użytkownika", () => {
  const confirmedData = {
    ...aiAnalysis,
    name: "Kurtka z paskiem",
    warmthLevel: 2,
    waterResistance: null,
  };

  assert.deepEqual(
    getCorrectedFields(aiAnalysis, confirmedData),
    ["name", "warmthLevel", "waterResistance"],
  );
});

test("kolejność materiałów i sezonów nie jest traktowana jako poprawka", () => {
  const original = {
    ...aiAnalysis,
    materials: ["COTTON", "ELASTANE"],
    seasons: ["SPRING", "SUMMER"],
  };

  const confirmed = {
    ...original,
    materials: ["ELASTANE", "COTTON"],
    seasons: ["SUMMER", "SPRING"],
  };

  assert.deepEqual(
    getCorrectedFields(original, confirmed),
    [],
  );
});

test("rozpoznaje aktywną i wygasłą wersję roboczą", () => {
  const now = new Date("2026-09-11T12:00:00.000Z");

  assert.equal(
    isDraftExpired(
      "2026-09-11T12:30:00.000Z",
      now,
    ),
    false,
  );

  assert.equal(
    isDraftExpired(
      "2026-09-11T11:59:59.000Z",
      now,
    ),
    true,
  );
});

test("nieprawidłowa data wygaśnięcia jest traktowana jako wygasła", () => {
  assert.equal(
    isDraftExpired("nieprawidłowa-data"),
    true,
  );
});