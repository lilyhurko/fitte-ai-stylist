const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const serverDirectory = path.resolve(__dirname, "../..");
const productionEnvPath = path.join(serverDirectory, ".env");
const testEnvPath = path.join(serverDirectory, ".env.test.local");

const productionEnvironment = dotenv.parse(fs.readFileSync(productionEnvPath));

const productionDatabaseUrl = productionEnvironment.DATABASE_URL;

dotenv.config({
  path: productionEnvPath,
});

dotenv.config({
  path: testEnvPath,
  override: true,
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("Brak TEST_DATABASE_URL w server/.env.test.local");
}

if (testDatabaseUrl === productionDatabaseUrl) {
  throw new Error("Testowa baza nie może być bazą produkcyjną");
}

if (!testDatabaseUrl.includes("/fitte-test")) {
  throw new Error("TEST_DATABASE_URL musi wskazywać bazę fitte-test");
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET =
  process.env.TEST_JWT_SECRET || "fitte-integration-test-secret";
process.env.NODE_ENV = "test";

module.exports = {
  testDatabaseUrl,
};
