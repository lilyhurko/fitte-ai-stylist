const test = require("node:test");
const assert = require("node:assert/strict");

const {
  roundWeight,
  clampPreferenceWeight,
  adjustPreferenceWeight,
  decayPreferenceWeight,
  decayPreferenceWeights,
} = require("../services/preferenceLearningService");

test("LIKE zwiększa neutralną wagę o 0.1", () => {
  assert.equal(adjustPreferenceWeight(1.0, "LIKE"), 1.1);
});

test("DISLIKE zmniejsza neutralną wagę o 0.1", () => {
  assert.equal(adjustPreferenceWeight(1.0, "DISLIKE"), 0.9);
});

test("waga nie przekracza górnej granicy 1.5", () => {
  assert.equal(adjustPreferenceWeight(1.5, "LIKE"), 1.5);
  assert.equal(clampPreferenceWeight(10), 1.5);
});

test("waga nie spada poniżej dolnej granicy 0.5", () => {
  assert.equal(adjustPreferenceWeight(0.5, "DISLIKE"), 0.5);
  assert.equal(clampPreferenceWeight(-10), 0.5);
});

test("brak oceny nie zmienia poprawnej wagi", () => {
  assert.equal(adjustPreferenceWeight(1.3, null), 1.3);
  assert.equal(roundWeight(1.2000000000000002), 1.2);
});
test("wielokrotne LIKE zatrzymuje wagę na 1.5", () => {
  let weight = 1.0;

  for (let index = 0; index < 20; index += 1) {
    weight = adjustPreferenceWeight(weight, "LIKE");
  }

  assert.equal(weight, 1.5);
});

test("wielokrotne DISLIKE zatrzymuje wagę na 0.5", () => {
  let weight = 1.0;

  for (let index = 0; index < 20; index += 1) {
    weight = adjustPreferenceWeight(weight, "DISLIKE");
  }

  assert.equal(weight, 0.5);
});

test("wygaszanie zbliża wysoką wagę do wartości neutralnej", () => {
  assert.equal(decayPreferenceWeight(1.5), 1.475);
});

test("wygaszanie zbliża niską wagę do wartości neutralnej", () => {
  assert.equal(decayPreferenceWeight(0.5), 0.525);
});

test("waga neutralna pozostaje bez zmian", () => {
  assert.equal(decayPreferenceWeight(1.0), 1.0);
});

test("wygaszanie działa na całej mapie preferencji", () => {
  assert.deepEqual(
    decayPreferenceWeights({
      Classic: 1.5,
      Casual: 0.5,
      Romantic: 1.0,
    }),
    {
      Classic: 1.475,
      Casual: 0.525,
      Romantic: 1.0,
    },
  );
});

test("wielokrotne wygaszanie ostatecznie wraca do 1.0", () => {
  let weight = 1.5;

  for (let index = 0; index < 200; index += 1) {
    weight = decayPreferenceWeight(weight);
  }

  assert.equal(weight, 1.0);
});