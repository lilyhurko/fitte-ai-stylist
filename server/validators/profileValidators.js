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

const deleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .max(128, "Hasło jest za długie"),

  confirmation: z.literal("USUŃ KONTO", {
    error: "Wpisz dokładnie: USUŃ KONTO",
  }),
});

module.exports = {
  updateProfileSchema,
  deleteAccountSchema,
};
