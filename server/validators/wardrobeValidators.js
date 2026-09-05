const { z } = require("zod");

const updateClothSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),

    category: z
      .enum([
        "Góra",
        "Dół",
        "Sukienki",
        "Obuwie",
        "Okrycia wierzchnie",
        "Akcesoria",
        "Torby",
        "Bielizna",
      ])
      .optional(),

    style: z.string().trim().min(1).max(300).optional(),
    color: z.string().trim().min(1).max(50).optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Brak danych do aktualizacji",
  );

module.exports = {
  updateClothSchema,
};