const express = require("express");
const {
  analyzeClothDraft,
  confirmClothDraft,
  cancelClothDraft,
  addCloth,
  getWardrobe,
  deleteCloth,
  updateCloth,
} = require("../controllers/wardrobeController");

const { authenticateToken } = require("../middleware/authenticate");
const { uploadLimiter } = require("../middleware/rateLimiters");
const { upload } = require("../middleware/upload");

const router = express.Router();
router.use(authenticateToken);
router.post(
  "/analyze",
  uploadLimiter,
  upload.single("image"),
  analyzeClothDraft,
);
router.post("/drafts/:id/confirm", confirmClothDraft);
router.delete("/drafts/:id", cancelClothDraft);
router.post("/add", uploadLimiter, upload.single("image"), addCloth);
router.get("/", getWardrobe);
router.delete("/:id", deleteCloth);
router.patch("/:id", updateCloth);

module.exports = router;
