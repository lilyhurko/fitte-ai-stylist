const express = require("express");
const { getCapsule, getTripCapsule } = require("../controllers/capsuleController");
const { authenticateToken } = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticateToken);
router.get("/", getCapsule);
router.post("/trip", getTripCapsule);

module.exports = router;
