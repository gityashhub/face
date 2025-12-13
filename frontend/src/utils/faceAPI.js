import api from './api';

export const faceAPI = {
  saveEmployeeFace: async (employeeId, imageBlob) => {
    try {
      const formData = new FormData();
      formData.append('employeeId', employeeId);
      formData.append('file', imageBlob, 'face.jpg');

      return await api.post('/face-detection/save-face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Error saving face data:', error);
      throw error;
    }
  },

  getEmployeeFace: async (employeeId) => {
    return await api.get(`/face-detection/employee/${employeeId}`);
  },

  verifyFaceAttendance: async (imageBlob, location) => {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'face.jpg');
      formData.append('location', JSON.stringify(location));

      return await api.post('/face-detection/verify-attendance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Error verifying face:', error);
      throw error;
    }
  },

  deleteEmployeeFace: async (employeeId) => {
    return await api.delete(`/face-detection/employee/${employeeId}`);
  },

  getEmployeesWithoutFace: async () => {
    return await api.get('/face-detection/employees-without-face');
  },

  detectFaces: async (imageBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'face.jpg');

      return await api.post('/face-detection/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw error;
    }
  }
};

export class CameraHelper {
  constructor() {
    this.stream = null;
    this.videoElement = null;
  }

  async startCamera(videoElement, constraints = {}) {
    if (!videoElement) throw new Error('videoElement is required');

    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;

    const defaultConstraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
        frameRate: { ideal: 30 }
      },
      audio: false
    };

    const merged = {
      video: { ...defaultConstraints.video, ...(constraints.video || {}) },
      audio: constraints.audio ?? defaultConstraints.audio
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(merged);
      this.videoElement = videoElement;
      videoElement.srcObject = this.stream;

      await videoElement.play().catch(err => {
        console.warn('videoElement.play() failed:', err);
      });

      console.log('Camera started');
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera device found.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is in use by another application.');
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
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  captureImage(videoElement) {
    if (!videoElement) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  async captureImageBlob(videoElement) {
    if (!videoElement) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  }
}

export const cameraHelper = new CameraHelper();

export default {
  faceAPI,
  CameraHelper,
  cameraHelper
};
