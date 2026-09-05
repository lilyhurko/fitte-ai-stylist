const { z } = require("zod");
const { emailSchema } = require("./authValidators");

const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Imię musi mieć minimum 2 znaki")
    .max(80, "Imię jest za długie"),

  email: emailSchema,

  gender: z.enum(["Kobieta", "Mężczyzna", "Inna"], {
    error: "Nieprawidłowa wartość płci",
  }),
});

module.exports = {
  updateProfileSchema,
};