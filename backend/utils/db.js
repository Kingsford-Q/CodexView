import dns from "node:dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

dns.setDefaultResultOrder("ipv4first");
dotenv.config();

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4, // 🔥 force IPv4
      directConnection: false,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error FULL:", error);
    process.exit(1);
  }
};

export default connectDB;
