const { z } = require("zod");
const {
  objectIdSchema,
  optionalLocationNameSchema,
  optionalLatitudeSchema,
  optionalLongitudeSchema,
} = require("./commonValidators");

const createEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Nazwa wydarzenia jest wymagana")
      .max(120, "Nazwa wydarzenia jest za długa"),

    date: z
      .string()
      .refine(
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
    locationName: optionalLocationNameSchema,
    latitude: optionalLatitudeSchema,
    longitude: optionalLongitudeSchema,
    outfitIds: z.array(objectIdSchema).max(20).default([]),
  })
  .superRefine((data, ctx) => {
    const hasLatitude = data.latitude !== undefined;
    const hasLongitude = data.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Szerokość i długość geograficzna muszą zostać podane razem",
        path: hasLatitude ? ["longitude"] : ["latitude"],
      });
    }
  });

module.exports = {
  createEventSchema,
};
