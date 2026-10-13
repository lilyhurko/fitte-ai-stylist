const test = require("node:test");
const assert = require("node:assert/strict");
const {
  estimateGeminiCostUsd,
  estimateGroqCostUsd,
} = require("../services/aiCostService");

test("szacuje koszt Gemini z tokenami myślenia jako tokenami wyjściowymi", () => {
  assert.equal(
    estimateGeminiCostUsd({
      promptTokens: 1_000_000,
      outputTokens: 100_000,
      thoughtsTokens: 100_000,
    }),
    0.8,
  );
});

test("szacuje koszt Groq z osobną stawką cache", () => {
  assert.equal(
    estimateGroqCostUsd({
      promptTokens: 1_000_000,
      cachedInputTokens: 200_000,
      outputTokens: 100_000,
    }),
    0.195,
  );
});

test("brak metadanych tokenów nie tworzy ujemnego kosztu", () => {
  assert.equal(estimateGeminiCostUsd({}), 0);
  assert.equal(estimateGroqCostUsd({}), 0);
});
