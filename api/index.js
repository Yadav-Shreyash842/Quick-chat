import express from "express";
import "dotenv/config";
import cors from "cors";
import { connectDB } from "../server/lib/db.js";
import userRouter from "../server/routes/userRoutes.js";
import messageRoutes from "../server/routes/messageRoutes.js";

const app = express();

// Connect to database
connectDB();

// Middlewares
app.use(express.json({ limit: "4mb" }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Routes
app.get("/api/status", (req, res) => res.json({ message: "Server is live" }));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Chat App API is running" });
});

// Catch all API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found", path: req.path });
});

export default app;