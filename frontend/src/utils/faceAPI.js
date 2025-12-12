// utils/faceDetection.js - corrected & robust face detection utils
// NOTE: keep faceAPI (network functions) in this file as you had them

import api from './api';

export const faceAPI = {
  // Save employee face during registration
  saveEmployeeFace: async (employeeId, faceData) => {
    try {
      const formData = new FormData();
      formData.append('employeeId', employeeId);
      formData.append('descriptor', JSON.stringify(faceData.descriptor));
      formData.append('landmarks', JSON.stringify(faceData.landmarks || []));

      // Convert base64 image to blob
      if (faceData.thumbnail) {
        const response = await fetch(faceData.thumbnail);
        const blob = await response.blob();
        formData.append('faceImage', blob, 'face.jpg'); // backend expects "faceImage"
      }

      // do not set content-type header manually when sending FormData in browser;
      // letting the browser set the multipart/form-data boundary is safer.
      return await api.post('/api/face-detection/save-face', formData);
    } catch (error) {
      console.error('Error saving face data:', error);
      throw error;
    }
  },

  getEmployeeFace: async (employeeId) => {
    return await api.get(`/api/face-detection/employee/${employeeId}`);
  },

  verifyFaceAttendance: async (faceData, location) => {
    return await api.post('/api/face-detection/verify-attendance', {
      descriptor: faceData.descriptor,
      confidence: faceData.confidence,
      location: location
    });
  },

  deleteEmployeeFace: async (employeeId) => {
    return await api.delete(`/api/face-detection/employee/${employeeId}`);
  },

  getEmployeesWithoutFace: async () => {
    return await api.get('/api/face-detection/employees-without-face');
  }
};

// -------------------- FaceDetection & Camera Helpers --------------------

export class FaceDetectionHelper {
  constructor() {
    this.modelsLoaded = false;
    this.faceapi = null;
    // Default detector options (tweak inputSize if you need higher accuracy at cost of performance)
    this.tinyOptions = new Proxy({}, {
      get: (_, prop) => {
        // lazily create options after faceapi is available
        if (!this.faceapi) return undefined;
        return new this.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })[prop];
      }
    });
  }

  // Load face-api.js models from /models (public folder)
  async loadModels(modelsPath = '/models') {
    try {
      // Dynamic import with compatibility for default vs named export
      const mod = await import('face-api.js');
      const faceapi = mod.default || mod;
      this.faceapi = faceapi;

      // Try to set CPU backend if WebGL is not available
      const tf = faceapi.tf;
      if (tf) {
        try {
          const webglReady = await tf.setBackend('webgl').catch(() => false);
          if (!webglReady) {
            console.log('WebGL not available, switching to CPU backend...');
            await tf.setBackend('cpu');
          }
          await tf.ready();
          console.log('TensorFlow.js backend:', tf.getBackend());
        } catch (backendError) {
          console.warn('Backend setup warning:', backendError);
          try {
            await tf.setBackend('cpu');
            await tf.ready();
            console.log('Using CPU backend as fallback');
          } catch (cpuError) {
            console.warn('CPU backend also failed:', cpuError);
          }
        }
      }

      // Validate modelsPath accessibility (optional but helpful)
      try {
        const check = await fetch(`${modelsPath}/`);
        // we do not rely on check.ok strictly, because some servers may not list directories
      } catch (err) {
        console.warn(`Could not fetch ${modelsPath} — make sure models are served from ${modelsPath}`, err);
      }

      // Load minimal models we need
      await faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath);

      this.modelsLoaded = true;
      console.log('face-api models loaded from', modelsPath);
      return true;
    } catch (error) {
      console.error('Failed to load face detection models:', error);
      this.modelsLoaded = false;
      throw error;
    }
  }

  areModelsLoaded() {
    return this.modelsLoaded;
  }

  // Detect faces in a video HTML element
  async detectFaces(videoElement) {
    if (!this.modelsLoaded || !this.faceapi) {
      throw new Error('Face detection models not loaded');
    }
    if (!videoElement || videoElement.readyState < 2 /* HAVE_CURRENT_DATA */) {
      // Not enough video data yet
      return [];
    }

    try {
      // Use tinyFaceDetector with smaller inputSize for speed. Increase inputSize for better accuracy.
      const options = new this.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      const results = await this.faceapi
        .detectAllFaces(videoElement, options)
        .withFaceLandmarks()
        .withFaceDescriptors();

      return results || [];
    } catch (error) {
      console.error('Face detection error:', error);
      return [];
    }
  }

  // Draw detection results on a canvas overlay
  drawDetections(canvas, videoElement, detections) {
    if (!this.faceapi) return;

    // ensure canvas matches video size
    const width = videoElement.videoWidth || videoElement.clientWidth || 640;
    const height = videoElement.videoHeight || videoElement.clientHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const displaySize = { width, height };
    this.faceapi.matchDimensions(canvas, displaySize);

    const resized = this.faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext('2d');

    // clear then draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.faceapi.draw.drawDetections(canvas, resized);
    this.faceapi.draw.drawFaceLandmarks(canvas, resized);
  }

  getFaceDescriptor(detection) {
    if (!detection || !detection.descriptor) return null;
    return Array.from(detection.descriptor);
  }

  compareFaceDescriptors(descriptor1, descriptor2, threshold = 0.4) {
    if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
      console.log('Face comparison: Invalid descriptors');
      return { match: false, distance: 1, confidence: 0 };
    }
    
    if (descriptor1.length !== 128 || descriptor2.length !== 128) {
      console.log(`Face comparison: Invalid descriptor length - ${descriptor1.length}, ${descriptor2.length}`);
      return { match: false, distance: 1, confidence: 0 };
    }
    
    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      const a = Number(descriptor1[i]);
      const b = Number(descriptor2[i]);
      if (isNaN(a) || isNaN(b)) {
        return { match: false, distance: 1, confidence: 0 };
      }
      sum += Math.pow(a - b, 2);
    }
    const distance = Math.sqrt(sum);
    
    // Calculate confidence (100% at distance 0, decreasing as distance increases)
    const confidence = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
    
    // Require BOTH distance below threshold AND minimum 70% confidence
    const MIN_CONFIDENCE = 70;
    const distanceMatch = distance < threshold;
    const confidenceMatch = confidence >= MIN_CONFIDENCE;
    const match = distanceMatch && confidenceMatch;
    
    console.log(`Face comparison: distance=${distance.toFixed(4)}, threshold=${threshold}, confidence=${confidence}%, match=${match}`);
    
    return { match, distance, confidence };
  }

  captureFaceImage(videoElement, detection = null) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (detection && detection.detection && detection.detection.box) {
      const box = detection.detection.box;
      const margin = 20;
      const sx = Math.max(0, box.x - margin);
      const sy = Math.max(0, box.y - margin);
      const sw = Math.min(videoElement.videoWidth - sx, box.width + margin * 2);
      const sh = Math.min(videoElement.videoHeight - sy, box.height + margin * 2);

      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      // fallback: full frame scaled down
      const size = 150;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    }

    return canvas.toDataURL('image/jpeg', 0.8);
  }

  isValidDescriptor(descriptor) {
    return Array.isArray(descriptor) &&
           descriptor.length === 128 &&
           descriptor.every(val => typeof val === 'number' && !isNaN(val));
  }
}

// Singleton instance
export const faceDetectionHelper = new FaceDetectionHelper();

export class CameraHelper {
  constructor() {
    this.stream = null;
    this.videoElement = null;
  }

  // Start camera with safe defaults and set video element props for autoplay
  async startCamera(videoElement, constraints = {}) {
    if (!videoElement) throw new Error('videoElement is required');

    // set attributes to improve autoplay behavior
    try {
      videoElement.autoplay = true;
      videoElement.muted = true;      // works around autoplay policies
      videoElement.playsInline = true;
    } catch (err) {
      // ignore if element isn't standard
    }

    const defaultConstraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
        frameRate: { ideal: 30 }
      },
      audio: false
    };

    // merge video constraints safely
    const merged = {
      video: { ...defaultConstraints.video, ...(constraints.video || {}) },
      audio: constraints.audio ?? defaultConstraints.audio
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(merged);
      this.videoElement = videoElement;
      videoElement.srcObject = this.stream;

      // play the element and wait for it to be ready to avoid race conditions
      try {
        await videoElement.play();
      } catch (playErr) {
        // some browsers require user gesture to play; still set srcObject, and the element will show when user interacts
        console.warn('videoElement.play() failed (maybe requires user gesture):', playErr);
      }

      console.log('Camera started with constraints', merged);
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      // rethrow a friendly message
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera permission denied. Please allow camera access in site settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera device found.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('The selected camera constraints are not supported.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is already in use by another application.');
      }
      throw error;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      try { this.videoElement.srcObject = null; } catch (_) {}
      this.videoElement = null;
    }
  }

  async checkCameraPermission() {
    try {
      // Not all browsers support navigator.permissions.query for 'camera'
      // this may throw in Safari — fallback to 'unknown'
      const status = await navigator.permissions.query({ name: 'camera' });
      return status.state; // 'granted', 'denied', 'prompt'
    } catch (err) {
      console.warn('Permission API for camera not supported:', err);
      return 'unknown';
    }
  }

  async getCameraDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'videoinput');
    } catch (err) {
      console.error('Error getting camera devices:', err);
      return [];
    }
  }
}

export class FaceRegistrationWorkflow {
  constructor() {
    this.cameraHelper = new CameraHelper();
    this.detectionRAF = null;
    this.onFaceDetected = null;
    this.onNoFaceDetected = null;
    this.isRunning = false;
  }

  // initialize (load models + start camera + start detection)
  async initialize(videoElement, canvasElement, callbacks = {}, modelsPath = '/models') {
    try {
      // load models
      await faceDetectionHelper.loadModels(modelsPath);

      // Start camera (this may prompt permission)
      await this.cameraHelper.startCamera(videoElement);

      // callbacks
      this.onFaceDetected = callbacks.onFaceDetected || (() => {});
      this.onNoFaceDetected = callbacks.onNoFaceDetected || (() => {});

      // start detection loop
      this.isRunning = true;
      this._detectionLoop(videoElement, canvasElement);

      return true;
    } catch (err) {
      console.error('Face registration initialization error:', err);
      // cleanup any partially started camera
      this.cameraHelper.stopCamera();
      throw err;
    }
  }

  // detection loop driven by requestAnimationFrame for smoother results & less overlap
  async _detectionLoop(videoElement, canvasElement) {
    const runFrame = async () => {
      if (!this.isRunning) return;
      try {
        // only attempt detection if video is ready
        if (videoElement && videoElement.readyState >= 2 && faceDetectionHelper.areModelsLoaded()) {
          const detections = await faceDetectionHelper.detectFaces(videoElement);
          if (detections.length > 0) {
            faceDetectionHelper.drawDetections(canvasElement, videoElement, detections);
            try { this.onFaceDetected(detections); } catch (cbErr) { console.warn('onFaceDetected cb error', cbErr); }
          } else {
            // clear canvas
            if (canvasElement) {
              const ctx = canvasElement.getContext('2d');
              ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            }
            try { this.onNoFaceDetected(); } catch (cbErr) { console.warn('onNoFaceDetected cb error', cbErr); }
          }
        }
      } catch (err) {
        console.warn('Detection loop error:', err);
      } finally {
        this.detectionRAF = requestAnimationFrame(runFrame);
      }
    };

    this.detectionRAF = requestAnimationFrame(runFrame);
  }

  async captureFaceData(videoElement) {
    try {
      const detections = await faceDetectionHelper.detectFaces(videoElement);
      if (!detections || detections.length === 0) throw new Error('No face detected in current frame');

      const detection = detections[0];
      const descriptor = faceDetectionHelper.getFaceDescriptor(detection);

      if (!faceDetectionHelper.isValidDescriptor(descriptor)) {
        throw new Error('Invalid face descriptor generated');
      }

      const thumbnail = faceDetectionHelper.captureFaceImage(videoElement, detection);
      const landmarks = detection.landmarks ? detection.landmarks.positions.map(p => ({ x: p.x, y: p.y })) : [];

      return {
        descriptor,
        thumbnail,
        landmarks,
        confidence: Math.round((1 - detection.detection.score) * 100),
        boundingBox: detection.detection.box
      };
    } catch (err) {
      console.error('Face capture error:', err);
      throw err;
    }
  }

  cleanup() {
    this.isRunning = false;
    if (this.detectionRAF) cancelAnimationFrame(this.detectionRAF);
    this.detectionRAF = null;
    this.cameraHelper.stopCamera();
  }
}

// default export for convenience
export default {
  faceAPI,
  faceDetectionHelper,
  CameraHelper,
  FaceRegistrationWorkflow
};
