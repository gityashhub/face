// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  // Reuse existing connection if already connected
  if (mongoose.connection.readyState >= 1) {
    console.log('📦 MongoDB already connected');
    return;
  }

  try {
    const conn = await mongoose.connect("mongodb+srv://yash14:m73FMaTmzwguxmKQ@ems.afot6m7.mongodb.net/?appName=ems");
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
};

export default connectDB;
