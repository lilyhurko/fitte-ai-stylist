const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hasValidCoordinates,
  resolveEventWeatherLocation,
  createLocationKey,
} = require("../services/locationService");

test("akceptuje poprawne współrzędne geograficzne", () => {
  assert.equal(hasValidCoordinates(52.23, 21.01), true);
});

test("odrzuca współrzędne spoza dozwolonego zakresu", () => {
  assert.equal(hasValidCoordinates(91, 21.01), false);
  assert.equal(hasValidCoordinates(52.23, 181), false);
});

test("lokalizacja wydarzenia ma pierwszeństwo przed lokalizacją użytkownika", () => {
  const result = resolveEventWeatherLocation(
    {
      latitude: 50.06,
      longitude: 19.94,
      locationName: "Kraków",
      timezone: "Europe/Warsaw",
    },
    {
      defaultLatitude: 52.23,
      defaultLongitude: 21.01,
      defaultLocationName: "Warszawa",
      defaultTimezone: "Europe/Kyiv",
    },
  );

  assert.deepEqual(result, {
    latitude: 50.06,
    longitude: 19.94,
    name: "Kraków",
    timezone: "Europe/Warsaw",
    source: "EVENT",
  });
});

test("korzysta z lokalizacji użytkownika, gdy wydarzenie jej nie posiada", () => {
  const result = resolveEventWeatherLocation(
    {},
    {
      defaultLatitude: 52.23,
      defaultLongitude: 21.01,
      defaultLocationName: "Warszawa",
      defaultTimezone: "Europe/Warsaw",
    },
  );

  assert.deepEqual(result, {
    latitude: 52.23,
    longitude: 21.01,
    name: "Warszawa",
    timezone: "Europe/Warsaw",
    source: "USER",
  });
});

test("zwraca null, gdy żadna lokalizacja nie jest dostępna", () => {
  assert.equal(resolveEventWeatherLocation({}, {}), null);
});

test("tworzy stabilny klucz dla tych samych współrzędnych", () => {
  assert.equal(
    createLocationKey({
      latitude: 52.229676,
      longitude: 21.012229,
    }),
    "52.2297,21.0122",
  );
});
