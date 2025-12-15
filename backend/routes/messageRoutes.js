import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { getOnlineUserIds } from '../socket/chat.js';

const router = express.Router();

router.use(protect);

router.get('/chat-users', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const users = await User.find({ 
      _id: { $ne: currentUserId },
      role: { $in: ['employee', 'admin'] }
    })
    .select('fullName personalInfo.firstName personalInfo.lastName workInfo.department workInfo.position avatar')
    .lean();

    const onlineUserIds = getOnlineUserIds();
    
    const chatUsers = users.map(user => {
      const name = user.fullName || 
        (user.personalInfo?.firstName && user.personalInfo?.lastName 
          ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}` 
          : 'Unknown User');
      
      return {
        _id: user._id.toString(),
        name,
        department: user.workInfo?.department || 'General',
        position: user.workInfo?.position || 'Employee',
        avatar: user.avatar || null,
        isOnline: onlineUserIds.includes(user._id.toString())
      };
    });

    chatUsers.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: chatUsers });
  } catch (error) {
    console.error('Failed to get chat users:', error);
    res.status(500).json({ success: false, message: 'Failed to load chat users' });
  }
});

router.get('/history/:peerId', async (req, res) => {
  try {
    const { peerId } = req.params;
    const currentUserId = req.user.id;

    if (peerId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot load chat history with yourself' });
    }

    const messages = await Message.find({
      $or: [
        { from: currentUserId, to: peerId },
        { from: peerId, to: currentUserId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('from', 'fullName personalInfo.firstName personalInfo.lastName')
    .populate('to', 'fullName personalInfo.firstName personalInfo.lastName');

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Failed to load chat history:', error);
    res.status(500).json({ success: false, message: 'Failed to load chat history' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { to, text } = req.body;
    const from = req.user.id;

    if (to === from) {
      return res.status(400).json({ success: false, message: 'Cannot send message to yourself' });
    }

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const message = new Message({
      from,
      to,
      text: text.trim()
    });
    await message.save();
    
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

export default router;
