import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { Camera, Save, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../utils/api';
import { faceAPI, cameraHelper } from '../../utils/faceAPI';

const AdminFaceRegistration = () => {
  const videoRef = useRef();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    startVideo();

    return () => {
      cameraHelper.stopCamera();
    };
  }, []);

  const startVideo = async () => {
    try {
      setLoading(true);
      await cameraHelper.startCamera(videoRef.current);
      setCameraReady(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast.error(error.message || 'Failed to access camera');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getEmployees({ 
        limit: 100,
        status: 'Active'
      });

      const employeesData = Array.isArray(response.data.data?.employees) 
        ? response.data.data.employees 
        : [];

      setEmployees(employeesData);

      if (employeesData.length === 0) {
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
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    if (!cameraReady || !videoRef.current) {
      toast.error('Camera not ready. Please wait or refresh the page.');
      return;
    }

    try {
      setIsScanning(true);
      
      const imageBlob = await cameraHelper.captureImageBlob(videoRef.current);
      
      if (!imageBlob) {
        toast.error('Failed to capture image. Please try again.');
        return;
      }

      console.log('Sending image to backend for face detection...');
      
      const response = await faceAPI.saveEmployeeFace(selectedEmployee._id, imageBlob);

      if (response.data.success) {
        toast.success('Face registered successfully!');
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        toast.error(response.data.message || 'Failed to register face');
      }
    } catch (error) {
      console.error('Error registering face:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to register face';
      toast.error(errorMsg);
    } finally {
      setIsScanning(false);
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

          <div className="glass-morphism neon-border rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4">Face Scan</h2>
            
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                width="640"
                height="480"
                className="w-full"
                autoPlay
                muted
                playsInline
                style={{ objectFit: 'cover', transform: 'scaleX(-1)' }}
              />

              {loading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-pink mx-auto mb-2"></div>
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}

              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded">
                <p>Camera: {cameraReady ? '✅ Ready' : '⏳ Starting...'}</p>
                <p>Selected: {selectedEmployee ? selectedEmployee.personalInfo?.firstName : 'None'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-4 p-3 bg-secondary-800/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${cameraReady ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
              <span className="text-sm text-secondary-400">
                {cameraReady ? 'Camera ready - Position face in frame and click Register' : 'Starting camera...'}
              </span>
            </div>

            <button
              onClick={handleRegisterFace}
              disabled={!selectedEmployee || !cameraReady || isScanning}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>{isScanning ? 'Registering...' : 'Register Face'}</span>
            </button>

            <p className="text-xs text-secondary-400 mt-2 text-center">
              Face detection is processed server-side for better accuracy
            </p>
          </div>
        </div>

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
                <p className="text-white font-medium">Stay Still</p>
                <p className="text-secondary-400">Keep your head steady while registering</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFaceRegistration;
