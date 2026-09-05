const express = require("express");
const { analyze } = require("../controllers/analysisController");
const { saveAnalysisFeedback, saveRecommendationFeedback } = require("../controllers/feedbackController");
const { authenticateToken } = require("../middleware/authenticate");
const { aiLimiter } = require("../middleware/rateLimiters");

const router = express.Router();
router.use(authenticateToken);
router.post("/analyze", aiLimiter, analyze);
router.post("/analyze/:id/feedback", saveAnalysisFeedback);
router.post("/recommendations/:id/feedback", saveRecommendationFeedback);

module.exports = router;
