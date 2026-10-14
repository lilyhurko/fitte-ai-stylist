const path = require("path");

const getDatabaseName = (databaseUrl) => {
  const parsedUrl = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));

  if (!databaseName) {
    throw new Error("DATABASE_URL musi zawierać nazwę bazy danych");
  }

  return databaseName;
};

const createBackupFileName = (databaseName, createdAt = new Date()) => {
  const timestamp = createdAt.toISOString().replace(/[:.]/g, "-");
  return `${databaseName}-${timestamp}.archive.gz`;
};

const isManagedBackupFile = (fileName) =>
  fileName.endsWith(".archive.gz") || fileName.endsWith(".archive.gz.json");

const isExpiredBackup = (filePath, stats, retentionDeadline) =>
  isManagedBackupFile(path.basename(filePath)) &&
  stats.mtime < retentionDeadline;

module.exports = {
  createBackupFileName,
  getDatabaseName,
  isExpiredBackup,
  isManagedBackupFile,
};
