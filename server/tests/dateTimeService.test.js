const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseEventLocalDateTime,
  getDateKeyInTimezone,
} = require("../services/dateTimeService");

test("interpretuje godzinę wydarzenia w strefie Warszawy", () => {
  const result = parseEventLocalDateTime(
    "2026-09-13T11:23",
    "Europe/Warsaw",
  );

  assert.equal(result.toISOString(), "2026-09-13T09:23:00.000Z");
});

test("uwzględnia zmianę czasu letniego i zimowego", () => {
  const summer = parseEventLocalDateTime(
    "2026-07-10T12:00",
    "Europe/Warsaw",
  );

  const winter = parseEventLocalDateTime(
    "2026-12-10T12:00",
    "Europe/Warsaw",
  );

  assert.equal(summer.toISOString(), "2026-07-10T10:00:00.000Z");
  assert.equal(winter.toISOString(), "2026-12-10T11:00:00.000Z");
});

test("wyznacza lokalny dzień wydarzenia w jego strefie", () => {
  const date = new Date("2026-09-12T22:30:00.000Z");

  assert.equal(
    getDateKeyInTimezone(date, "Europe/Warsaw"),
    "2026-09-13",
  );
});

test("nieprawidłowa data zwraca null", () => {
  assert.equal(
    parseEventLocalDateTime(
      "nieprawidłowa-data",
      "Europe/Warsaw",
    ),
    null,
  );
});