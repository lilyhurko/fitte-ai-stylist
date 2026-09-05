const express = require("express");
const { getHistory } = require("../controllers/historyController");
const { authenticateToken } = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticateToken);
router.get("/", getHistory);

module.exports = router;
