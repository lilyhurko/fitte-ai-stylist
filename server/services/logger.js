const writeLog = (level, event, metadata = {}) => {
  const method = ["error", "warn", "info"].includes(level) ? level : "log";

  console[method](
    JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      event,
      ...metadata,
    }),
  );
};

module.exports = {
  writeLog,
};