import express from 'express';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protect all message routes
router.use(protect);

router.get('/history/:peerId', async (req, res) => {
  try {
    const { peerId } = req.params;
    const currentUserId = req.user.id;

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
    res.status(500).json({ success: false, message: 'Failed to load chat history' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { to, text } = req.body;
    const message = new Message({
      from: req.user.id,
      to,
      text
    });
    await message.save();
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

export default router;