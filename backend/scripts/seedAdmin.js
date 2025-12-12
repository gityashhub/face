// scripts/seedAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config({ path: ".env" });

const adminData = {
  name: "Admin",
  email: "admin@gmail.com",
  password: "Admin123", // Will be hashed automatically by User model
  role: "admin",
  isActive: true
};

const seedAdmin = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("✅ Connected.");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists:");
      console.log(existingAdmin);
      mongoose.disconnect();
      return;
    }

    // Create new admin
    const admin = new User(adminData);
    await admin.save();

    console.log("🎉 Admin user created successfully!");
    console.log({
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });

    await mongoose.disconnect();
    console.log("🔌 Disconnected from DB.");

  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    mongoose.disconnect();
  }
};

seedAdmin();
