import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import User from "./models/User.js";

// create express app and http server
const app = express();
const server = http.createServer(app);

// socket io setup
export const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// store onlinne users
export const userSocketMap = {}; // {userId: socketId}
const typingUsers = {}; // {userId: {roomId, timeout}}


// socket.io connection handler
// socket.io connection handler
io.on("connection", (socket) =>{
    const userId = socket.handshake.query.userId;
    console.log("socket connected -> socket.id:", socket.id, "handshake.query:", socket.handshake.query);
    console.log("user connected", userId);

    if (userId) {
        userSocketMap[userId] = socket.id;
        console.log("userSocketMap updated:", userSocketMap);
    } else {
        console.log("No userId in handshake query for socket:", socket.id);
    }

    // Emit online users to all connected users
    console.log("Emitting getOnlineUsers with:", Object.keys(userSocketMap));
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    socket.on("disconnect", async () => {
        console.log("user disconnected", userId, "socket:", socket.id);
        if (userId) {
            await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            delete typingUsers[userId];
        }
        delete userSocketMap[userId];
        console.log("userSocketMap after disconnect:", userSocketMap);
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    socket.on("getOnlineStatus", (userId, callback) => {
        console.log("Checking online status for user:", userId);
        console.log("Current userSocketMap:", userSocketMap);
        
        const isOnline = !!userSocketMap[userId];
        callback(isOnline);
        console.log("Online status sent to client:", isOnline);
        console.log("Received getOnlineStatus for user:", userId);
        console.log("Emitting online status:", isOnline);
    });

    socket.on("typing", ({ receiverId, isTyping }) => {
        const roomId = [userId, receiverId].sort().join("-");
        
        if (isTyping) {
            if (typingUsers[userId]) clearTimeout(typingUsers[userId].timeout);
            typingUsers[userId] = {
                roomId,
                timeout: setTimeout(() => delete typingUsers[userId], 3000)
            };
            socket.to(userSocketMap[receiverId])?.emit("userTyping", { userId, isTyping: true });
        } else {
            if (typingUsers[userId]) {
                clearTimeout(typingUsers[userId].timeout);
                delete typingUsers[userId];
            }
            socket.to(userSocketMap[receiverId])?.emit("userTyping", { userId, isTyping: false });
        }
    });
})



// middlewares setup
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// routes setup

app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRoutes);


// connect to mongoDB
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    if (process.env.NODE_ENV !== 'production') {
        server.listen(PORT, () => console.log("server is running on port:" + PORT));
    }
}

startServer();

// Export app for Vercel
export default app;
