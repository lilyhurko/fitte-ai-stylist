const { z } = require("zod");

const clothingMaterialSchema = z.enum([
  "COTTON",
  "LINEN",
  "WOOL",
  "CASHMERE",
  "SILK",
  "VISCOSE",
  "POLYESTER",
  "POLYAMIDE",
  "ELASTANE",
  "ACRYLIC",
  "DENIM",
  "LEATHER",
  "SUEDE",
  "OTHER",
]);

const clothingSeasonSchema = z.enum([
  "SPRING",
  "SUMMER",
  "AUTUMN",
  "WINTER",
  "ALL_SEASON",
]);

const waterResistanceSchema = z.enum([
  "NONE",
  "WATER_REPELLENT",
  "WATERPROOF",
]);

const clothingFormalitySchema = z.enum([
  "VERY_CASUAL",
  "CASUAL",
  "SMART_CASUAL",
  "BUSINESS",
  "FORMAL",
]);

const clothingPatternSchema = z.enum([
  "SOLID",
  "STRIPED",
  "CHECKERED",
  "FLORAL",
  "POLKA_DOT",
  "ANIMAL_PRINT",
  "GEOMETRIC",
  "ABSTRACT",
  "LOGO",
  "OTHER",
]);

const sleeveLengthSchema = z.enum([
  "SLEEVELESS",
  "SHORT",
  "THREE_QUARTER",
  "LONG",
  "NOT_APPLICABLE",
]);

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

    materials: z.array(clothingMaterialSchema).max(5).optional(),

    seasons: z.array(clothingSeasonSchema).max(5).optional(),

    warmthLevel: z
      .number()
      .int("Poziom ciepła musi być liczbą całkowitą")
      .min(1, "Minimalny poziom ciepła to 1")
      .max(5, "Maksymalny poziom ciepła to 5")
      .nullable()
      .optional(),

    waterResistance: waterResistanceSchema.nullable().optional(),

    formality: clothingFormalitySchema.nullable().optional(),

    pattern: clothingPatternSchema.nullable().optional(),

    sleeveLength: sleeveLengthSchema.nullable().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Brak danych do aktualizacji",
  );

module.exports = {
  clothingMaterialSchema,
  clothingSeasonSchema,
  waterResistanceSchema,
  clothingFormalitySchema,
  clothingPatternSchema,
  sleeveLengthSchema,
  updateClothSchema,
};