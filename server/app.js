require("./config/env");

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { requestId } = require("./middleware/requestId");
const { errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const wardrobeRoutes = require("./routes/wardrobeRoutes");
const capsuleRoutes = require("./routes/capsuleRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const profileRoutes = require("./routes/profileRoutes");
const historyRoutes = require("./routes/historyRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.set("trust proxy", 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin niedozwolony przez CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(cookieParser());
app.use(requestId);

app.get("/", (req, res) => {
  res.json({
    status: "active",
    service: "Fitte Adaptive AI Stylist Backend",
    academicProject: "Politechnika Lubelska - Praca Magisterska",
  });
});

app.use("/api", authRoutes);
app.use("/api/wardrobe", wardrobeRoutes);
app.use("/api/capsule", capsuleRoutes);
app.use("/api", analysisRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/events", eventRoutes);
app.use(errorHandler);

module.exports = { app };
