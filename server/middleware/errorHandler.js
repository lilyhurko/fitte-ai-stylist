const multer = require("multer");
const { writeLog } = require("../services/logger");

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let publicMessage = error.publicMessage;

  if (error instanceof multer.MulterError) {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    publicMessage =
      error.code === "LIMIT_FILE_SIZE"
        ? "Plik przekracza maksymalny rozmiar 15 MB."
        : "Nie udało się przesłać pliku.";
  }

  if (!publicMessage) {
    publicMessage =
      statusCode >= 500
        ? "Wystąpił wewnętrzny błąd serwera."
        : "Nie udało się wykonać żądania.";
  }

  writeLog("error", "request_failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorName: error.name,
    errorCode: error.code || null,
  });

  res.status(statusCode).json({
    error: publicMessage,
    requestId: req.requestId,
  });
};

module.exports = {
  errorHandler,
};