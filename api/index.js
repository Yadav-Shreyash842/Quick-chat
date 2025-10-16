import express from "express";
import "dotenv/config";
import cors from "cors";
import { connectDB } from "../server/lib/db.js";
import userRouter from "../server/routes/userRoutes.js";
import messageRoutes from "../server/routes/messageRoutes.js";

const app = express();

// Middlewares
app.use(express.json({ limit: "4mb" }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Connect to database once
let isConnected = false;
const ensureConnection = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

// Routes with database connection
app.use(async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

app.get("/api/status", (req, res) => {
  res.status(200).json({ success: true, message: "Server is live" });
});

app.use("/api/auth", userRouter);
app.use("/api/messages", messageRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Chat App API is running" });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found", path: req.path });
});

export default app;