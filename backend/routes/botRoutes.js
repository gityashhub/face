import express from 'express';
import { processMessage, getBotHistory } from '../controllers/botController.js';
import { protect } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
router.use(protect);

router.post('/message', processMessage);
router.get('/history/:userId', getBotHistory);

// Secure PDF download endpoint
router.get('/download/:filename', protect, (req, res) => {
  const { filename } = req.params;
  // Basic validation: only allow PDFs from temp folder
  if (!filename.endsWith('.pdf') || filename.includes('..')) {
    return res.status(400).json({ success: false, message: 'Invalid file' });
  }

  const filePath = path.join(process.cwd(), 'temp', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  res.download(filePath, (err) => {
    if (!err) {
      // Auto-delete after 30 seconds
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 30000);
    }
  });
});

export default router;