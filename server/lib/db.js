import mongoose from "mongoose";

let isConnected = false;

// Function to connect to MongoDB
export const connectDB = async () => {
  if (isConnected) {
    return;
  }
  
  try {
    const conn = await mongoose.connect(`${process.env.MONGODB_URI}/chat-app`, {
      bufferCommands: false,
      maxPoolSize: 1
    });
    isConnected = true;
    console.log("✅ Database connected");
  } catch (error) {
    console.log("Database connection error:", error);
    throw error;
  }
};
