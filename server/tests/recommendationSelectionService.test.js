const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSelectionSeed,
  selectCandidateFromPool,
} = require("../services/recommendationSelectionService");

test("ten sam seed zawsze wybiera tego samego kandydata", () => {
  const candidates = [
    { id: "outfit-a" },
    { id: "outfit-b" },
    { id: "outfit-c" },
  ];

  const seed = "powtarzalny-seed-testowy";

  const firstSelection = selectCandidateFromPool(candidates, seed);
  const secondSelection = selectCandidateFromPool(candidates, seed);

  assert.deepEqual(secondSelection, firstSelection);
  assert.ok(firstSelection.selectionIndex >= 0);
  assert.ok(firstSelection.selectionIndex < candidates.length);
  assert.equal(
    firstSelection.candidate,
    candidates[firstSelection.selectionIndex],
  );
});

test("pusta pula nie zwraca kandydata", () => {
  const result = selectCandidateFromPool([], "seed");

  assert.deepEqual(result, {
    candidate: null,
    selectionIndex: null,
  });
});

test("generator tworzy różne identyfikatory wyboru", () => {
  const firstSeed = createSelectionSeed();
  const secondSeed = createSelectionSeed();

  assert.notEqual(firstSeed, secondSeed);
  assert.match(
    firstSeed,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});