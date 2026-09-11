const test = require("node:test");
const assert = require("node:assert/strict");

const {
  clothDraftSchema,
} = require("../validators/clothDraftValidators");

const validDraft = {
  name: "Kurtka z imitacji skóry",
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

test("akceptuje kompletną wersję roboczą ubrania", () => {
  const result = clothDraftSchema.safeParse(validDraft);

  assert.equal(result.success, true);
});

test("odrzuca niekompletną wersję roboczą", () => {
  const result = clothDraftSchema.safeParse({
    name: "Kurtka",
    category: "Okrycia wierzchnie",
  });

  assert.equal(result.success, false);
});

test("odrzuca powtórzone materiały i sezony", () => {
  const result = clothDraftSchema.safeParse({
    ...validDraft,
    materials: ["FAUX_LEATHER", "FAUX_LEATHER"],
    seasons: ["AUTUMN", "AUTUMN"],
  });

  assert.equal(result.success, false);
});

test("odrzuca nieprawidłową właściwość wersji roboczej", () => {
  const result = clothDraftSchema.safeParse({
    ...validDraft,
    warmthLevel: 8,
    waterResistance: "YES",
  });

  assert.equal(result.success, false);
});