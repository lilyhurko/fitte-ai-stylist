const express = require("express");
const {
  register,
  login,
  loginWithGoogle,
  getSession,
  logout,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authenticate");
const { authLimiter } = require("../middleware/rateLimiters");

const router = express.Router();
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/login/google", authLimiter, loginWithGoogle);
router.get("/session", authenticateToken, getSession);
router.post("/logout", logout);

module.exports = router;
