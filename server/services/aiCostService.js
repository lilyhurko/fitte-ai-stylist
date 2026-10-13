const TOKENS_PER_MILLION = 1_000_000;

const readPrice = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const AI_PRICES_PER_MILLION_USD = {
  gemini: {
    input: readPrice("GEMINI_INPUT_USD_PER_MILLION_TOKENS", 0.3),
    output: readPrice("GEMINI_OUTPUT_USD_PER_MILLION_TOKENS", 2.5),
  },
  groq: {
    input: readPrice("GROQ_INPUT_USD_PER_MILLION_TOKENS", 0.15),
    cachedInput: readPrice("GROQ_CACHED_INPUT_USD_PER_MILLION_TOKENS", 0.075),
    output: readPrice("GROQ_OUTPUT_USD_PER_MILLION_TOKENS", 0.6),
  },
};

const toNonNegativeNumber = (value) =>
  Number.isFinite(value) && value >= 0 ? value : 0;

const roundUsd = (value) => Math.round(value * 1_000_000_000) / 1_000_000_000;

const estimateGeminiCostUsd = ({
  promptTokens,
  outputTokens,
  thoughtsTokens,
}) => {
  const input = toNonNegativeNumber(promptTokens);
  const output =
    toNonNegativeNumber(outputTokens) + toNonNegativeNumber(thoughtsTokens);

  return roundUsd(
    (input * AI_PRICES_PER_MILLION_USD.gemini.input +
      output * AI_PRICES_PER_MILLION_USD.gemini.output) /
      TOKENS_PER_MILLION,
  );
};

const estimateGroqCostUsd = ({
  promptTokens,
  outputTokens,
  cachedInputTokens,
}) => {
  const cachedInput = Math.min(
    toNonNegativeNumber(cachedInputTokens),
    toNonNegativeNumber(promptTokens),
  );
  const regularInput = toNonNegativeNumber(promptTokens) - cachedInput;
  const output = toNonNegativeNumber(outputTokens);

  return roundUsd(
    (regularInput * AI_PRICES_PER_MILLION_USD.groq.input +
      cachedInput * AI_PRICES_PER_MILLION_USD.groq.cachedInput +
      output * AI_PRICES_PER_MILLION_USD.groq.output) /
      TOKENS_PER_MILLION,
  );
};

module.exports = {
  AI_PRICES_PER_MILLION_USD,
  estimateGeminiCostUsd,
  estimateGroqCostUsd,
};
