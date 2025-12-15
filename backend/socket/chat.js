// backend/socket/chat.js
import User from '../models/User.js';
import Message from '../models/Message.js';
import { processBotMessage } from '../controllers/botController.js';
import authSocket from '../middleware/authSocket.js';

const onlineUsers = new Map();
const userSockets = new Map();
const processedMessages = new Map();
const MESSAGE_DEDUP_TTL = 60000;

const cleanupProcessedMessages = () => {
  const now = Date.now();
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_TTL) {
      processedMessages.delete(key);
    }
  }
};

setInterval(cleanupProcessedMessages, 30000);

const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

const broadcastPresence = (io, namespace) => {
  const onlineUserIds = getOnlineUserIds();
  namespace.emit('presence:sync', { onlineUsers: onlineUserIds });
};

const setupChatSocket = (io) => {
  const employeeNamespace = io.of('/employee');
  employeeNamespace.use(authSocket);

  employeeNamespace.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const userName = socket.user.fullName;
    
    console.log(`Employee connected: ${userName} (${socket.id})`);
    
    const existingSocketId = userSockets.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = employeeNamespace.sockets.get(existingSocketId);
      if (existingSocket) {
        console.log(`Disconnecting previous socket for user ${userId}`);
        existingSocket.disconnect(true);
      }
    }
    
    userSockets.set(userId, socket.id);
    onlineUsers.set(userId, {
      socketId: socket.id,
      name: userName,
      lastSeen: new Date()
    });

    socket.emit('presence:sync', { onlineUsers: getOnlineUserIds() });
    
    socket.broadcast.emit('presence:update', {
      userId: userId,
      status: 'online',
      name: userName
    });

    socket.on('message', async (payload) => {
      const { from, fromName, to, text, clientMessageId } = payload;
      
      if (!from || !text?.trim()) {
        console.warn('Invalid message payload:', payload);
        socket.emit('error', { type: 'INVALID_PAYLOAD', message: 'Message requires sender and text' });
        return;
      }

      if (to !== 'bot' && from === to) {
        console.warn('Self-chat attempted:', { from, to });
        socket.emit('error', { type: 'SELF_CHAT_PREVENTED', message: 'Cannot send message to yourself' });
        return;
      }

      const dedupKey = clientMessageId || `${from}-${to}-${text.trim()}-${Math.floor(Date.now() / 1000)}`;
      if (processedMessages.has(dedupKey)) {
        console.warn('Duplicate message detected:', dedupKey);
        return;
      }
      processedMessages.set(dedupKey, Date.now());

      try {
        if (to === 'bot') {
          const userMessageDoc = new Message({
            from,
            to: from,
            text: text.trim()
          });
          await userMessageDoc.save();

          socket.emit('message', {
            _id: userMessageDoc._id,
            clientMessageId,
            from,
            to: from,
            text: userMessageDoc.text,
            timestamp: userMessageDoc.timestamp,
            self: true,
            fromBot: false
          });

          const { response } = await processBotMessage(text.trim(), from);

          const botMessageDoc = new Message({
            from: null,
            to: from,
            text: response,
            fromBot: true
          });
          await botMessageDoc.save();

          socket.emit('message', {
            _id: botMessageDoc._id,
            from: null,
            to: from,
            text: response,
            timestamp: botMessageDoc.timestamp,
            self: false,
            fromBot: true
          });
          return;
        }

        const messageDoc = new Message({
          from,
          to,
          text: text.trim()
        });
        await messageDoc.save();

        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
          io.of('/employee').to(recipientSocketId).emit('message', {
            _id: messageDoc._id,
            from,
            fromName: fromName || socket.user.fullName,
            to,
            text: messageDoc.text,
            timestamp: messageDoc.timestamp,
            self: false,
            fromBot: false
          });
        }

        socket.emit('message', {
          _id: messageDoc._id,
          clientMessageId,
          from,
          fromName: fromName || socket.user.fullName,
          to,
          text: messageDoc.text,
          timestamp: messageDoc.timestamp,
          self: true,
          fromBot: false
        });

      } catch (err) {
        console.error('Socket message error:', err);
        processedMessages.delete(dedupKey);
        socket.emit('error', { type: 'MESSAGE_FAILED', message: 'Failed to send message' });
      }
    });

    socket.on('typing:start', (data) => {
      const { to } = data;
      if (to && to !== userId) {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
          io.of('/employee').to(recipientSocketId).emit('typing:start', {
            from: userId,
            fromName: userName
          });
        }
      }
    });

    socket.on('typing:stop', (data) => {
      const { to } = data;
      if (to && to !== userId) {
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
          io.of('/employee').to(recipientSocketId).emit('typing:stop', {
            from: userId
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Employee disconnected: ${userName} (${socket.id})`);
      
      if (userSockets.get(userId) === socket.id) {
        userSockets.delete(userId);
        onlineUsers.delete(userId);
        
        socket.broadcast.emit('presence:update', {
          userId: userId,
          status: 'offline',
          name: userName,
          lastSeen: new Date()
        });
      }
    });
  });

  const adminNamespace = io.of('/admin');
  adminNamespace.use(authSocket);
  adminNamespace.on('connection', (socket) => {
    console.log(`Admin connected: ${socket.user.fullName} (${socket.id})`);
    socket.on('disconnect', () => {
      console.log(`Admin disconnected: ${socket.user.fullName} (${socket.id})`);
    });
  });
};

export { getOnlineUserIds };
export default setupChatSocket;
