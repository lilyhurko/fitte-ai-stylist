require("dotenv").config({ path: "server/.env" });
require("dotenv").config({ path: "server/.env.test.local", override: true });

const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { getDatabaseName } = require("../services/backupService");

const archiveArgument = process.argv[2];

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      return reject(
        new Error(`${command} zakończył działanie z kodem ${code}`),
      );
    });
  });

const calculateSha256 = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const restoreToTestDatabase = async () => {
  if (!archiveArgument) {
    throw new Error("Podaj ścieżkę do archiwum backupu jako pierwszy argument");
  }

  const archivePath = path.resolve(process.cwd(), archiveArgument);
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  const productionDatabaseUrl = process.env.DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error("Brak TEST_DATABASE_URL w server/.env.test.local");
  }

  if (testDatabaseUrl === productionDatabaseUrl) {
    throw new Error("Odtworzenie do produkcyjnej bazy jest zablokowane");
  }

  await fsp.access(archivePath);
  const manifestPath = `${archivePath}.json`;

  let manifest;
  try {
    manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
    const checksum = await calculateSha256(archivePath);
    if (manifest.sha256 !== checksum) {
      throw new Error("Suma SHA-256 archiwum nie odpowiada manifestowi");
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Brak manifestu backupu; odtworzenie jest zablokowane");
    }
    throw error;
  }

  const targetDatabaseName = getDatabaseName(testDatabaseUrl);
  if (!manifest.database) {
    throw new Error("Manifest nie zawiera nazwy źródłowej bazy danych");
  }

  await run("mongorestore", [
    `--uri=${testDatabaseUrl}`,
    `--nsInclude=${manifest.database}.*`,
    `--nsFrom=${manifest.database}.*`,
    `--nsTo=${targetDatabaseName}.*`,
    "--drop",
    "--gzip",
    `--archive=${archivePath}`,
  ]);

  console.log(`Backup odtworzono do testowej bazy: ${targetDatabaseName}`);
};

restoreToTestDatabase().catch((error) => {
  console.error(`Odtworzenie MongoDB nieudane: ${error.message}`);
  process.exitCode = 1;
});
