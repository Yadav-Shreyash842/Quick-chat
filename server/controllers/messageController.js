import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
// Mock socket.io for serverless
const io = { emit: () => {}, to: () => ({ emit: () => {} }) };
const userSocketMap = {};

// get all user except logged in user
export const getUserForSidebar = async (req, res) => {
   try {
       const userId = req.user._id; 
       const filteredUsers = await User.find({_id: {$ne: userId}}).select("-password "); 
       
       // count of unread messages and get last messages from each user
       const unseenMessages = {};
       const lastMessages = {};
       
       const promises = filteredUsers.map(async (user) => {
           const count = await Message.countDocuments({sendrId: user._id, recvrId: userId, seen: false});
           if(count > 0){
                unseenMessages[user._id] = count;
           }
           
           // Get last message between users
           const lastMessage = await Message.findOne({
               $or: [
                   { sendrId: userId, recvrId: user._id },
                   { sendrId: user._id, recvrId: userId }
               ]
           }).sort({ createdAt: -1 });
           
           if(lastMessage) {
               lastMessages[user._id] = lastMessage.text || 'Media';
           }
       });

       await Promise.all(promises);
       res.json({success:true, users: filteredUsers, unseenMessages, lastMessages});
        
   } catch (error) {
       res.json({success:false, message: error.message});
   }
}

// get all messages selected user
export const getMessages = async (req, res) => {
    try {
        const {id: selectedUserId} = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sendrId: myId, recvrId: selectedUserId },
                { sendrId: selectedUserId, recvrId: myId }
            ]
        })

        await Message.updateMany(
            {sendrId: selectedUserId, recvrId: myId},
            {seen: true}
        );

        res.json({success:true, messages});
        
    } catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message});
    }
}

// api to mark messages as seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const {id} = req.params;
        await Message.findByIdAndUpdate(id, {seen: true});
        res.json({success:true});
    } catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message});
    }
}

// send message to selected user
export const sendMessage = async (req, res) => {
    try {
        const recvrId = req.params.id;
        const sendrId = req.user._id;

        const {text, image, audio, messageType, duration} = req.body;
        
        let fileUrl;
        if(image){
             const uploadedImage = await cloudinary.uploader.upload(image)
             fileUrl = uploadedImage.secure_url;
        } else if(audio) {
             const uploadedAudio = await cloudinary.uploader.upload(audio, {
                 resource_type: 'auto',
                 format: 'mp3'
             });
             fileUrl = uploadedAudio.secure_url;
        }

        const newMessage = await Message.create({
            sendrId, 
            recvrId, 
            text,
            image: image ? fileUrl : undefined,
            audio: audio ? fileUrl : undefined,
            messageType: messageType || 'text',
            duration,
            delivered: true
        });

        // Socket.io disabled for serverless deployment


        res.json({success:true, newMessage});
        
    } catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message});
    }
}

// react to message
export const reactToMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;
        
        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }
        
        // Initialize reactions array if it doesn't exist
        if (!message.reactions) {
            message.reactions = [];
        }
        
        const existingReaction = message.reactions.find(r => r.userId.toString() === userId.toString());
        
        if (existingReaction) {
            if (existingReaction.emoji === emoji) {
                message.reactions = message.reactions.filter(r => r.userId.toString() !== userId.toString());
            } else {
                existingReaction.emoji = emoji;
            }
        } else {
            message.reactions.push({ userId, emoji });
        }
        
        await message.save();
        
        // Socket.io disabled for serverless deployment
        
        res.json({ success: true, reactions: message.reactions });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// edit message
export const editMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const userId = req.user._id;
        
        const message = await Message.findById(id);
        if (message.sendrId.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Unauthorized" });
        }
        
        message.text = text;
        message.edited = true;
        await message.save();
        
        // Socket.io disabled for serverless deployment
        
        res.json({ success: true, message });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// delete message
export const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteFor } = req.body;
        const userId = req.user._id;
        
        const message = await Message.findById(id);
        if (message.sendrId.toString() !== userId.toString() && deleteFor === 'everyone') {
            return res.json({ success: false, message: "Unauthorized" });
        }
        
        if (deleteFor === 'everyone') {
            await Message.findByIdAndDelete(id);
            
            // Socket.io disabled for serverless deployment
        }
        
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
