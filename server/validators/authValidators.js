const { z } = require("zod");

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email("Nieprawidłowy adres e-mail"));

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Hasło jest wymagane")
    .max(128, "Hasło jest za długie"),
});

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Imię musi mieć minimum 2 znaki")
    .max(80, "Imię jest za długie"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .max(128, "Hasło jest za długie"),
  styleTags: z.array(z.string().max(50)).max(20).default([]),
  favoriteColors: z.array(z.string().max(30)).max(20).default([]),
});

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Obecne hasło jest wymagane")
      .max(128, "Hasło jest za długie"),
    newPassword: z
      .string()
      .min(8, "Nowe hasło musi mieć minimum 8 znaków")
      .max(128, "Nowe hasło jest za długie"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Nowe hasło musi różnić się od obecnego",
    path: ["newPassword"],
  });
const googleLoginSchema = z.object({
  credential: z
    .string()
    .min(1, "Token Google jest wymagany")
    .max(5000, "Token Google jest nieprawidłowy"),
});
const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

const verifyPasswordResetCodeSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kod musi zawierać dokładnie 6 cyfr"),
});

const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Kod musi zawierać dokładnie 6 cyfr"),
    newPassword: z
      .string()
      .min(8, "Nowe hasło musi mieć minimum 8 znaków")
      .max(128, "Hasło jest za długie"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

const verifyEmailCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kod musi zawierać dokładnie 6 cyfr"),
});

module.exports = {
  emailSchema,
  loginSchema,
  registerSchema,
  changePasswordSchema,
  googleLoginSchema,
  requestPasswordResetSchema,
  verifyPasswordResetCodeSchema,
  resetPasswordSchema,
  verifyEmailCodeSchema,
};
