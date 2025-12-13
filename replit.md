# Employee Management System

## Overview
A full-stack Employee Management System built with React (Vite) frontend and Node.js/Express backend with MongoDB database.

## Project Structure
```
├── backend/              # Express.js API server
│   ├── config/           # Database configuration
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Auth, error handling, validation
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── socket/           # Socket.IO chat handlers
│   ├── utils/            # Helper functions
│   └── server.js         # Entry point
├── frontend/             # React/Vite application
│   ├── public/           # Static assets, face recognition models
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layers
│   │   ├── utils/        # Utilities and API helpers
│   │   └── hooks/        # Custom React hooks
│   └── vite.config.js    # Vite configuration
```

## Features
- User authentication (Admin/Employee roles)
- Employee management
- Leave management system
- Attendance tracking with video-based face recognition
- Task management
- Department management
- Sales lead management
- Real-time chat (Socket.IO)
- AI chatbot integration
- Purchase order management

## Face Recognition System
The system uses InsightFace for robust face recognition with the following features:

### Multi-Angle Face Registration (Admin)
- Guided 3-step capture process (front, left, right angles)
- Real-time face quality validation (brightness, sharpness, centering)
- Quality score feedback during capture
- Stores embeddings for each angle plus averaged embedding

### Video-Based Verification (Employee)
- Captures multiple video frames for verification
- Liveness detection to prevent photo spoofing
- Checks: frame movement, embedding consistency across frames
- Uses averaged embedding comparison with stored multi-angle data

### Face Service (Python)
- Runs on port 8000
- Endpoints: `/detect`, `/analyze-frame-base64`, `/register-multi-angle`, `/verify-video`
- Uses InsightFace buffalo_sc model for face detection and embedding

## Development Setup
- **Frontend**: Runs on port 5000 (Vite dev server)
- **Backend**: Runs on port 3001 (Express server)
- **Database**: MongoDB Atlas (connection configured in backend/config/db.js)

## API Proxy
In development, the Vite dev server proxies API requests:
- `/api/*` routes are proxied to `http://localhost:3001`
- `/socket.io/*` WebSocket connections are proxied to `http://localhost:3001`

## Demo Credentials
- **Admin**: admin@gmail.com / admin
- **Employee**: employee@company.com / EMP001

## Production Deployment
The backend serves the frontend static build in production mode.
- Build command: `cd frontend && npm run build`
- Run command: `cd backend && NODE_ENV=production PORT=5000 node server.js`

## Technologies
- **Frontend**: React 18, Vite, TailwindCSS, React Router, Axios, Socket.IO Client
- **Backend**: Express.js, MongoDB/Mongoose, Socket.IO, JWT Authentication
- **Features**: Face Recognition (face-api.js), Recharts, React Hot Toast
