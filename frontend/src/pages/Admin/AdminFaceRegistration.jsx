import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { Camera, Save, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as faceapi from 'face-api.js';
import { employeeAPI } from '../../utils/api';

const AdminFaceRegistration = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    loadModels();
    fetchEmployees();

    return () => {
      // Cleanup on unmount
      if (videoRef.current && videoRef.current.detectionInterval) {
        clearInterval(videoRef.current.detectionInterval);
      }
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      
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

      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      setModelsLoaded(true);
      await startVideo();
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load face recognition models');
    } finally {
      setLoading(false);
    }
  };

  const startVideo = async () => {
    try {
      console.log('🎥 Starting video stream...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        }
      });

      console.log('✅ Camera access granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.width = '100%';
        videoRef.current.style.height = 'auto';

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 Video metadata loaded, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        };

        videoRef.current.oncanplay = () => {
          console.log('🎬 Video can play');
        };
      }
    } catch (err) {
      console.error('❌ Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please allow camera permissions in browser settings.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No camera found. Please connect a camera device.');
      } else if (err.name === 'NotReadableError') {
        toast.error('Camera is being used by another application.');
      } else {
        toast.error('Camera error: ' + err.message);
      }
    }
  };

 const fetchEmployees = async () => {
  try {
    const response = await employeeAPI.getEmployees({ 
      limit: 100,
      status: 'Active'
    });

    console.log('Raw API response:', response);
    console.log('Fetched ', response.data.data);

    // ✅ Extract employees array correctly
    const employeesData = Array.isArray(response.data.data?.employees) 
      ? response.data.data.employees 
      : [];

    setEmployees(employeesData);

    if (employeesData.length === 0) {
      console.warn('No employees found or invalid data structure');
      toast('No active employees found for face registration', {
        icon: 'ℹ️',
        style: { background: '#333', color: '#fff' }
      });
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    toast.error('Failed to fetch employees');
    setEmployees([]);
  }
};
 const handleRegisterFace = async () => {
  console.log('👉 handleRegisterFace called');
  console.log('Selected Employee:', selectedEmployee);
  console.log('Face detected:', faceDetected);
  console.log('Is scanning:', isScanning);

  if (!selectedEmployee) {
    toast.error('Please select an employee');
    return;
  }

  if (!faceDetected) {
    toast.error('No face detected. Please position your face in the frame');
    return;
  }

  try {
    setIsScanning(true);
    
    console.log('🔍 Starting face detection...');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    const detections = await faceapi.detectAllFaces(
      video, 
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptors();

    console.log('📷 Detections:', detections);

    if (detections.length === 0) {
      toast.error('No face detected in current frame');
      return;
    }

    const descriptor = detections[0].descriptor;
    const descriptorArray = Array.from(descriptor);

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 150;
    thumbCanvas.height = 150;
    const ctx = thumbCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, 150, 150);
    const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

    console.log('📤 Sending to backend...');
    
    const response = await employeeAPI.updateEmployee(selectedEmployee._id, {
      faceDescriptor: descriptorArray,
      faceImage: thumbnail,
      hasFaceRegistered: true
    });

    console.log('✅ Backend response:', response);

    if (response.data.success) {
      toast.success('Face registered successfully!');
      
      // ✅ STOP FACE DETECTION AFTER SUCCESS
      if (videoRef.current && videoRef.current.detectionInterval) {
        clearInterval(videoRef.current.detectionInterval);
        videoRef.current.detectionInterval = null;
      }

      setSelectedEmployee(null);
      fetchEmployees();
    }
  } catch (error) {
    console.error('❌ Error registering face:', error);
    toast.error('Failed to register face');
  } finally {
    setIsScanning(false);
  }
};

  const handleVideoPlay = () => {
    console.log('🎬 Video started playing, starting face detection...');

    const intervalId = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) {
        console.log('❌ Video or canvas ref not available');
        clearInterval(intervalId);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('⏳ Waiting for video dimensions...');
        return;
      }

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      console.log('📐 Display size:', displaySize);

      // Set canvas dimensions to match video
      canvas.width = displaySize.width;
      canvas.height = displaySize.height;

      try {
        console.log('🔍 Detecting faces...');
        const detections = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
          })
        ).withFaceLandmarks().withFaceDescriptors();

        console.log('📷 Detections found:', detections.length);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections.length > 0) {
          // Draw detections with semi-transparent overlay
          ctx.globalAlpha = 0.3;
          faceapi.draw.drawDetections(canvas, detections);
          faceapi.draw.drawFaceLandmarks(canvas, detections);
          ctx.globalAlpha = 1.0;

          setFaceDetected(true);
          console.log('✅ Face detected successfully');
        } else {
          setFaceDetected(false);
          console.log('❌ No face detected');
        }
      } catch (error) {
        console.warn('⚠️ Face detection error (continuing):', error);
        setFaceDetected(false);
      }
    }, 500); // Increased interval for better performance

    // ✅ Store interval on videoRef for cleanup
    if (videoRef.current) {
      videoRef.current.detectionInterval = intervalId;
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Face <span className="neon-text">Registration</span>
          </h1>
          <p className="text-secondary-400">Register employee faces for secure attendance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Employee Selection */}
          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Select Employee</h2>
            <div className="space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
              {employees.length === 0 ? (
                <p className="text-secondary-400 text-center py-4">No active employees found</p>
              ) : (
                employees.map(employee => (
                  <div
                    key={employee._id}
                    onClick={() => setSelectedEmployee(employee)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedEmployee?._id === employee._id
                        ? 'bg-neon-pink/20 border border-neon-pink'
                        : 'bg-secondary-800/50 hover:bg-secondary-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-lg flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {employee.personalInfo?.firstName} {employee.personalInfo?.lastName}
                        </p>
                        <p className="text-xs text-secondary-400">
                          ID: {employee.employeeId} • {employee.workInfo?.department}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Camera Feed */}
          <div className="glass-morphism neon-border rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4">Face Scan</h2>
            
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                onPlay={handleVideoPlay}
                width="640"
                height="480"
                className="w-full"
                autoPlay
                muted
                style={{ objectFit: 'cover', transform: 'scaleX(-1)' }}
              ></video>
              <canvas
                ref={canvasRef}
                width="640"
                height="480"
                className="absolute top-0 left-0 w-full pointer-events-none"
                style={{ objectFit: 'cover', transform: 'scaleX(-1)' }}
              ></canvas>

              {loading && !modelsLoaded && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-pink mx-auto mb-2"></div>
                    <p>Loading face models...</p>
                  </div>
                </div>
              )}

              {/* Debug overlay */}
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded">
                <p>Video: {videoRef.current ? 'Ready' : 'Not ready'}</p>
                <p>Canvas: {canvasRef.current ? 'Ready' : 'Not ready'}</p>
                <p>Models: {modelsLoaded ? '✅' : '⏳'}</p>
                <p>Face: {faceDetected ? '✅' : '❌'}</p>
              </div>
            </div>

            {/* Test Camera Button */}
            <button
              onClick={async () => {
                try {
                  console.log('🧪 Testing camera...');
                  const testStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                      facingMode: 'user',
                      width: { ideal: 640 },
                      height: { ideal: 480 }
                    }
                  });

                  toast.success('✅ Camera working! Testing for 3 seconds...');

                  // Show test video
                  const testVideo = document.createElement('video');
                  testVideo.srcObject = testStream;
                  testVideo.play();
                  testVideo.style.position = 'fixed';
                  testVideo.style.top = '10px';
                  testVideo.style.right = '10px';
                  testVideo.style.width = '320px';
                  testVideo.style.height = '240px';
                  testVideo.style.zIndex = '1000';
                  testVideo.style.border = '2px solid #00ff00';
                  document.body.appendChild(testVideo);

                  setTimeout(() => {
                    testStream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(testVideo);
                  }, 3000);
                } catch (error) {
                  console.error('❌ Camera test failed:', error);
                  toast.error('❌ Camera test failed: ' + error.message);
                }
              }}
              className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              🎥 Test Camera
            </button>

            <div className="flex items-center space-x-2 mt-4 p-3 bg-secondary-800/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-sm text-secondary-400">
                {faceDetected ? 'Face detected - Ready to register' : 'No face detected - Position face in frame'}
              </span>
            </div>

          <button
  onClick={handleRegisterFace}
  disabled={!selectedEmployee || !faceDetected || isScanning}
  className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Save className="w-5 h-5" />
  <span>{isScanning ? 'Registering...' : 'Register Face'}</span>
</button>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-neon-pink mt-0.5" />
              <div>
                <p className="text-white font-medium">Good Lighting</p>
                <p className="text-secondary-400">Ensure your face is well-lit and clearly visible</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-neon-pink mt-0.5" />
              <div>
                <p className="text-white font-medium">Center Your Face</p>
                <p className="text-secondary-400">Look directly at the camera with neutral expression</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-neon-pink mt-0.5" />
              <div>
                <p className="text-white font-medium">No Obstructions</p>
                <p className="text-secondary-400">Remove hats, glasses, or anything covering your face</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-neon-pink mt-0.5" />
              <div>
                <p className="text-white font-medium">Multiple Angles</p>
                <p className="text-secondary-400">Consider registering from slightly different angles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFaceRegistration;