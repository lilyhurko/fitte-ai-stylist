const fs = require("node:fs");
const path = require("node:path");

const v27 = require("../../docs/v2.7-results-100-runs.json");
const v28 = require("../../docs/v2.8-results-100-runs.json");

const round = (value) => Number(value.toFixed(2));

const average = (values) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) /
      values.length;

const pairedRuns = [];

for (const v27Scenario of v27.results) {
  const v28Scenario = v28.results.find(
    (scenario) => scenario.scenario === v27Scenario.scenario,
  );

  if (!v28Scenario) {
    throw new Error(
      `Brak scenariusza ${v27Scenario.scenario} w wynikach v2.8`,
    );
  }

  for (const v27Run of v27Scenario.runs) {
    const v28Run = v28Scenario.runs.find(
      (run) => run.selectionSeed === v27Run.selectionSeed,
    );

    if (!v28Run) {
      throw new Error(
        `Brak seeda ${v27Run.selectionSeed} w wynikach v2.8`,
      );
    }

    pairedRuns.push({
      scenario: v27Scenario.scenario,
      selectionSeed: v27Run.selectionSeed,
      v27WeatherScore: v27Run.weatherScore,
      v28WeatherScore: v28Run.weatherScore,
      weatherScoreDelta:
        v28Run.weatherScore - v27Run.weatherScore,
      v27QualityLoss: v27Run.qualityLoss,
      v28QualityLoss: v28Run.qualityLoss,
      qualityLossDelta:
        v28Run.qualityLoss - v27Run.qualityLoss,
    });
  }
}

const severeThreshold = -60;

const summary = {
  comparedRuns: pairedRuns.length,

  improvedWeatherRuns: pairedRuns.filter(
    (run) => run.weatherScoreDelta > 0,
  ).length,

  unchangedWeatherRuns: pairedRuns.filter(
    (run) => run.weatherScoreDelta === 0,
  ).length,

  worsenedWeatherRuns: pairedRuns.filter(
    (run) => run.weatherScoreDelta < 0,
  ).length,

  severeWeatherSelectionsV27: pairedRuns.filter(
    (run) => run.v27WeatherScore <= severeThreshold,
  ).length,

  severeWeatherSelectionsV28: pairedRuns.filter(
    (run) => run.v28WeatherScore <= severeThreshold,
  ).length,

  averageWeatherScoreV27: round(
    average(pairedRuns.map((run) => run.v27WeatherScore)),
  ),

  averageWeatherScoreV28: round(
    average(pairedRuns.map((run) => run.v28WeatherScore)),
  ),

  averageWeatherScoreDelta: round(
    average(pairedRuns.map((run) => run.weatherScoreDelta)),
  ),

  averageQualityLossV27: v27.summary.averageQualityLoss,
  averageQualityLossV28: v28.summary.averageQualityLoss,

  qualityLossReductionPercent: round(
    ((v27.summary.averageQualityLoss -
      v28.summary.averageQualityLoss) /
      v27.summary.averageQualityLoss) *
      100,
  ),

  uniqueResultsV27: v27.summary.totalUniqueResults,
  uniqueResultsV28: v28.summary.totalUniqueResults,

  recentWindowRepeatRateV27:
    v27.summary.recentWindowRepeatRate,

  recentWindowRepeatRateV28:
    v28.summary.recentWindowRepeatRate,

  consecutiveRepeatRateV27:
    v27.summary.consecutiveRepeatRate,

  consecutiveRepeatRateV28:
    v28.summary.consecutiveRepeatRate,
};

const scenarioComparison = v27.results.map((v27Scenario) => {
  const v28Scenario = v28.results.find(
    (scenario) => scenario.scenario === v27Scenario.scenario,
  );

  return {
    scenario: v27Scenario.scenario,
    uniqueResultsV27: v27Scenario.uniqueResults,
    uniqueResultsV28: v28Scenario.uniqueResults,
    minimumWeatherScoreV27:
      v27Scenario.minimumWeatherScore,
    minimumWeatherScoreV28:
      v28Scenario.minimumWeatherScore,
    averageWeatherScoreV27:
      v27Scenario.averageWeatherScore,
    averageWeatherScoreV28:
      v28Scenario.averageWeatherScore,
    averageQualityLossV27:
      v27Scenario.averageQualityLoss,
    averageQualityLossV28:
      v28Scenario.averageQualityLoss,
    recentRepeatRateV27:
      v27Scenario.recentWindowRepeatRate,
    recentRepeatRateV28:
      v28Scenario.recentWindowRepeatRate,
  };
});

const report = {
  experiment: "fitte-v2.7-vs-v2.8-paired-ablation",
  generatedAt: new Date().toISOString(),
  severeWeatherThreshold: severeThreshold,
  summary,
  scenarioComparison,
};

const outputPath = path.resolve(
  __dirname,
  "../../docs/v2.7-vs-v2.8-comparison.json",
);

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(`Zapisano porównanie: ${outputPath}`);
console.log("Podsumowanie:", summary);
console.table(scenarioComparison);