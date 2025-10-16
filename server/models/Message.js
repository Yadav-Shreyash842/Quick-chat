import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
   sendrId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recvrId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String },
    image: { type: String },
    audio: { type: String },
    messageType: { type: String, enum: ['text', 'image', 'audio'], default: 'text' },
    duration: { type: Number }, // for audio messages
    seen: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false },
    reactions: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, emoji: String }],
    edited: { type: Boolean, default: false },
},{timestamps:true});


const Message = mongoose.model("Message", messageSchema);
export default Message;