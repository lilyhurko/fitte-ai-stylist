const { z } = require("zod");

const capsuleQuerySchema = z.object({
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

const tripCapsuleSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1, "Podaj nazwę miasta")
    .max(100, "Nazwa miasta jest za długa"),

  days: z.coerce
    .number()
    .int("Liczba dni musi być całkowita")
    .min(1, "Podaj minimum jeden dzień")
    .max(16, "Możesz wygenerować kapsułę maksymalnie na 16 dni"),
});

module.exports = {
  capsuleQuerySchema,
  tripCapsuleSchema,
};