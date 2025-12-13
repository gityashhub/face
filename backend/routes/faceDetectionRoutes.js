import express from 'express';
import {
  saveEmployeeFace,
  getEmployeeFace,
  deleteEmployeeFace,
  verifyFaceAttendance,
  getEmployeesWithoutFace,
  detectFaces,
  analyzeFrame,
  analyzeFrameBase64,
  registerMultiAngleFace,
  verifyVideoFace,
  checkLiveness,
  upload
} from '../controllers/faceDetectionController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Multi-angle video registration (new)
router.post('/register-multi-angle', adminOnly, registerMultiAngleFace);

// Frame analysis for real-time feedback
router.post('/analyze-frame', adminOnly, upload.single('file'), analyzeFrame);
router.post('/analyze-frame-base64', adminOnly, analyzeFrameBase64);

// Video-based verification with liveness detection (new)
router.post('/verify-video', verifyVideoFace);

// Liveness check
router.post('/check-liveness', checkLiveness);

// Legacy single-image registration
router.post('/save-face', adminOnly, upload.single('file'), saveEmployeeFace);

router.get('/employee/:employeeId', getEmployeeFace);

router.delete('/employee/:employeeId', adminOnly, deleteEmployeeFace);

// Legacy single-image verification
router.post('/verify-attendance', upload.single('file'), verifyFaceAttendance);

router.get('/employees-without-face', adminOnly, getEmployeesWithoutFace);

router.post('/detect', upload.single('file'), detectFaces);

export default router;
