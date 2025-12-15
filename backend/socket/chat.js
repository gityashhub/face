// backend/socket/chat.js
import User from '../models/User.js';
import Message from '../models/Message.js';
import { processBotMessage } from '../controllers/botController.js';
import authSocket from '../middleware/authSocket.js';

const userSockets = new Map();

const setupChatSocket = (io) => {
  const employeeNamespace = io.of('/employee');
  employeeNamespace.use(authSocket);

  employeeNamespace.on('connection', (socket) => {
    console.log(`Employee connected: ${socket.user.fullName} (${socket.id})`);
    const userId = socket.user._id.toString();
    userSockets.set(userId, socket.id);

    socket.on('message', async (payload) => {
      const { from, fromName, to, text } = payload;
      if (!from || !text?.trim()) {
        console.warn('Invalid message payload:', payload);
        return;
      }

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

        // One-to-one chat message
        const messageDoc = new Message({
          from,
          to,
          text: text.trim()
        });
        await messageDoc.save();

        // Send to recipient (if online)
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

        // Send confirmation back to sender
        socket.emit('message', {
          _id: messageDoc._id,
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
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Employee disconnected: ${socket.user.fullName} (${socket.id})`);
      userSockets.delete(userId);
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

export default setupChatSocket;