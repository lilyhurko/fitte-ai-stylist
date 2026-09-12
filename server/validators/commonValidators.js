const { z } = require("zod");

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Nieprawidłowy identyfikator");

const optionalLocationNameSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .string()
    .trim()
    .min(2, "Nazwa lokalizacji musi mieć minimum 2 znaki")
    .max(120, "Nazwa lokalizacji jest za długa")
    .optional(),
);

const optionalLatitudeSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce
    .number()
    .min(-90, "Szerokość geograficzna nie może być mniejsza niż -90")
    .max(90, "Szerokość geograficzna nie może być większa niż 90")
    .optional(),
);

const optionalLongitudeSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce
    .number()
    .min(-180, "Długość geograficzna nie może być mniejsza niż -180")
    .max(180, "Długość geograficzna nie może być większa niż 180")
    .optional(),
);

module.exports = {
  objectIdSchema,
  optionalLocationNameSchema,
  optionalLatitudeSchema,
  optionalLongitudeSchema,
};