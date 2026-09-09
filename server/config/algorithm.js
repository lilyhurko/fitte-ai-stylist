const FITTE_ALGORITHM_VERSION = "fitte-v1.1-explainable";
const FITTE_EXPLANATION_PROMPT_VERSION = "fitte-explanation-v1";

const FITTE_EXPLANATION_CONFIG = Object.freeze({
  temperature: 0.2,
  reasoningEffort: "low",
  maxCompletionTokens: 256,
});

module.exports = {
  FITTE_ALGORITHM_VERSION,
  FITTE_EXPLANATION_PROMPT_VERSION,
  FITTE_EXPLANATION_CONFIG,
};