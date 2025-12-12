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
- Attendance tracking with face recognition
- Task management
- Department management
- Sales lead management
- Real-time chat (Socket.IO)
- AI chatbot integration
- Purchase order management

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
