const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/profileController");
const { authenticateToken } = require("../middleware/authenticate");
const { authLimiter } = require("../middleware/rateLimiters");
const router = express.Router();

router.use(authenticateToken);

router.get("/", getProfile);
router.patch("/", updateProfile);
router.post("/change-password", changePassword);
router.delete("/", authLimiter, deleteAccount);

module.exports = router;
