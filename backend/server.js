import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import setupShutdown from './utils/shutdown.js';
import setupChatSocket from './socket/chat.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import leadsRoutes from  './routes/leadRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import problemRoutes from './routes/problemRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import botRoutes from './routes/botRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';

// import { createAdminIfNotExists } from './controllers/initAdmin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- MIDDLEWARE -----------------

// CORS Configuration - MUST BE BEFORE OTHER MIDDLEWARE
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:8080', 'http://localhost:4000'],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Body parsing middleware - MUST BE BEFORE ROUTES
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Logging middleware (optional)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ----------------- ROUTES -----------------
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes); // NEW: Add attendance routes
app.use('/api/departments', departmentRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/purchase', purchaseRoutes);
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Employee Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      employees: '/api/employees',
      dashboard: '/api/dashboard',
      leaves: '/api/leaves',
      tasks: '/api/tasks',
      users: '/api/users'
    }
  });
});

// ----------------- ERROR HANDLERS -----------------

// 404 handler for undefined routes
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.originalUrl} not found`
//   });
// });

// Global error handler (must be last)
app.use(errorHandler);

// ----------------- SERVER START -----------------
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Database connected successfully');

    // Create default admin if doesn't exist
    // await createAdminIfNotExists();
    console.log('✅ Admin user verified/created');

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Setup chat socket handlers
    setupChatSocket(io);

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Admin Panel: http://localhost:${PORT}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (err) {
    console.error('❌ Server start failed:', err);
    process.exit(1);
  }
};

// Graceful shutdown
setupShutdown();

// Start the server
startServer();

export default app;
