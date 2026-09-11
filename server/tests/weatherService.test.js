const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createWeatherContext,
} = require("../services/weatherService");

test("spokojna pogoda zwraca warunek Clear", () => {
  const result = createWeatherContext({
    temperatureC: 18,
    apparentTemperatureC: 17,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 10,
  });

  assert.deepEqual(result.conditions, ["Clear"]);
});

test("deszcz i niska temperatura są rozpoznawane jednocześnie", () => {
  const result = createWeatherContext({
    temperatureC: 7,
    apparentTemperatureC: 5,
    precipitationMm: 2.4,
    rainMm: 2.4,
    snowfallCm: 0,
    windSpeedKmh: 12,
  });

  assert.deepEqual(result.conditions, ["Rain", "Cold"]);
});

test("śnieg ma pierwszeństwo przed deszczem", () => {
  const result = createWeatherContext({
    temperatureC: -2,
    apparentTemperatureC: -7,
    precipitationMm: 3,
    rainMm: 0.4,
    snowfallCm: 1.2,
    windSpeedKmh: 36,
  });

  assert.deepEqual(result.conditions, [
    "Snow",
    "Cold",
    "Windy",
  ]);
  assert.equal(result.conditions.includes("Rain"), false);
});

test("temperatura odczuwalna może uruchomić warunek Hot", () => {
  const result = createWeatherContext({
    temperatureC: 22,
    apparentTemperatureC: 26,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 5,
  });

  assert.deepEqual(result.conditions, ["Hot"]);
});

test("silny wiatr jest rozpoznawany niezależnie", () => {
  const result = createWeatherContext({
    temperatureC: 17,
    apparentTemperatureC: 15,
    precipitationMm: 0,
    rainMm: 0,
    snowfallCm: 0,
    windSpeedKmh: 35,
  });

  assert.deepEqual(result.conditions, ["Windy"]);
});

test("brak danych nie jest błędnie klasyfikowany jako zimno", () => {
  const result = createWeatherContext({});

  assert.deepEqual(result.conditions, ["Clear"]);
  assert.equal(result.temperatureC, null);
  assert.equal(result.apparentTemperatureC, null);
  assert.equal(result.precipitationMm, 0);
  assert.equal(result.windSpeedKmh, 0);
});