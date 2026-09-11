const test = require("node:test");
const assert = require("node:assert/strict");

const {
  scoreItemWeatherFit,
  scoreOutfitWeatherFit,
} = require("../services/weatherScoringService");

test("sandały bez wodoodporności otrzymują karę podczas deszczu", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Lekkie sandały",
      waterResistance: "NONE",
      materials: [],
      seasons: ["SUMMER"],
    },
    "Rain",
  );

  assert.equal(result.score, -40);
  assert.ok(
    result.reasons.some(
      (reason) => reason.code === "open-shoes-in-rain",
    ),
  );
});

test("ciemne zimowe ubranie z wełny otrzymuje dużą karę podczas upału", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Czarny wełniany płaszcz",
      color: "czarny",
      materials: ["WOOL"],
      seasons: ["WINTER"],
      warmthLevel: 5,
    },
    "Hot",
  );

  assert.equal(result.score, -88);
});

test("lekka letnia sukienka jest karana podczas zimna bez twardego weta", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Lekka letnia sukienka",
      category: "Sukienki",
      materials: [],
      seasons: ["SUMMER"],
      warmthLevel: 1,
    },
    "Cold",
  );

  assert.equal(result.score, -53);
  assert.ok(result.score > -999);
});

test("ciepłe zimowe ubranie z wełny otrzymuje premię podczas zimna", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Wełniany płaszcz",
      materials: ["WOOL"],
      seasons: ["WINTER"],
      warmthLevel: 5,
    },
    "Cold",
  );

  assert.equal(result.score, 32);
});

test("brak właściwości pogodowych nie powoduje kary", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Zwykłe ubranie",
      materials: [],
      seasons: [],
    },
    "Hot",
  );

  assert.equal(result.score, 0);
  assert.deepEqual(result.reasons, []);
});

test("bezchmurna pogoda nie zmienia wyniku", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Wełniany płaszcz",
      materials: ["WOOL"],
      seasons: ["WINTER"],
      warmthLevel: 5,
    },
    "Clear",
  );

  assert.equal(result.score, 0);
});

test("łączna kara zestawu jest ograniczona do bezpiecznego zakresu", () => {
  const badHotWeatherItem = {
    name: "Czarny wełniany płaszcz",
    color: "czarny",
    materials: ["WOOL"],
    seasons: ["WINTER"],
    warmthLevel: 5,
  };

  const result = scoreOutfitWeatherFit(
    [
      { ...badHotWeatherItem, id: "1" },
      { ...badHotWeatherItem, id: "2" },
      { ...badHotWeatherItem, id: "3" },
    ],
    "Hot",
  );

  assert.equal(result.rawScore, -264);
  assert.equal(result.score, -90);
});

test("śnieg ma inne reguły niż deszcz", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Zamszowe sandały",
      materials: ["SUEDE"],
      seasons: ["SUMMER"],
      waterResistance: "NONE",
    },
    {
      conditions: ["Snow"],
      temperatureC: -2,
      apparentTemperatureC: -6,
      precipitationMm: 3,
      rainMm: 0,
      snowfallCm: 1.5,
      windSpeedKmh: 10,
    },
  );

  assert.equal(result.score, -65);
  assert.ok(
    result.reasons.some(
      (reason) => reason.code === "open-shoes-in-snow",
    ),
  );
  assert.equal(
    result.reasons.some(
      (reason) => reason.code === "open-shoes-in-rain",
    ),
    false,
  );
});

test("wysokość temperatury zwiększa karę podczas silnego upału", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Ciepła bluza",
      materials: [],
      seasons: [],
      warmthLevel: 5,
    },
    {
      conditions: ["Hot"],
      temperatureC: 35,
      apparentTemperatureC: 34,
      precipitationMm: 0,
      rainMm: 0,
      snowfallCm: 0,
      windSpeedKmh: 5,
    },
  );

  assert.equal(result.score, -52);
  assert.ok(
    result.reasons.some(
      (reason) => reason.code === "high-heat-intensity",
    ),
  );
});

test("intensywny deszcz zwiększa znaczenie wodoodporności", () => {
  const unprotected = scoreItemWeatherFit(
    {
      name: "Zwykła kurtka",
      materials: [],
      seasons: [],
      waterResistance: "NONE",
    },
    {
      conditions: ["Rain"],
      precipitationMm: 7,
    },
  );

  const waterproof = scoreItemWeatherFit(
    {
      name: "Kurtka przeciwdeszczowa",
      materials: [],
      seasons: [],
      waterResistance: "WATERPROOF",
    },
    {
      conditions: ["Rain"],
      precipitationMm: 7,
    },
  );

  assert.equal(unprotected.score, -20);
  assert.equal(waterproof.score, 23);
  assert.ok(waterproof.score > unprotected.score);
});

test("lekki element otrzymuje większą karę podczas bardzo silnego wiatru", () => {
  const result = scoreItemWeatherFit(
    {
      name: "Lekka kurtka",
      category: "Okrycia wierzchnie",
      materials: [],
      seasons: [],
      warmthLevel: 1,
    },
    {
      conditions: ["Windy"],
      windSpeedKmh: 55,
    },
  );

  assert.equal(result.score, -14);
  assert.ok(
    result.reasons.some(
      (reason) => reason.code === "strong-wind-light-item",
    ),
  );
});
