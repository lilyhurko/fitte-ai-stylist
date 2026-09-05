require("dotenv").config();

const { writeLog } = require("../services/logger");

const requiredEnvironment = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  AI_SERVICE_TOKEN: process.env.AI_SERVICE_TOKEN,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY:
    process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET:
    process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET,
};

const missingEnvironment = Object.entries(requiredEnvironment)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

if (missingEnvironment.length > 0) {
  writeLog("error", "missing_environment_variables", {
    variables: missingEnvironment,
  });

  process.exit(1);
}

module.exports = {
  requiredEnvironment,
};