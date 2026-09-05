const express = require("express");
const { getProfile, updateProfile, changePassword } = require("../controllers/profileController");
const { authenticateToken } = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticateToken);
router.get("/", getProfile);
router.patch("/", updateProfile);
router.post("/change-password", changePassword);

module.exports = router;
