const express = require("express");
const { getEvents, createEvent, deleteEvent } = require("../controllers/eventController");
const { authenticateToken } = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticateToken);
router.get("/", getEvents);
router.post("/", createEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
