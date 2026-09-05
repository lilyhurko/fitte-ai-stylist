const { rateLimit } = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: "Zbyt wiele prób. Spróbuj ponownie za 15 minut.",
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Zbyt wiele przesłanych zdjęć. Spróbuj ponownie za minutę.",
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Zbyt wiele zapytań do AI. Spróbuj ponownie za minutę.",
  },
});

module.exports = {
  authLimiter,
  uploadLimiter,
  aiLimiter,
};