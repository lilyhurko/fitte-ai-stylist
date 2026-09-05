const { z } = require("zod");

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Nieprawidłowy identyfikator");

module.exports = {
  objectIdSchema,
};