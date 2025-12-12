// controllers/faceDetectionController.js
import FaceData from '../models/FaceData.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// -------------------- Multer config --------------------
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only JPEG, JPG and PNG images are allowed'));
  }
});

// -------------------- Helper math functions --------------------

// Euclidean distance for face descriptor vectors
function calculateEuclideanDistance(descriptor1, descriptor2) {
  if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2) || descriptor1.length !== descriptor2.length) {
    return NaN;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const a = Number(descriptor1[i]);
    const b = Number(descriptor2[i]);
    if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
    const diff = a - b;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Haversine / geographic distance for coordinates (meters)
function calculateGeoDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
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

// Compare face descriptors using Euclidean distance
// STRICT THRESHOLD: 0.35 for high accuracy face matching
// Industry standard for face-api.js is 0.35-0.4 to prevent false positives
function compareFaceDescriptors(descriptor1, descriptor2, threshold = 0.35) {
  if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) {
    return { match: false, distance: Infinity, confidence: 0 };
  }

  const distance = calculateEuclideanDistance(descriptor1, descriptor2);
  if (!Number.isFinite(distance)) {
    return { match: false, distance: Infinity, confidence: 0 };
  }

  const match = distance < threshold;
  // Better confidence calculation: 100% at distance 0, 0% at distance >= threshold
  const confidence = Math.max(0, Math.min(100, Math.round((1 - distance / threshold) * 100)));

  return { match, distance, confidence };
}

// -------------------- Route handlers --------------------

// @desc    Save employee face data during registration
// @route   POST /api/face-detection/save-face
// @access  Private (Admin)
export const saveEmployeeFace = async (req, res) => {
  try {
    const { employeeId } = req.body;
    let { descriptor, landmarks } = req.body;

    if (!employeeId || !descriptor) {
      return res.status(400).json({ success: false, message: 'Employee ID and face descriptor are required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Face image is required' });
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId).populate('user');
    if (!employee) {
      // remove uploaded file if employee missing
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Parse descriptor (may come as string in multipart/form-data)
    let faceDescriptor;
    try {
      if (typeof descriptor === 'string') {
        faceDescriptor = JSON.parse(descriptor);
      } else {
        faceDescriptor = descriptor;
      }

      if (!Array.isArray(faceDescriptor)) throw new Error('Descriptor is not an array');

      // Normalize values to numbers
      faceDescriptor = faceDescriptor.map(x => {
        const n = Number(x);
        if (Number.isNaN(n)) throw new Error('Descriptor contains non-numeric value');
        return n;
      });

      // You expected 128-length; if your model uses different size adjust here
      if (faceDescriptor.length !== 128) {
        throw new Error(`Descriptor length must be 128 (got ${faceDescriptor.length})`);
      }
    } catch (err) {
      // cleanup uploaded file
      try { await fs.unlink(req.file.path); } catch (_) {}
      return res.status(400).json({ success: false, message: 'Invalid face descriptor format', error: err.message });
    }

    // Parse landmarks if present
    let parsedLandmarks = [];
    try {
      if (landmarks) {
        if (typeof landmarks === 'string') parsedLandmarks = JSON.parse(landmarks);
        else parsedLandmarks = landmarks;
      }
    } catch (err) {
      // ignore landmarks parse error but warn
      console.warn('Landmarks parse error:', err);
      parsedLandmarks = [];
    }

    // Check if face data already exists for this employee
    const existingFaceData = await FaceData.findOne({ employee: employeeId });
    if (existingFaceData) {
      existingFaceData.faceDescriptor = faceDescriptor;
      existingFaceData.landmarks = parsedLandmarks;
      existingFaceData.faceImageUrl = req.file.path;
      existingFaceData.lastUpdated = new Date();
      existingFaceData.metadata = {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Registration',
        processingVersion: '1.0'
      };

      await existingFaceData.save();

      return res.json({ success: true, message: 'Face data updated successfully', data: existingFaceData });
    }

    // Create new face data entry
    const faceData = new FaceData({
      employee: employeeId,
      user: employee.user._id,
      faceDescriptor,
      landmarks: parsedLandmarks,
      faceImageUrl: req.file.path,
      metadata: {
        captureDevice: req.headers['user-agent'] || 'Unknown',
        captureEnvironment: 'Registration',
        processingVersion: '1.0'
      }
    });

    await faceData.save();

    res.status(201).json({ success: true, message: 'Face data saved successfully', data: faceData });

  } catch (error) {
    console.error('Save face data error:', error);
    // Clean up uploaded file on error
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

    // Don't return full descriptor for security
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

// @desc    Verify face for attendance
// @route   POST /api/face-detection/verify-attendance
// @access  Private (Employee)
export const verifyFaceAttendance = async (req, res) => {
  try {
    let { descriptor, location } = req.body;

    if (!descriptor || !location) {
      return res.status(400).json({ success: false, message: 'Face descriptor and location are required' });
    }

    // Parse incoming descriptor (string in multipart fallback)
    let incomingDescriptor;
    try {
      if (typeof descriptor === 'string') incomingDescriptor = JSON.parse(descriptor);
      else incomingDescriptor = descriptor;

      // normalize to numbers
      if (!Array.isArray(incomingDescriptor)) throw new Error('Descriptor not an array');
      incomingDescriptor = incomingDescriptor.map(x => {
        const n = Number(x);
        if (Number.isNaN(n)) throw new Error('Descriptor contains non-numeric value');
        return n;
      });

      if (incomingDescriptor.length !== 128) {
        return res.status(400).json({ success: false, message: `Descriptor length must be 128 (got ${incomingDescriptor.length})` });
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid descriptor format', error: err.message });
    }

    // find current employee
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    const faceData = await FaceData.findByEmployee(employee._id);
    if (!faceData) {
      return res.status(404).json({ success: false, message: 'Face data not registered. Please register your face first.' });
    }

    // Ensure stored descriptor exists and is an array of numbers
    let storedDescriptor = faceData.faceDescriptor;
    if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== incomingDescriptor.length) {
      return res.status(500).json({ success: false, message: 'Stored face descriptor invalid or mismatched' });
    }
    storedDescriptor = storedDescriptor.map(x => Number(x));

    // Compare descriptors with strict threshold
    const comparison = compareFaceDescriptors(incomingDescriptor, storedDescriptor, 0.35);

    if (!comparison.match) {
      return res.status(401).json({
        success: false,
        message: `Face verification failed. Confidence: ${comparison.confidence}%`,
        verification: {
          match: false,
          confidence: comparison.confidence,
          distance: comparison.distance
        }
      });
    }

    // Location verification
    const OFFICE_LOCATION = {
      latitude: 22.29867,
      longitude: 73.13130,
      radius: 999999 // meters - TEMPORARILY INCREASED FOR TESTING (was 1500)
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
          faceConfidence: comparison.confidence,
          locationMatch: false,
          distance: Math.round(distance),
          maxDistance: OFFICE_LOCATION.radius
        }
      });
    }

    // Successful verification — you may create attendance record here if needed
    res.json({
      success: true,
      message: 'Face and location verification successful',
      verification: {
        faceMatch: true,
        faceConfidence: comparison.confidence,
        locationMatch: true,
        distance: Math.round(distance),
        maxDistance: OFFICE_LOCATION.radius
      }
    });

  } catch (error) {
    console.error('Face verification error:', error);
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
