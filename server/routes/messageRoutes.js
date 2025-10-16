import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import { getMessages, getUserForSidebar , markMessageAsSeen, sendMessage, reactToMessage, editMessage, deleteMessage}  from '../controllers/messageController.js';

const messageRoutes = express.Router();
messageRoutes.get("/users", protectRoute, getUserForSidebar);
messageRoutes.get("/:id", protectRoute, getMessages);
messageRoutes.put("/mark/:id", protectRoute, markMessageAsSeen);
messageRoutes.post("/send/:id", protectRoute, sendMessage);
messageRoutes.put("/react/:id", protectRoute, reactToMessage);
messageRoutes.put("/edit/:id", protectRoute, editMessage);
messageRoutes.delete("/delete/:id", protectRoute, deleteMessage);

export default messageRoutes;
