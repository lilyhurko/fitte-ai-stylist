const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeAttributeKey,
  normalizeStyleName,
  normalizeStyleNames,
  normalizeColorName,
} = require("../services/attributeNormalizationService");

test("normalizuje wielkość liter, spacje i polskie znaki", () => {
  assert.equal(
    normalizeAttributeKey("  BŁĘKITNY  "),
    "blekitny",
  );
});

test("łączy różne nazwy tego samego stylu", () => {
  assert.equal(normalizeStyleName("klasyczna"), "Classic");
  assert.equal(normalizeStyleName("CLASSIC"), "Classic");
  assert.equal(normalizeStyleName("sportowa"), "Sport");
});

test("rozdziela i deduplikuje wiele stylów ubrania", () => {
  assert.deepEqual(
    normalizeStyleNames(
      "Classic, minimalistyczna / klasyczna; Romantic",
    ),
    ["Classic", "Minimalizm", "Romantic"],
  );
});

test("łączy odmiany tej samej nazwy koloru", () => {
  assert.equal(normalizeColorName("BIAŁA"), "biały");
  assert.equal(normalizeColorName("beżowe"), "beżowy");
  assert.equal(normalizeColorName("Pastelowa róż"), "pastelowy róż");
  assert.equal(normalizeColorName("Błękitna"), "błękitny");
});