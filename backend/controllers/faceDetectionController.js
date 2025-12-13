// controllers/faceDetectionController.js
import FaceData from '../models/FaceData.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import FormData from 'form-data';

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:8000';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/faces';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `face_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only JPEG, JPG and PNG images are allowed'));
  }
});

async function callFaceService(endpoint, formData, headers = {}) {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      ...headers
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `Face service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Face service call error:', error);
    throw error;
  }
}

function calculateGeoDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const FACE_MATCH_THRESHOLD = 1.0;
const MIN_CONFIDENCE_REQUIRED = 50;

// @desc    Save employee face data during registration
// @route   POST /api/face-detection/save-face
// @access  Private (Admin)
export const saveEmployeeFace = async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Face image is required' });
    }

    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const imageBuffer = await fs.readFile(req.file.path);
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: req.file.filename,
      contentType: req.file.mimetype
    });

    let faceResult;
    try {
      faceResult = await callFaceService('/detect', formData);
    } catch (error) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ 
        success: false, 
        message: 'Face detection service error', 
        error: error.message 
      });
    }

    if (!faceResult.success || !faceResult.faces || faceResult.faces.length === 0) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(400).json({ 
        success: false, 
        message: 'No face detected in the image. Please try again with a clear face photo.' 
      });
    }

    if (faceResult.faces.length > 1) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(400).json({ 
        success: false, 
        message: 'Multiple faces detected. Please ensure only one person is in the photo.' 
      });
    }

    const face = faceResult.faces[0];
    const faceDescriptor = face.embedding;

    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 512) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid face embedding received from face service' 
      });
    }

    const existingFaceData = await FaceData.findOne({ employee: employeeId });
    if (existingFaceData) {
      existingFaceData.faceDescriptor = faceDescriptor;
      existingFaceData.landmarks = [];
      existingFaceData.faceImageUrl = req.file.path;
      existingFaceData.lastUpdated = new Date();
      existingFaceData.confidence = Math.round(face.confidence * 100);
      existingFaceData.metadata = {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Registration',
        processingVersion: '2.0-InsightFace'
      };

      await existingFaceData.save();
      return res.json({ success: true, message: 'Face data updated successfully', data: existingFaceData });
    }

    const faceData = new FaceData({
      employee: employeeId,
      user: employee.user._id,
      faceDescriptor,
      landmarks: [],
      faceImageUrl: req.file.path,
      confidence: Math.round(face.confidence * 100),
      metadata: {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Registration',
        processingVersion: '2.0-InsightFace'
      }
    });

    await faceData.save();
    res.status(201).json({ success: true, message: 'Face data saved successfully', data: faceData });

  } catch (error) {
    console.error('Save face data error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (unlinkError) { console.error('Error deleting file:', unlinkError); }
    }
    res.status(500).json({ success: false, message: 'Server error while saving face data' });
  }
};

// @desc    Get employee face data
// @route   GET /api/face-detection/employee/:employeeId
// @access  Private
export const getEmployeeFace = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const faceData = await FaceData.findByEmployee(employeeId);
    if (!faceData) {
      return res.status(404).json({ success: false, message: 'Face data not found for this employee' });
    }

    const responseData = {
      _id: faceData._id,
      employee: faceData.employee,
      user: faceData.user,
      hasRegisteredFace: true,
      registrationDate: faceData.registrationDate,
      lastUpdated: faceData.lastUpdated,
      confidence: faceData.confidence
    };

    res.json({ success: true, data: responseData });

  } catch (error) {
    console.error('Get employee face error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching face data' });
  }
};

// @desc    Verify face for attendance using InsightFace
// @route   POST /api/face-detection/verify-attendance
// @access  Private (Employee)
export const verifyFaceAttendance = async (req, res) => {
  try {
    const { location } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Face image is required' });
    }

    if (!location || location.latitude === undefined || location.longitude === undefined) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(400).json({ success: false, message: 'Location is required' });
    }

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    const faceData = await FaceData.findByEmployee(employee._id);
    if (!faceData) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(404).json({ success: false, message: 'Face data not registered. Please register your face first.' });
    }

    const storedDescriptor = faceData.faceDescriptor;
    if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 512) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ success: false, message: 'Stored face descriptor invalid' });
    }

    const imageBuffer = await fs.readFile(req.file.path);
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: req.file.filename,
      contentType: req.file.mimetype
    });
    formData.append('stored_embedding', JSON.stringify(storedDescriptor));

    let verifyResult;
    try {
      verifyResult = await callFaceService('/verify', formData);
    } catch (error) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ 
        success: false, 
        message: 'Face verification service error', 
        error: error.message 
      });
    }

    try { await fs.unlink(req.file.path); } catch (_) {}

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Face verification failed',
        verification: {
          match: false,
          confidence: verifyResult.confidence || 0,
          distance: verifyResult.distance || 1
        }
      });
    }

    if (!verifyResult.match) {
      return res.status(401).json({
        success: false,
        message: `Face verification failed. Confidence: ${Math.round(verifyResult.confidence)}%`,
        verification: {
          match: false,
          confidence: verifyResult.confidence,
          distance: verifyResult.distance
        }
      });
    }

    const OFFICE_LOCATION = {
      latitude: 22.29867,
      longitude: 73.13130,
      radius: 999999
    };

    const distance = calculateGeoDistance(
      Number(location.latitude),
      Number(location.longitude),
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );

    if (!Number.isFinite(distance)) {
      return res.status(400).json({ success: false, message: 'Invalid location coordinates' });
    }

    if (distance > OFFICE_LOCATION.radius) {
      return res.status(400).json({
        success: false,
        message: `You are not within office premises. Distance: ${Math.round(distance)}m`,
        verification: {
          faceMatch: true,
          faceConfidence: verifyResult.confidence,
          locationMatch: false,
          distance: Math.round(distance),
          maxDistance: OFFICE_LOCATION.radius
        }
      });
    }

    res.json({
      success: true,
      message: 'Face and location verification successful',
      verification: {
        faceMatch: true,
        faceConfidence: verifyResult.confidence,
        locationMatch: true,
        distance: Math.round(distance),
        maxDistance: OFFICE_LOCATION.radius
      }
    });

  } catch (error) {
    console.error('Face verification error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, message: 'Server error during face verification' });
  }
};

// @desc    Delete employee face data
// @route   DELETE /api/face-detection/employee/:employeeId
// @access  Private (Admin)
export const deleteEmployeeFace = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const faceData = await FaceData.findOne({ employee: employeeId });
    if (!faceData) {
      return res.status(404).json({ success: false, message: 'Face data not found' });
    }

    try {
      if (faceData.faceImageUrl) await fs.unlink(faceData.faceImageUrl);
    } catch (fileError) {
      console.warn('Could not delete face image file:', fileError);
    }

    await faceData.deleteOne();
    res.json({ success: true, message: 'Face data deleted successfully' });

  } catch (error) {
    console.error('Delete face data error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting face data' });
  }
};

// @desc    Get all employees without face data
// @route   GET /api/face-detection/employees-without-face
// @access  Private (Admin)
export const getEmployeesWithoutFace = async (req, res) => {
  try {
    const employeesWithFace = await FaceData.find({ isActive: true }).distinct('employee');

    const employeesWithoutFace = await Employee.find({
      _id: { $nin: employeesWithFace },
      status: 'Active'
    })
      .populate('user', 'name email employeeId')
      .select('personalInfo workInfo');

    res.json({ success: true, data: employeesWithoutFace, count: employeesWithoutFace.length });

  } catch (error) {
    console.error('Get employees without face error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching employees' });
  }
};

// @desc    Detect faces in an image (for testing/preview)
// @route   POST /api/face-detection/detect
// @access  Private
export const detectFaces = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const imageBuffer = await fs.readFile(req.file.path);
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: req.file.filename,
      contentType: req.file.mimetype
    });

    let faceResult;
    try {
      faceResult = await callFaceService('/detect', formData);
    } catch (error) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ 
        success: false, 
        message: 'Face detection service error', 
        error: error.message 
      });
    }

    try { await fs.unlink(req.file.path); } catch (_) {}

    res.json({
      success: true,
      faces: faceResult.faces.map(face => ({
        bbox: face.bbox,
        confidence: face.confidence,
        age: face.age,
        gender: face.gender
      })),
      count: faceResult.faces.length
    });

  } catch (error) {
    console.error('Face detection error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, message: 'Server error during face detection' });
  }
};
