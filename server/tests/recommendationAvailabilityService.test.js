const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getRecommendationAvailability,
} = require("../services/recommendationAvailabilityService");

test("brak kandydatów zwraca status NONE", () => {
  const result = getRecommendationAvailability(0);

  assert.equal(result.status, "NONE");
  assert.match(result.message, /Brak zestawu/);
});

test("jeden kandydat zwraca status SINGLE i komunikat", () => {
  const result = getRecommendationAvailability(1);

  assert.equal(result.status, "SINGLE");
  assert.match(result.message, /tylko jeden zestaw/);
});

test("wiele kandydatów zwraca status MULTIPLE bez komunikatu", () => {
  const result = getRecommendationAvailability(3);

  assert.deepEqual(result, {
    status: "MULTIPLE",
    message: null,
  });
});