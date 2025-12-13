// controllers/faceDetectionController.js
import FaceData from '../models/FaceData.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only JPEG, JPG and PNG images are allowed'));
  }
});

async function callFaceService(endpoint, formData) {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || error.message || `Face service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Face service call error:', error);
    throw error;
  }
}

async function callFaceServiceJSON(endpoint, body) {
  try {
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    
    const response = await fetch(`${FACE_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || error.message || `Face service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Face service JSON call error:', error);
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

const FACE_MATCH_THRESHOLD = 0.9;
const MIN_CONFIDENCE_REQUIRED = 50;

// @desc    Analyze a single video frame for face quality
// @route   POST /api/face-detection/analyze-frame
// @access  Private (Admin)
export const analyzeFrame = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const imageBuffer = await fs.readFile(req.file.path);
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: req.file.mimetype }), req.file.filename);

    let result;
    try {
      result = await callFaceService('/analyze-frame', formData);
    } catch (error) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ 
        success: false, 
        message: 'Face analysis service error', 
        error: error.message 
      });
    }

    try { await fs.unlink(req.file.path); } catch (_) {}

    res.json(result);

  } catch (error) {
    console.error('Analyze frame error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, message: 'Server error during frame analysis' });
  }
};

// @desc    Analyze frame from base64 for real-time feedback
// @route   POST /api/face-detection/analyze-frame-base64
// @access  Private (Admin)
export const analyzeFrameBase64 = async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    let result;
    try {
      result = await callFaceServiceJSON('/analyze-frame-base64', { image });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Face analysis service error', 
        error: error.message 
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Analyze frame base64 error:', error);
    res.status(500).json({ success: false, message: 'Server error during frame analysis' });
  }
};

// @desc    Register face with multiple angles (video-based)
// @route   POST /api/face-detection/register-multi-angle
// @access  Private (Admin)
export const registerMultiAngleFace = async (req, res) => {
  try {
    const { employeeId, frontImage, leftImage, rightImage } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (!frontImage || !leftImage || !rightImage) {
      return res.status(400).json({ 
        success: false, 
        message: 'All three angle images (front, left, right) are required' 
      });
    }

    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let faceResult;
    try {
      faceResult = await callFaceServiceJSON('/register-multi-angle', {
        front_image: frontImage,
        left_image: leftImage,
        right_image: rightImage
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Face registration service error'
      });
    }

    if (!faceResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: faceResult.message || 'Face registration failed'
      });
    }

    // Update employee with multi-angle face data
    employee.faceEmbeddings = {
      front: faceResult.embeddings.front,
      left: faceResult.embeddings.left,
      right: faceResult.embeddings.right,
      average: faceResult.average_embedding
    };
    employee.faceQualityScores = faceResult.quality_scores;
    employee.faceDescriptor = faceResult.average_embedding;
    employee.hasFaceRegistered = true;
    employee.faceRegistrationDate = new Date();
    employee.faceRegistrationMethod = 'multi-angle';

    await employee.save();

    // Also update/create FaceData record
    const existingFaceData = await FaceData.findOne({ employee: employeeId });
    if (existingFaceData) {
      existingFaceData.faceDescriptor = faceResult.average_embedding;
      existingFaceData.confidence = Math.round(
        (faceResult.quality_scores.front + faceResult.quality_scores.left + faceResult.quality_scores.right) / 3 * 100
      );
      existingFaceData.lastUpdated = new Date();
      existingFaceData.metadata = {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Multi-Angle Registration',
        processingVersion: '2.0-InsightFace-MultiAngle'
      };
      await existingFaceData.save();
    } else {
      const faceData = new FaceData({
        employee: employeeId,
        user: employee.user._id,
        faceDescriptor: faceResult.average_embedding,
        landmarks: [],
        faceImageUrl: '',
        confidence: Math.round(
          (faceResult.quality_scores.front + faceResult.quality_scores.left + faceResult.quality_scores.right) / 3 * 100
        ),
        metadata: {
          captureDevice: req.headers['user-agent'] || 'Unknown',
          captureEnvironment: 'Multi-Angle Registration',
          processingVersion: '2.0-InsightFace-MultiAngle'
        }
      });
      await faceData.save();
    }

    res.json({ 
      success: true, 
      message: 'Multi-angle face registration successful',
      qualityScores: faceResult.quality_scores
    });

  } catch (error) {
    console.error('Multi-angle face registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during face registration' });
  }
};

// @desc    Verify face using video frames with liveness detection
// @route   POST /api/face-detection/verify-video
// @access  Private (Employee)
export const verifyVideoFace = async (req, res) => {
  try {
    const { frames, location } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 3 video frames are required for verification' 
      });
    }

    const userLocation = (location && location.latitude !== undefined && location.longitude !== undefined)
      ? location
      : { latitude: 22.29867, longitude: 73.13130 };

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    // Check for face registration
    let storedEmbeddings;
    if (employee.faceEmbeddings && employee.faceEmbeddings.average && employee.faceEmbeddings.average.length === 512) {
      storedEmbeddings = employee.faceEmbeddings;
    } else if (employee.faceDescriptor && employee.faceDescriptor.length === 512) {
      storedEmbeddings = { average: employee.faceDescriptor };
    } else {
      const faceData = await FaceData.findByEmployee(employee._id);
      if (!faceData || !faceData.faceDescriptor || faceData.faceDescriptor.length !== 512) {
        return res.status(404).json({ 
          success: false, 
          message: 'Face data not registered. Please register your face first.' 
        });
      }
      storedEmbeddings = { average: faceData.faceDescriptor };
    }

    let verifyResult;
    try {
      verifyResult = await callFaceServiceJSON('/verify-video', {
        frames: frames,
        stored_embeddings: storedEmbeddings
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Face verification service error', 
        error: error.message 
      });
    }

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Face verification failed',
        verification: {
          match: false,
          confidence: verifyResult.confidence || 0,
          liveness_score: verifyResult.liveness_score || 0
        }
      });
    }

    if (!verifyResult.match) {
      return res.status(400).json({
        success: false,
        message: `Face verification failed. Confidence: ${Math.round(verifyResult.confidence)}%`,
        verification: {
          match: false,
          confidence: verifyResult.confidence,
          similarity: verifyResult.similarity,
          liveness_score: verifyResult.liveness_score
        }
      });
    }

    // Location check
    const OFFICE_LOCATION = {
      latitude: 22.29867,
      longitude: 73.13130,
      radius: 999999
    };

    const distance = calculateGeoDistance(
      Number(userLocation.latitude),
      Number(userLocation.longitude),
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
          livenessScore: verifyResult.liveness_score,
          locationMatch: false,
          distance: Math.round(distance),
          maxDistance: OFFICE_LOCATION.radius
        }
      });
    }

    res.json({
      success: true,
      message: 'Face verification successful with liveness check',
      verification: {
        faceMatch: true,
        faceConfidence: verifyResult.confidence,
        similarity: verifyResult.similarity,
        livenessScore: verifyResult.liveness_score,
        locationMatch: true,
        distance: Math.round(distance),
        maxDistance: OFFICE_LOCATION.radius
      }
    });

  } catch (error) {
    console.error('Video face verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during face verification' });
  }
};

// @desc    Save employee face data during registration (single image - legacy support)
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
    formData.append('file', new Blob([imageBuffer], { type: req.file.mimetype }), req.file.filename);

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

    // Update employee with face data
    employee.faceDescriptor = faceDescriptor;
    employee.faceImage = req.file.path;
    employee.hasFaceRegistered = true;
    employee.faceRegistrationDate = new Date();
    employee.faceRegistrationMethod = 'single';
    await employee.save();

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

    const employee = await Employee.findById(employeeId);
    if (employee && employee.hasFaceRegistered) {
      return res.json({ 
        success: true, 
        data: {
          _id: employee._id,
          hasRegisteredFace: true,
          registrationDate: employee.faceRegistrationDate,
          registrationMethod: employee.faceRegistrationMethod,
          hasMultiAngle: !!(employee.faceEmbeddings && employee.faceEmbeddings.average)
        }
      });
    }

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

// @desc    Verify face for attendance using InsightFace (single image - legacy)
// @route   POST /api/face-detection/verify-attendance
// @access  Private (Employee)
export const verifyFaceAttendance = async (req, res) => {
  try {
    const { location } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Face image is required' });
    }

    const userLocation = (location && location.latitude !== undefined && location.longitude !== undefined)
      ? location
      : { latitude: 22.29867, longitude: 73.13130 };

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    // Get stored descriptor from employee or FaceData
    let storedDescriptor;
    if (employee.faceEmbeddings && employee.faceEmbeddings.average && employee.faceEmbeddings.average.length === 512) {
      storedDescriptor = employee.faceEmbeddings.average;
    } else if (employee.faceDescriptor && employee.faceDescriptor.length === 512) {
      storedDescriptor = employee.faceDescriptor;
    } else {
      const faceData = await FaceData.findByEmployee(employee._id);
      if (!faceData) {
        try { await fs.unlink(req.file.path); } catch (_) {}
        return res.status(404).json({ success: false, message: 'Face data not registered. Please register your face first.' });
      }
      storedDescriptor = faceData.faceDescriptor;
    }

    if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 512) {
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(500).json({ success: false, message: 'Stored face descriptor invalid' });
    }

    const imageBuffer = await fs.readFile(req.file.path);
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: req.file.mimetype }), req.file.filename);
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
      return res.status(400).json({
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
      Number(userLocation.latitude),
      Number(userLocation.longitude),
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

    // Clear employee face data
    const employee = await Employee.findById(employeeId);
    if (employee) {
      employee.faceDescriptor = null;
      employee.faceEmbeddings = {
        front: null,
        left: null,
        right: null,
        average: null
      };
      employee.faceQualityScores = {
        front: 0,
        left: 0,
        right: 0
      };
      employee.faceImage = null;
      employee.faceImages = {
        front: null,
        left: null,
        right: null
      };
      employee.hasFaceRegistered = false;
      employee.faceRegistrationDate = null;
      employee.faceRegistrationMethod = null;
      await employee.save();
    }

    const faceData = await FaceData.findOne({ employee: employeeId });
    if (faceData) {
      try {
        if (faceData.faceImageUrl) await fs.unlink(faceData.faceImageUrl);
      } catch (fileError) {
        console.warn('Could not delete face image file:', fileError);
      }
      await faceData.deleteOne();
    }

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
    const employeesWithoutFace = await Employee.find({
      $or: [
        { hasFaceRegistered: false },
        { hasFaceRegistered: { $exists: false } }
      ],
      status: 'Active'
    })
      .populate('user', 'name email employeeId')
      .select('personalInfo workInfo hasFaceRegistered');

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
    formData.append('file', new Blob([imageBuffer], { type: req.file.mimetype }), req.file.filename);

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
        gender: face.gender,
        embedding: face.embedding
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

// @desc    Register face using continuous video recording
// @route   POST /api/face-detection/register-continuous-video
// @access  Private (Admin)
export const registerContinuousVideo = async (req, res) => {
  try {
    const { employeeId, frames } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    if (!frames || !Array.isArray(frames) || frames.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 10 video frames are required for registration' 
      });
    }

    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    let faceResult;
    try {
      faceResult = await callFaceServiceJSON('/register-continuous-video', { frames });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Face registration service error'
      });
    }

    if (!faceResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: faceResult.message || 'Face registration failed',
        poses_captured: faceResult.poses_captured,
        liveness_score: faceResult.liveness_score
      });
    }

    employee.faceEmbeddings = {
      front: faceResult.embeddings.front,
      left: faceResult.embeddings.left,
      right: faceResult.embeddings.right,
      average: faceResult.average_embedding
    };
    employee.faceQualityScores = faceResult.quality_scores;
    employee.faceDescriptor = faceResult.average_embedding;
    employee.hasFaceRegistered = true;
    employee.faceRegistrationDate = new Date();
    employee.faceRegistrationMethod = 'video';

    await employee.save();

    const existingFaceData = await FaceData.findOne({ employee: employeeId });
    if (existingFaceData) {
      existingFaceData.faceDescriptor = faceResult.average_embedding;
      existingFaceData.confidence = Math.round(faceResult.liveness_score * 100);
      existingFaceData.lastUpdated = new Date();
      existingFaceData.metadata = {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Continuous Video Registration',
        processingVersion: '3.0-InsightFace-Video'
      };
      await existingFaceData.save();
    } else {
      const faceData = new FaceData({
        employee: employeeId,
        user: employee.user._id,
        faceDescriptor: faceResult.average_embedding,
        landmarks: [],
        faceImageUrl: '',
        confidence: Math.round(faceResult.liveness_score * 100),
        metadata: {
          captureDevice: req.headers['user-agent'] || 'Unknown',
          captureEnvironment: 'Continuous Video Registration',
          processingVersion: '3.0-InsightFace-Video'
        }
      });
      await faceData.save();
    }

    res.json({ 
      success: true, 
      message: 'Face registered successfully with continuous video capture',
      poses_captured: faceResult.poses_captured,
      quality_scores: faceResult.quality_scores,
      liveness_score: faceResult.liveness_score,
      total_frames_processed: faceResult.total_frames_processed
    });

  } catch (error) {
    console.error('Continuous video registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during face registration' });
  }
};

// @desc    Verify face using live video with enhanced liveness detection
// @route   POST /api/face-detection/verify-live-video
// @access  Private (Employee)
export const verifyLiveVideo = async (req, res) => {
  try {
    const { frames, location } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 5 video frames are required for live verification' 
      });
    }

    const userLocation = (location && location.latitude !== undefined && location.longitude !== undefined)
      ? location
      : { latitude: 22.29867, longitude: 73.13130 };

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    let storedEmbeddings;
    if (employee.faceEmbeddings && employee.faceEmbeddings.average && employee.faceEmbeddings.average.length === 512) {
      storedEmbeddings = employee.faceEmbeddings;
    } else if (employee.faceDescriptor && employee.faceDescriptor.length === 512) {
      storedEmbeddings = { average: employee.faceDescriptor };
    } else {
      const faceData = await FaceData.findByEmployee(employee._id);
      if (!faceData || !faceData.faceDescriptor || faceData.faceDescriptor.length !== 512) {
        return res.status(404).json({ 
          success: false, 
          message: 'Face data not registered. Please register your face first.' 
        });
      }
      storedEmbeddings = { average: faceData.faceDescriptor };
    }

    let verifyResult;
    try {
      verifyResult = await callFaceServiceJSON('/verify-live-video', {
        frames: frames,
        stored_embeddings: storedEmbeddings
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Face verification service error', 
        error: error.message 
      });
    }

    if (!verifyResult.success || !verifyResult.liveness_passed) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Liveness check failed - verification denied',
        verification: {
          match: false,
          liveness_passed: false,
          liveness_score: verifyResult.liveness_score || 0,
          anti_spoof_score: verifyResult.anti_spoof_score || 0
        }
      });
    }

    if (!verifyResult.match) {
      return res.status(400).json({
        success: false,
        message: `Face verification failed. Confidence: ${Math.round(verifyResult.confidence)}%`,
        verification: {
          match: false,
          confidence: verifyResult.confidence,
          similarity: verifyResult.similarity,
          liveness_passed: true,
          liveness_score: verifyResult.liveness_score
        }
      });
    }

    const OFFICE_LOCATION = {
      latitude: 22.29867,
      longitude: 73.13130,
      radius: 999999
    };

    const distance = calculateGeoDistance(
      Number(userLocation.latitude),
      Number(userLocation.longitude),
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
          livenessScore: verifyResult.liveness_score,
          locationMatch: false,
          distance: Math.round(distance)
        }
      });
    }

    res.json({
      success: true,
      message: 'Live face verification successful',
      verification: {
        faceMatch: true,
        faceConfidence: verifyResult.confidence,
        similarity: verifyResult.similarity,
        livenessScore: verifyResult.liveness_score,
        antiSpoofScore: verifyResult.anti_spoof_score,
        locationMatch: true,
        distance: Math.round(distance)
      }
    });

  } catch (error) {
    console.error('Live video verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during face verification' });
  }
};

// @desc    Check liveness from video frames
// @route   POST /api/face-detection/check-liveness
// @access  Private
export const checkLiveness = async (req, res) => {
  try {
    const { frames } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least 3 video frames are required for liveness check' 
      });
    }

    let result;
    try {
      result = await callFaceServiceJSON('/check-liveness', { frames });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Liveness check service error', 
        error: error.message 
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Liveness check error:', error);
    res.status(500).json({ success: false, message: 'Server error during liveness check' });
  }
};
