const { z } = require("zod");
const { emailSchema } = require("./authValidators");
const {
  optionalLocationNameSchema,
  optionalLatitudeSchema,
  optionalLongitudeSchema,
} = require("./commonValidators");

const updateProfileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "Imię musi mieć minimum 2 znaki")
      .max(80, "Imię jest za długie"),

    email: emailSchema,

    gender: z.enum(["Kobieta", "Mężczyzna", "Inna"], {
      error: "Nieprawidłowa wartość płci",
    }),

    defaultLocationName: optionalLocationNameSchema,
    defaultLatitude: optionalLatitudeSchema,
    defaultLongitude: optionalLongitudeSchema,
    defaultTimezone: optionalTimezoneSchema,
  })
  .superRefine((data, ctx) => {
    const hasLatitude = data.defaultLatitude !== undefined;
    const hasLongitude = data.defaultLongitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Szerokość i długość geograficzna muszą zostać podane razem",
        path: hasLatitude
          ? ["defaultLongitude"]
          : ["defaultLatitude"],
      });
    }
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
