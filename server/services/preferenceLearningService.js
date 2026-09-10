const {
  PREFERENCE_WEIGHT_CONFIG,
} = require("../config/algorithm");

function roundWeight(value) {
  return Number(
    value.toFixed(PREFERENCE_WEIGHT_CONFIG.decimalPlaces),
  );
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

function decayPreferenceWeight(currentWeight) {
  const safeCurrentWeight = clampPreferenceWeight(currentWeight);

  const decayedWeight =
    PREFERENCE_WEIGHT_CONFIG.neutral +
    (safeCurrentWeight - PREFERENCE_WEIGHT_CONFIG.neutral) *
      (1 - PREFERENCE_WEIGHT_CONFIG.decayRate);

  if (
    Math.abs(
      decayedWeight - PREFERENCE_WEIGHT_CONFIG.neutral,
    ) <= PREFERENCE_WEIGHT_CONFIG.neutralSnapThreshold
  ) {
    return PREFERENCE_WEIGHT_CONFIG.neutral;
  }

  return clampPreferenceWeight(roundWeight(decayedWeight));
}

function decayPreferenceWeights(weights) {
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(weights).map(([name, weight]) => [
      name,
      decayPreferenceWeight(weight),
    ]),
  );
}

module.exports = {
  roundWeight,
  clampPreferenceWeight,
  adjustPreferenceWeight,
  decayPreferenceWeight,
  decayPreferenceWeights,
};