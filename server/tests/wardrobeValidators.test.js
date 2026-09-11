const test = require("node:test");
const assert = require("node:assert/strict");

const { updateClothSchema } = require("../validators/wardrobeValidators");

test("akceptuje komplet poprawnych właściwości ubrania", () => {
  const result = updateClothSchema.safeParse({
    materials: ["COTTON", "ELASTANE", "FAUX_LEATHER"],
    seasons: ["SPRING", "SUMMER"],
    warmthLevel: 2,
    waterResistance: "NONE",
    formality: "SMART_CASUAL",
    pattern: "SOLID",
    sleeveLength: "SHORT",
  });

  assert.equal(result.success, true);
});

test("akceptuje brak informacji o opcjonalnych właściwościach", () => {
  const result = updateClothSchema.safeParse({
    name: "Biała koszula",
    warmthLevel: null,
    waterResistance: null,
    formality: null,
    pattern: null,
    sleeveLength: null,
  });

  assert.equal(result.success, true);
});

test("odrzuca poziom ciepła spoza zakresu 1–5", () => {
  const tooLow = updateClothSchema.safeParse({
    warmthLevel: 0,
  });

  const tooHigh = updateClothSchema.safeParse({
    warmthLevel: 6,
  });

  assert.equal(tooLow.success, false);
  assert.equal(tooHigh.success, false);
});

test("odrzuca nieznane wartości właściwości", () => {
  const result = updateClothSchema.safeParse({
    materials: ["BAWEŁNA"],
    seasons: ["LATO"],
    waterResistance: "TAK",
    formality: "ELEGANCKIE",
  });

  assert.equal(result.success, false);
});

test("odrzuca pustą aktualizację ubrania", () => {
  const result = updateClothSchema.safeParse({});

  assert.equal(result.success, false);
});
