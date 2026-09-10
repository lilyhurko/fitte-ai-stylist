const {
  PREFERENCE_WEIGHT_CONFIG,
} = require("../config/algorithm");

function roundWeight(value) {
  return Number(value.toFixed(2));
}

function clampPreferenceWeight(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return PREFERENCE_WEIGHT_CONFIG.neutral;
  }

  return Math.min(
    PREFERENCE_WEIGHT_CONFIG.maximum,
    Math.max(PREFERENCE_WEIGHT_CONFIG.minimum, numericValue),
  );
}

function adjustPreferenceWeight(currentWeight, feedback) {
  const parsedWeight = Number(currentWeight);

  const safeCurrentWeight =
    currentWeight !== null &&
    currentWeight !== "" &&
    Number.isFinite(parsedWeight)
      ? parsedWeight
      : PREFERENCE_WEIGHT_CONFIG.neutral;

  let change = 0;

  if (feedback === "LIKE") {
    change = PREFERENCE_WEIGHT_CONFIG.feedbackStep;
  } else if (feedback === "DISLIKE") {
    change = -PREFERENCE_WEIGHT_CONFIG.feedbackStep;
  }

  return clampPreferenceWeight(
    roundWeight(safeCurrentWeight + change),
  );
}

module.exports = {
  roundWeight,
  clampPreferenceWeight,
  adjustPreferenceWeight,
};