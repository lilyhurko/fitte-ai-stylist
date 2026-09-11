const FITTE_ALGORITHM_VERSION =
  "fitte-v2.6-attribute-weather-scoring";
  const FITTE_EXPLANATION_PROMPT_VERSION = "fitte-explanation-v1";

const FITTE_EXPLANATION_CONFIG = Object.freeze({
  temperature: 0.2,
  reasoningEffort: "low",
  maxCompletionTokens: 256,
});

const RECENT_RECOMMENDATION_LIMIT = 3;
const QUALITY_POOL_MAX_SCORE_GAP = 20;

const PREFERENCE_WEIGHT_CONFIG = Object.freeze({
  minimum: 0.5,
  neutral: 1.0,
  maximum: 1.5,
  feedbackStep: 0.1,
  decayRate: 0.05,
  neutralSnapThreshold: 0.001,
  decimalPlaces: 4,
});

const REPETITION_PENALTIES = Object.freeze({
  identicalOutfit: 40,
  reusedItemByRecency: Object.freeze([12, 8, 4]),
});

module.exports = {
  FITTE_ALGORITHM_VERSION,
  FITTE_EXPLANATION_PROMPT_VERSION,
  FITTE_EXPLANATION_CONFIG,
  RECENT_RECOMMENDATION_LIMIT,
  REPETITION_PENALTIES,
  QUALITY_POOL_MAX_SCORE_GAP,
  PREFERENCE_WEIGHT_CONFIG,
};
