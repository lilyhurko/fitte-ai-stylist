require("./tests/helpers/testEnvironment");
process.env.E2E_MODE = "true";
process.env.ALLOWED_ORIGINS =
  "http://127.0.0.1:5173";
const { app } = require("./app");
const { writeLog } = require("./services/logger");

const PORT = 5001;

app.listen(PORT, "127.0.0.1", () => {
  writeLog("info", "e2e_server_started", {
    port: PORT,
    database: "fitte-test",
  });
});