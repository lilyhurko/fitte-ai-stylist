const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "../..");
const label = "com.fitte.mongodb-backup";
const launchAgentsDirectory = path.join(
  os.homedir(),
  "Library",
  "LaunchAgents",
);
const plistPath = path.join(launchAgentsDirectory, `${label}.plist`);
const backupScriptPath = path.join(
  projectRoot,
  "server",
  "scripts",
  "backupMongo.js",
);
const logDirectory = path.join(projectRoot, "backups", "mongodb", "logs");
const hour = Number(process.env.BACKUP_SCHEDULE_HOUR || 3);
const minute = Number(process.env.BACKUP_SCHEDULE_MINUTE || 15);

const ensureScheduleTimeIsValid = () => {
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      "BACKUP_SCHEDULE_HOUR i BACKUP_SCHEDULE_MINUTE muszą określać prawidłową godzinę",
    );
  }
};

const runLaunchctl = (argumentsList, { ignoreFailure = false } = {}) => {
  const result = spawnSync("launchctl", argumentsList, { encoding: "utf8" });

  if (result.error) throw result.error;
  if (result.status !== 0 && !ignoreFailure) {
    throw new Error(
      result.stderr.trim() || "Nie udało się skonfigurować launchd",
    );
  }
};

const createPlist = () => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${backupScriptPath}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${projectRoot}</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${hour}</integer>
    <key>Minute</key>
    <integer>${minute}</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${path.join(logDirectory, "backup.log")}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(logDirectory, "backup-error.log")}</string>
</dict>
</plist>
`;

const installSchedule = async () => {
  ensureScheduleTimeIsValid();
  await fs.mkdir(launchAgentsDirectory, { recursive: true });
  await fs.mkdir(logDirectory, { recursive: true, mode: 0o700 });
  await fs.writeFile(plistPath, createPlist(), { mode: 0o600 });

  const userDomain = `gui/${process.getuid()}`;
  runLaunchctl(["bootout", userDomain, plistPath], { ignoreFailure: true });
  runLaunchctl(["bootstrap", userDomain, plistPath]);
  runLaunchctl(["enable", `${userDomain}/${label}`]);

  console.log(
    `Codzienny backup MongoDB ustawiony na ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}.`,
  );
  console.log(`Konfiguracja: ${plistPath}`);
};

installSchedule().catch((error) => {
  console.error(`Nie udało się ustawić harmonogramu backupu: ${error.message}`);
  process.exitCode = 1;
});
