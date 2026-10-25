const express = require("express");
const {
  register,
  login,
  loginWithGoogle,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
  getSession,
  logout,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authenticate");
const {
  authLimiter,
  passwordResetLimiter,
  passwordResetConfirmLimiter,
} = require("../middleware/rateLimiters");

const router = express.Router();
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/login/google", authLimiter, loginWithGoogle);
router.post("/forgot-password", passwordResetLimiter, requestPasswordReset);
router.post(
  "/verify-reset-code",
  passwordResetConfirmLimiter,
  verifyPasswordResetCode,
);
router.post("/reset-password", passwordResetConfirmLimiter, resetPassword);
router.get("/session", authenticateToken, getSession);
router.post("/logout", logout);

module.exports = router;
