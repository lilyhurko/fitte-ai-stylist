const { z } = require("zod");
const { objectIdSchema } = require("./commonValidators");

const createEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Nazwa wydarzenia jest wymagana")
    .max(120, "Nazwa wydarzenia jest za długa"),

  date: z.string().refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Nieprawidłowa data wydarzenia",
  ),

  occasion: z.enum(
    ["Casual", "Praca", "Randka", "Impreza", "Sport", "Podróż"],
    { error: "Nieprawidłowa okazja" },
  ),

  formality: z.enum(["Casual", "Smart Casual", "Formal"], {
    error: "Nieprawidłowy poziom formalności",
  }),

  outfitIds: z.array(objectIdSchema).max(20).default([]),
});

module.exports = {
  createEventSchema,
};