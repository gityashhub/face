import express from 'express';
import {
  saveEmployeeFace,
  getEmployeeFace,
  deleteEmployeeFace,
  verifyFaceAttendance,
  getEmployeesWithoutFace,
  detectFaces,
  upload
} from '../controllers/faceDetectionController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/save-face', adminOnly, upload.single('file'), saveEmployeeFace);

router.get('/employee/:employeeId', getEmployeeFace);

router.delete('/employee/:employeeId', adminOnly, deleteEmployeeFace);

router.post('/verify-attendance', upload.single('file'), verifyFaceAttendance);

router.get('/employees-without-face', adminOnly, getEmployeesWithoutFace);

router.post('/detect', upload.single('file'), detectFaces);

export default router;
