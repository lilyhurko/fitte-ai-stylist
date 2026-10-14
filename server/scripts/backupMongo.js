require("dotenv").config({ path: "server/.env" });

const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const {
  createBackupFileName,
  getDatabaseName,
  isExpiredBackup,
} = require("../services/backupService");

const projectRoot = path.resolve(__dirname, "../..");
const backupDirectory = path.resolve(
  process.env.BACKUP_DIRECTORY || path.join(projectRoot, "backups", "mongodb"),
);
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 14);

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

const removeExpiredBackups = async () => {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error(
      "BACKUP_RETENTION_DAYS musi być liczbą całkowitą co najmniej 1",
    );
  }

  const retentionDeadline = new Date(Date.now() - retentionDays * 86_400_000);
  const entries = await fsp.readdir(backupDirectory);

  await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(backupDirectory, entry);
      const stats = await fsp.stat(filePath);

      if (
        stats.isFile() &&
        isExpiredBackup(filePath, stats, retentionDeadline)
      ) {
        await fsp.unlink(filePath);
        console.log(`Usunięto wygasły backup: ${entry}`);
      }
    }),
  );
};

const createBackup = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Brak DATABASE_URL w server/.env");
  }

  const databaseName = getDatabaseName(databaseUrl);
  await fsp.mkdir(backupDirectory, { recursive: true, mode: 0o700 });

  const archiveFileName = createBackupFileName(databaseName);
  const archivePath = path.join(backupDirectory, archiveFileName);

  await run("mongodump", [
    `--uri=${databaseUrl}`,
    `--db=${databaseName}`,
    "--oplog",
    "--gzip",
    `--archive=${archivePath}`,
  ]);

  const archiveStats = await fsp.stat(archivePath);
  const manifest = {
    database: databaseName,
    archiveFile: archiveFileName,
    sha256: await calculateSha256(archivePath),
    sizeBytes: archiveStats.size,
    createdAt: new Date().toISOString(),
    retentionDays,
    restoreCommand:
      "npm run restore:mongodb:test -- ../backups/mongodb/<backup>.archive.gz",
  };

  await fsp.writeFile(
    `${archivePath}.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o600 },
  );
  await removeExpiredBackups();

  console.log(`Backup zapisany: ${archivePath}`);
  console.log(`SHA-256: ${manifest.sha256}`);
};

createBackup().catch((error) => {
  console.error(`Backup MongoDB nieudany: ${error.message}`);
  process.exitCode = 1;
});
