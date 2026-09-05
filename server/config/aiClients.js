require("./env");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Groq } = require("groq-sdk");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
  maxRetries: 2,
});

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

module.exports = {
  genAI,
  groq,
  GROQ_MODEL,
};