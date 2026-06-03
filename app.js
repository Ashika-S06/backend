require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes        = require("./src/routes/auth.routes");
const studentRoutes     = require("./src/routes/student.routes");
const companyRoutes     = require("./src/routes/company.routes");
const driveRoutes       = require("./src/routes/drive.routes");
const applicationRoutes = require("./src/routes/application.routes");
const interviewRoutes   = require("./src/routes/interview.routes");
const analyticsRoutes   = require("./src/routes/analytics.routes");
const syncRoutes        = require("./src/routes/sync.routes");

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Placement Recruitment API Running" });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    const Student = require("./src/models/Student");
    const documentCount = await Student.countDocuments();
    res.status(200).json({
      success: true,
      message: "Database connected successfully",
      data: { database: "connected", documentCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/sync",         syncRoutes);
app.use("/auth",         authRoutes);
app.use("/students",     studentRoutes);
app.use("/companies",    companyRoutes);
app.use("/drives",       driveRoutes);
app.use("/applications", applicationRoutes);
app.use("/interviews",   interviewRoutes);
app.use("/analytics",    analyticsRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

module.exports = app;
