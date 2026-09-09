const crypto = require("node:crypto");

function createSelectionSeed() {
  return crypto.randomUUID();
}

function selectCandidateFromPool(candidates, seed) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      candidate: null,
      selectionIndex: null,
    };
  }

  const normalizedSeed = String(seed);
  const hash = crypto
    .createHash("sha256")
    .update(normalizedSeed)
    .digest();

  const selectionIndex = hash.readUInt32BE(0) % candidates.length;

  return {
    candidate: candidates[selectionIndex],
    selectionIndex,
  };
}

module.exports = {
  createSelectionSeed,
  selectCandidateFromPool,
};