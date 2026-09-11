const { z } = require("zod");

const {
  clothingMaterialSchema,
  clothingSeasonSchema,
  waterResistanceSchema,
  clothingFormalitySchema,
  clothingPatternSchema,
  sleeveLengthSchema,
} = require("./wardrobeValidators");

const clothCategorySchema = z.enum([
  "Góra",
  "Dół",
  "Sukienki",
  "Obuwie",
  "Okrycia wierzchnie",
  "Akcesoria",
  "Torby",
  "Bielizna",
]);

const uniqueArray = (schema, maximum, message) =>
  z
    .array(schema)
    .max(maximum, message)
    .refine(
      (values) => new Set(values).size === values.length,
      "Lista nie może zawierać powtórzeń",
    );

const clothDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nazwa ubrania jest wymagana")
    .max(120, "Nazwa ubrania jest za długa"),

  category: clothCategorySchema,

  style: z
    .string()
    .trim()
    .min(1, "Styl ubrania jest wymagany")
    .max(300, "Nazwa stylu jest za długa"),

  color: z
    .string()
    .trim()
    .min(1, "Kolor ubrania jest wymagany")
    .max(50, "Nazwa koloru jest za długa"),

  materials: uniqueArray(
    clothingMaterialSchema,
    5,
    "Można wybrać maksymalnie pięć materiałów",
  ),

  seasons: uniqueArray(
    clothingSeasonSchema,
    5,
    "Można wybrać maksymalnie pięć sezonów",
  ),

  warmthLevel: z
    .number()
    .int("Poziom ciepła musi być liczbą całkowitą")
    .min(1, "Minimalny poziom ciepła to 1")
    .max(5, "Maksymalny poziom ciepła to 5")
    .nullable(),

  waterResistance: waterResistanceSchema.nullable(),

  formality: clothingFormalitySchema.nullable(),

  pattern: clothingPatternSchema.nullable(),

  sleeveLength: sleeveLengthSchema.nullable(),
});

module.exports = {
  clothCategorySchema,
  clothDraftSchema,
};