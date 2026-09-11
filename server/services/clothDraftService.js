const EDITABLE_CLOTH_FIELDS = Object.freeze([
  "name",
  "category",
  "style",
  "color",
  "materials",
  "seasons",
  "warmthLevel",
  "waterResistance",
  "formality",
  "pattern",
  "sleeveLength",
]);

function normalizeComparisonValue(value) {
  if (Array.isArray(value)) {
    return [...value].sort();
  }

  return value ?? null;
}

function getCorrectedFields(aiAnalysis, confirmedData) {
  const original = aiAnalysis || {};
  const confirmed = confirmedData || {};

  return EDITABLE_CLOTH_FIELDS.filter((field) => {
    const originalValue = normalizeComparisonValue(
      original[field],
    );

    const confirmedValue = normalizeComparisonValue(
      confirmed[field],
    );

    return (
      JSON.stringify(originalValue) !==
      JSON.stringify(confirmedValue)
    );
  });
}

function isDraftExpired(expiresAt, now = new Date()) {
  const expirationTime = new Date(expiresAt).getTime();
  const currentTime = new Date(now).getTime();

  if (
    Number.isNaN(expirationTime) ||
    Number.isNaN(currentTime)
  ) {
    return true;
  }

  return expirationTime <= currentTime;
}

module.exports = {
  EDITABLE_CLOTH_FIELDS,
  getCorrectedFields,
  isDraftExpired,
};