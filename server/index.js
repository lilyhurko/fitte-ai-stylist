require("./config/env");

const { app } = require("./app");
const { writeLog } = require("./services/logger");

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  writeLog("info", "server_started", {
    port: Number(PORT),
  });
});
