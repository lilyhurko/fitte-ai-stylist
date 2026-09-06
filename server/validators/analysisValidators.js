const { z } = require("zod");
const { objectIdSchema } = require("./commonValidators");

const analyzeSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Zapytanie jest za krótkie")
    .max(2000, "Zapytanie jest za długie"),

  latitude: z.coerce
    .number()
    .min(-90, "Nieprawidłowa szerokość geograficzna")
    .max(90, "Nieprawidłowa szerokość geograficzna")
    .default(51.2465),

  longitude: z.coerce
    .number()
    .min(-180, "Nieprawidłowa długość geograficzna")
    .max(180, "Nieprawidłowa długość geograficzna")
    .default(22.5684),
});

const analysisFeedbackSchema = z.object({
  modelType: z.enum(["gemini", "groq"], {
    error: "Nieprawidłowy typ modelu",
  }),
  feedback: z.enum(["LIKE", "DISLIKE"], {
    error: "Nieprawidłowa wartość feedbacku",
  }),
});

const recommendationFeedbackSchema = z.object({
  feedback: z.enum(["LIKE", "DISLIKE"], {
    error: "Nieprawidłowa wartość feedbacku",
  }),
  analysisId: objectIdSchema.optional(),
});

module.exports = {
  analyzeSchema,
  analysisFeedbackSchema,
  recommendationFeedbackSchema,
};
