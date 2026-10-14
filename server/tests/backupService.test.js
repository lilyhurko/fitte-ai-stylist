const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createBackupFileName,
  getDatabaseName,
  isExpiredBackup,
  isManagedBackupFile,
} = require("../services/backupService");

test("odczytuje nazwę bazy z adresu MongoDB Atlas", () => {
  assert.equal(
    getDatabaseName(
      "mongodb+srv://user:password@cluster.example/fitte-db?retryWrites=true",
    ),
    "fitte-db",
  );
});

test("odrzuca adres bez nazwy bazy", () => {
  assert.throws(
    () => getDatabaseName("mongodb+srv://user:password@cluster.example/"),
    /nazwę bazy danych/,
  );
});

test("tworzy przewidywalną nazwę archiwum backupu", () => {
  assert.equal(
    createBackupFileName("fitte-db", new Date("2026-10-14T17:15:20.000Z")),
    "fitte-db-2026-10-14T17-15-20-000Z.archive.gz",
  );
});

test("czyści wyłącznie stare pliki zarządzane przez backup", () => {
  const oldStats = { mtime: new Date("2026-10-01T00:00:00.000Z") };
  const deadline = new Date("2026-10-10T00:00:00.000Z");

  assert.equal(isManagedBackupFile("fitte.archive.gz"), true);
  assert.equal(isManagedBackupFile("notes.txt"), false);
  assert.equal(
    isExpiredBackup("/tmp/fitte.archive.gz", oldStats, deadline),
    true,
  );
  assert.equal(isExpiredBackup("/tmp/notes.txt", oldStats, deadline), false);
});
