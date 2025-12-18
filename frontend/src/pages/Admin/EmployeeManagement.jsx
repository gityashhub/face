import React, { useState, useEffect, useRef } from 'react';
import { employeeAPI, departmentAPI } from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { faceAPI, cameraHelper } from '../../utils/faceAPI';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Mail,
  User,
  X,
  Save,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Camera
} from 'lucide-react';
import toast from 'react-hot-toast';


// ================================
// EXTRACTED AddEmployeeModal Component
// ================================
const AddEmployeeModal = ({
  show,
  onClose,
  currentStep,
  setCurrentStep,
  newEmployee,
  setNewEmployee,
  departments,
  faceRegistrationEnabled,
  setFaceRegistrationEnabled,
  modelsLoaded,
  faceDetected,
  isScanning,
  capturedFaceData,
  setCapturedFaceData,
  capturedDescriptors,
  setCapturedDescriptors,
  posesCaptured,
  setPosesCaptured,
  videoRef,
  canvasRef,
  startCamera,
  captureCurrentPose,
  handleCreateEmployee,
  handleFormNext,
  resetForm
}) => {
  const updateEmployee = (field, value, nestedField = null, subNestedField = null) => {
    if (subNestedField) {
      setNewEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: {
            ...prev[field][nestedField],
            [subNestedField]: value
          }
        }
      }));
    } else if (nestedField) {
      setNewEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value
        }
      }));
    } else {
      setNewEmployee(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  const genders = ['Male', 'Female', 'Other'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  const workLocations = ['Office', 'Remote', 'Hybrid'];
  const workShifts = ['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'];
  const accountTypes = ['Savings', 'Current'];
  if (!show) return null;
  const POSES = [
    { name: 'front', instruction: 'Look straight ahead at the camera. Keep your head level.', emoji: '�️' }
  ];
  const currentPoseIndex = posesCaptured.length;
  const currentPose = currentPoseIndex < POSES.length ? POSES[currentPoseIndex] : null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Enhanced backdrop with blur - Click to close */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => {
          resetForm();
          onClose();
        }}
      />

      {/* Modal content - Prevent click propagation */}
      <div
        className="relative glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6 w-full max-w-full sm:max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center flex-wrap gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Add New Employee</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                currentStep >= 1 ? 'bg-neon-pink text-white' : 'bg-secondary-600 text-secondary-400'
              }`}>
                1
              </div>
              <div className={`w-6 h-1 ${currentStep >= 2 ? 'bg-neon-pink' : 'bg-secondary-600'}`}></div>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                currentStep >= 2 ? 'bg-neon-pink text-white' : 'bg-secondary-600 text-secondary-400'
              }`}>
                2
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-green-400">
              <Camera className="w-4 h-4" />
              <span>Face Registration Required</span>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="text-secondary-400 hover:text-white transition-colors"
              aria-label="Close modal"
              type="button"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
        {currentStep === 1 ? (
          <form onSubmit={handleFormNext} className="space-y-6 sm:space-y-8">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white border-b border-secondary-600 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">First Name *</label>
                  <input
                    type="text"
                    value={newEmployee.personalInfo.firstName}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'firstName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={newEmployee.personalInfo.lastName}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'lastName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={newEmployee.personalInfo.dateOfBirth}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'dateOfBirth')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Gender *</label>
                  <select
                    value={newEmployee.personalInfo.gender}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'gender')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  >
                    <option value="">Select Gender</option>
                    {genders.map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Blood Group</label>
                  <select
                    value={newEmployee.personalInfo.bloodGroup}
                    onChange={(e) => updateEmployee('personalInfo', e.target.value, 'bloodGroup')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white border-b border-secondary-600 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Email *</label>
                  <input
                    type="email"
                    value={newEmployee.contactInfo.personalEmail}
                    onChange={(e) => updateEmployee('contactInfo', e.target.value, 'personalEmail')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={newEmployee.contactInfo.phone}
                    onChange={(e) => updateEmployee('contactInfo', e.target.value, 'phone')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-sm sm:text-md font-semibold text-white mb-2 sm:mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Name *</label>
                      <input
                        type="text"
                        value={newEmployee.contactInfo.emergencyContact.name}
                        onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'name')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Relationship *</label>
                      <input
                        type="text"
                        value={newEmployee.contactInfo.emergencyContact.relationship}
                        onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'relationship')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Phone *</label>
                      <input
                        type="tel"
                        value={newEmployee.contactInfo.emergencyContact.phone}
                        onChange={(e) => updateEmployee('contactInfo', e.target.value, 'emergencyContact', 'phone')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white border-b border-secondary-600 pb-2">Work Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Position *</label>
                  <input
                    type="text"
                    value={newEmployee.workInfo.position}
                    onChange={(e) => updateEmployee('workInfo', e.target.value, 'position')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Department *</label>
                  <select
                    value={newEmployee.workInfo.department}
                    onChange={(e) => updateEmployee('workInfo', e.target.value, 'department')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Basic Salary *</label>
                  <input
                    type="number"
                    value={newEmployee.salaryInfo.basicSalary}
                    onChange={(e) => updateEmployee('salaryInfo', parseFloat(e.target.value) || 0, 'basicSalary')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>
            {/* Bank Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white border-b border-secondary-600 pb-2">Bank Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.accountHolderName}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'accountHolderName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Account Number</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.accountNumber}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'accountNumber')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.bankName}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'bankName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Branch Name</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.branchName}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'branchName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={newEmployee.bankInfo.ifscCode}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value.toUpperCase(), 'ifscCode')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Account Type</label>
                  <select
                    value={newEmployee.bankInfo.accountType}
                    onChange={(e) => updateEmployee('bankInfo', e.target.value, 'accountType')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-secondary-600">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 border border-secondary-600 text-secondary-300 text-sm rounded-lg hover:bg-secondary-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold text-sm rounded-lg hover-glow transition-all duration-300"
              >
                Next: Face Registration
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-2">
                Face Registration for {newEmployee.personalInfo.firstName} {newEmployee.personalInfo.lastName}
              </h3>
              <p className="text-secondary-400 text-sm">Position your face directly in front of the camera</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Camera Feed */}
              <div className="space-y-3 sm:space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[300px] sm:max-h-[360px] w-full">
                  <video
                    ref={videoRef}
                    width="640"
                    height="480"
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    width="640"
                    height="480"
                    className="absolute top-0 left-0 w-full h-full"
                  />
                  {!modelsLoaded && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-neon-pink mx-auto mb-1 sm:mb-2"></div>
                        <p className="text-xs sm:text-sm">Loading face models... (one-time setup)</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-secondary-800/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${faceDetected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                    <span className="text-xs sm:text-sm text-secondary-400">
                      {faceDetected ? 'Face detected - Ready to capture' : 'No face detected - Position face in frame'}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-secondary-500">
                    {modelsLoaded ? 'Models ready' : 'Loading...'}
                  </div>
                </div>
              </div>
              {/* Instructions & Actions */}
              <div className="space-y-4 sm:space-y-6">
                {/* Pose Progress */}
                {posesCaptured.length > 0 && (
                  <div className="bg-secondary-800/30 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      <span className="text-sm sm:text-white font-medium">Face Captured Successfully!</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      {POSES.map(pose => (
                        <div key={pose.name} className={`text-center p-1.5 sm:p-2 rounded text-[10px] sm:text-xs font-medium ${
                          posesCaptured.includes(pose.name)
                            ? 'bg-green-400/20 text-green-400'
                            : 'bg-secondary-700 text-secondary-400'
                        }`}>
                          {pose.name === 'up' ? 'Top' : pose.name.charAt(0).toUpperCase() + pose.name.slice(1)}
                        </div>
                      ))}
                    </div>
                    {capturedDescriptors.length > 0 && (
                      <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                        {capturedDescriptors.map((faceData, index) => (
                          <div key={index} className="text-center">
                            <img
                              src={faceData.thumbnail}
                              alt={`Front face`}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded object-cover border border-secondary-600 mx-auto mb-1"
                            />
                            <p className="text-[10px] sm:text-xs text-secondary-400">Front Face</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Dynamic Instruction */}
                <div className="bg-secondary-800/30 rounded-lg p-3 sm:p-4">
                  <div className="text-center mb-3 sm:mb-4">
                    <div className="text-xl sm:text-2xl font-bold text-neon-pink mb-1 sm:mb-2">
                      {currentPose 
                        ? `${currentPose.emoji} ${currentPose.instruction}` 
                        : '✅ All poses captured!'}
                    </div>
                    <p className="text-secondary-300 text-xs sm:text-sm">
                      {currentPose 
                        ? 'Position your face as shown, then click “Capture This Pose”' 
                        : 'Face registration complete!'}
                    </p>
                  </div>
                  <div className="flex justify-center space-x-1.5 sm:space-x-2 mb-2 sm:mb-3">
                    {POSES.map((pose, index) => (
                      <div key={pose.name} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors ${
                        posesCaptured.includes(pose.name) ? 'bg-green-400' :
                        posesCaptured.length === index ? 'bg-neon-pink animate-pulse' : 'bg-secondary-600'
                      }`} />
                    ))}
                  </div>
                  <div className="text-center text-[10px] sm:text-xs text-secondary-400">
                    {posesCaptured.length > 0 ? 'Face captured!' : 'Ready to capture'}
                  </div>
                </div>
                {!capturedFaceData ? (
                  <button
                    onClick={captureCurrentPose}
                    disabled={isScanning || posesCaptured.length >= 1}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold text-sm rounded-lg hover-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{isScanning ? 'Capturing...' : 'Capture This Pose'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCapturedFaceData(null);
                      setCapturedDescriptors([]);
                      setPosesCaptured([]);
                      startCamera();
                    }}
                    className="w-full py-2.5 sm:py-3 border border-secondary-600 text-secondary-300 text-sm rounded-lg hover:bg-secondary-700/50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Recapture Face</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-secondary-600">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 sm:px-6 py-2.5 sm:py-3 border border-secondary-600 text-secondary-300 text-sm rounded-lg hover:bg-secondary-700/50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateEmployee}
                disabled={!capturedFaceData}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold text-sm rounded-lg hover-glow transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Create Employee {capturedFaceData ? 'with Face Data' : ''}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ================================
// MAIN COMPONENT
// ================================
const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [faceRegistrationEnabled, setFaceRegistrationEnabled] = useState(true); // Face registration is now COMPULSORY
  const [globalModelsLoaded, setGlobalModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedFaceData, setCapturedFaceData] = useState(null);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [posesCaptured, setPosesCaptured] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const POSES = [
    { name: 'front', instruction: 'Look straight ahead at the camera. Keep your head level.', emoji: '�️' }
  ];
  const [newEmployee, setNewEmployee] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      nationality: 'Indian',
      maritalStatus: 'Single',
      bloodGroup: ''
    },
    contactInfo: {
      phone: '',
      alternatePhone: '',
      personalEmail: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    },
    workInfo: {
      position: '',
      department: '',
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'Full-time',
      workLocation: 'Office',
      team: '',
      skills: [],
      workShift: 'Morning'
    },
    salaryInfo: {
      basicSalary: 0,
      allowances: {
        hra: 0,
        medical: 0,
        transport: 0,
        other: 0
      },
      deductions: {
        pf: 0,
        esi: 0,
        tax: 0,
        other: 0
      },
      currency: 'INR',
      payFrequency: 'Monthly'
    },
    bankInfo: {
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      branchName: '',
      ifscCode: '',
      accountType: 'Savings'
    }
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startFaceDetection();
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Please allow camera access to register face');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (videoRef.current?.detectionInterval) {
      clearInterval(videoRef.current.detectionInterval);
    }
  };

  // ✅ Draw unique hexagon instead of square
  const drawHexagon = (ctx, x, y, width, height) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.max(width, height) * 0.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = centerX + radius * Math.cos(angle);
      const hy = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
  };

  const startFaceDetection = async () => {
    // Simplified face detection - just assume face is present if camera is ready
    // This avoids the timeout issues with continuous detection
    console.log('Face detection simplified - assuming face is present when camera is ready');

    // Set face detected to true after a short delay to allow camera to initialize
    setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        setFaceDetected(true);
        console.log('Camera ready - face detection enabled');
      }
    }, 1000);

    // Optional: You can still draw a guide box without actual detection
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw a centered guide box
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const boxWidth = canvas.width * 0.6;
        const boxHeight = canvas.height * 0.8;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(
          centerX - boxWidth / 2,
          centerY - boxHeight / 2,
          boxWidth,
          boxHeight
        );
        ctx.setLineDash([]);
      }
    }
  };

  const captureCurrentPose = async () => {
    // Removed face detection check - we'll validate during capture instead
    const currentPoseIndex = posesCaptured.length;
    if (currentPoseIndex >= POSES.length) {
      toast.error('Face already captured.');
      return false;
    }
    setIsScanning(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsScanning(false);
      toast.error('Capture timeout. Please try again.');
    }, 120000); // 120 second timeout

    try {
      // Capture image as base64
      const imageBase64 = cameraHelper.captureImage(videoRef.current);
      if (!imageBase64) {
        clearTimeout(timeoutId);
        toast.error('Failed to capture image. Please try again.');
        setIsScanning(false);
        return false;
      }

      console.log('Captured image size:', imageBase64.length, 'characters');

      // Use the new analyzeFrameBase64 endpoint with error handling
      let response;
      try {
        console.log('Sending request to analyze frame...');
        response = await Promise.race([
          faceAPI.analyzeFrameBase64(imageBase64),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - server took too long to respond')), 90000)
          )
        ]);
        console.log('Response received:', response.data);
      } catch (apiError) {
        clearTimeout(timeoutId);
        console.error('API call error:', apiError);

        // More specific error messages
        if (apiError.message && apiError.message.includes('timeout')) {
          toast.error('Request timeout. The server is taking too long. Please try again.');
        } else if (apiError.code === 'ERR_NETWORK') {
          toast.error('Network error. Please check if the backend server is running.');
        } else if (apiError.response?.status === 413) {
          toast.error('Image too large. Please try with better lighting.');
        } else {
          toast.error(`Error: ${apiError.message || 'Network error. Please try again.'}`);
        }

        setIsScanning(false);
        return false;
      }

      clearTimeout(timeoutId);

      if (!response.data?.success || !response.data?.face_detected) {
        toast.error(response.data?.message || 'No face detected. Please try again.');
        setIsScanning(false);
        return false;
      }

      const faceDescriptor = response.data.face.descriptor;
      if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
        toast.error('Invalid face descriptor. Please try again.');
        setIsScanning(false);
        return false;
      }

      // Create thumbnail from captured image
      const thumbnail = imageBase64;
      const confidence = response.data.quality?.score
        ? Math.round(response.data.quality.score * 100)
        : 90;

      const faceData = {
        pose: POSES[currentPoseIndex].name,
        descriptor: faceDescriptor,
        thumbnail: thumbnail,
        confidence: confidence
      };

      setCapturedDescriptors(prev => [...prev, faceData]);
      setPosesCaptured(prev => [...prev, POSES[currentPoseIndex].name]);
      toast.success(`Front face captured successfully!`);

      // Since we only capture one pose now, immediately set the face data
      setCapturedFaceData({
        descriptors: [faceData],
        averageDescriptor: faceDescriptor,
        thumbnail: thumbnail,
        confidence: confidence
      });
      toast.success('Face registration complete!');

      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error capturing face:', error);
      toast.error('Failed to capture face data. Please try again.');
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getEmployees();
      if (response.data.success) {
        const employeeData = response.data.data?.employees || [];
        const enrichedEmployees = employeeData.map(emp => {
          // Check multiple possible indicators of face registration
          const hasFaceRegistered =
            emp.hasFaceRegistered === true ||
            (Array.isArray(emp.faceDescriptor) && (emp.faceDescriptor.length === 128 || emp.faceDescriptor.length === 512)) ||
            !!emp.faceImage;
          return {
            ...emp,
            hasFaceRegistered // explicitly set the flag
          };
        });
        setEmployees(enrichedEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    setGlobalModelsLoaded(true); // No local model loading needed - using backend service
    return () => stopCamera();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await departmentAPI.getDepartments();
        if (response.data.success) {
          setDepartments(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (showAddModal && currentStep === 2 && faceRegistrationEnabled && globalModelsLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showAddModal, currentStep, faceRegistrationEnabled, globalModelsLoaded]);

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.personalInfo?.firstName || ''} ${emp.personalInfo?.lastName || ''}`.toLowerCase();
    const userEmail = emp.user?.email?.toLowerCase() || '';
    const position = emp.workInfo?.position?.toLowerCase() || '';
    const employeeId = emp.employeeId?.toLowerCase() || emp.user?.employeeId?.toLowerCase() || '';
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         userEmail.includes(searchTerm.toLowerCase()) ||
                         position.includes(searchTerm.toLowerCase()) ||
                         employeeId.includes(searchTerm.toLowerCase());
    const departmentName = typeof emp.workInfo?.department === 'object'
      ? emp.workInfo.department.name
      : emp.workInfo?.department;
    const matchesDepartment = !filterDepartment || departmentName === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleFormNext = (e) => {
    e.preventDefault();
    if (!newEmployee.personalInfo.firstName || !newEmployee.personalInfo.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    if (!newEmployee.contactInfo.personalEmail) {
      toast.error('Email is required');
      return;
    }
    if (!newEmployee.workInfo.position || !newEmployee.workInfo.department) {
      toast.error('Position and department are required');
      return;
    }
    // Face registration is now COMPULSORY - always go to step 2
    setCurrentStep(2);
  };

  const handleCreateEmployee = async () => {
    try {
      let employeeDataWithFace = { ...newEmployee };
      if (capturedFaceData) {
        // ✅ Send average face descriptor (128-number array)
        employeeDataWithFace.faceDescriptor = capturedFaceData.averageDescriptor;
        employeeDataWithFace.faceImage = capturedFaceData.thumbnail;
        employeeDataWithFace.hasFaceRegistered = true;
      }
      const response = await employeeAPI.createEmployee(employeeDataWithFace);
      if (response.data.success) {
        await fetchEmployees();
        resetForm();
        setShowAddModal(false);
        const employeeName = `${newEmployee.personalInfo.firstName} ${newEmployee.personalInfo.lastName}`;
        toast.success(`Employee ${employeeName} added successfully with 4-pose face registration!`);
      }
    } catch (error) {
      console.error('❌ Error creating employee:', error);
      toast.error(error.response?.data?.message || 'Failed to create employee');
    }
  };

  const resetForm = () => {
    setNewEmployee({
      personalInfo: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        nationality: 'Indian',
        maritalStatus: 'Single',
        bloodGroup: ''
      },
      contactInfo: {
        phone: '',
        alternatePhone: '',
        personalEmail: '',
        address: {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        }
      },
      workInfo: {
        position: '',
        department: '',
        joiningDate: new Date().toISOString().split('T')[0],
        employmentType: 'Full-time',
        workLocation: 'Office',
        team: '',
        skills: [],
        workShift: 'Morning'
      },
      salaryInfo: {
        basicSalary: 0,
        allowances: {
          hra: 0,
          medical: 0,
          transport: 0,
          other: 0
        },
        deductions: {
          pf: 0,
          esi: 0,
          tax: 0,
          other: 0
        },
        currency: 'INR',
        payFrequency: 'Monthly'
      },
      bankInfo: {
        accountHolderName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        accountType: 'Savings'
      }
    });
    setCurrentStep(1);
    setCapturedFaceData(null);
    setCapturedDescriptors([]);
    setPosesCaptured([]);
    setFaceDetected(false);
    setIsScanning(false);
    stopCamera();
  };

  const updateSelectedEmployee = (field, value, nestedField = null, subNestedField = null) => {
    if (subNestedField) {
      setSelectedEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: {
            ...prev[field][nestedField],
            [subNestedField]: value
          }
        }
      }));
    } else if (nestedField) {
      setSelectedEmployee(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value
        }
      }));
    } else {
      setSelectedEmployee(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    try {
      const response = await employeeAPI.updateEmployee(selectedEmployee._id, selectedEmployee);
      if (response.data.success) {
        await fetchEmployees();
        setShowEditModal(false);
        toast.success('Employee updated successfully!');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(error.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee? This will also delete their user account.')) {
      try {
        const response = await employeeAPI.deleteEmployee(id);
        if (response.data.success) {
          await fetchEmployees();
          toast.success('Employee deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error(error.response?.data?.message || 'Failed to delete employee');
      }
    }
  };

  const EditModal = () => {
    if (!selectedEmployee) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
        {/* Enhanced backdrop with blur */}
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md" />

        {/* Modal content */}
        <div className="relative glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6 w-full max-w-full sm:max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Edit Employee</h2>
            <button onClick={() => setShowEditModal(false)} className="text-secondary-400 hover:text-white">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <form onSubmit={handleEditEmployee} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white border-b border-secondary-600 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">First Name *</label>
                  <input
                    type="text"
                    value={selectedEmployee.personalInfo?.firstName || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'firstName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="words"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={selectedEmployee.personalInfo?.lastName || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'lastName')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={selectedEmployee.personalInfo?.dateOfBirth ? selectedEmployee.personalInfo.dateOfBirth.split('T')[0] : ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'dateOfBirth')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Gender *</label>
                  <select
                    value={selectedEmployee.personalInfo?.gender || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'gender')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Blood Group</label>
                  <select
                    value={selectedEmployee.personalInfo?.bloodGroup || ''}
                    onChange={(e) => updateSelectedEmployee('personalInfo', e.target.value, 'bloodGroup')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white border-b border-secondary-600 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Email *</label>
                  <input
                    type="email"
                    value={selectedEmployee.contactInfo?.personalEmail || ''}
                    onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'personalEmail')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={selectedEmployee.contactInfo?.phone || ''}
                    onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'phone')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-sm sm:text-md font-semibold text-white mb-2 sm:mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Name *</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.emergencyContact?.name || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'emergencyContact', 'name')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Relationship *</label>
                      <input
                        type="text"
                        value={selectedEmployee.contactInfo?.emergencyContact?.relationship || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'emergencyContact', 'relationship')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Phone *</label>
                      <input
                        type="tel"
                        value={selectedEmployee.contactInfo?.emergencyContact?.phone || ''}
                        onChange={(e) => updateSelectedEmployee('contactInfo', e.target.value, 'emergencyContact', 'phone')}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white border-b border-secondary-600 pb-2">Work Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Position *</label>
                  <input
                    type="text"
                    value={selectedEmployee.workInfo?.position || ''}
                    onChange={(e) => updateSelectedEmployee('workInfo', e.target.value, 'position')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Department *</label>
                  <select
                    value={typeof selectedEmployee.workInfo?.department === 'object' ? selectedEmployee.workInfo.department._id : selectedEmployee.workInfo?.department || ''}
                    onChange={(e) => updateSelectedEmployee('workInfo', e.target.value, 'department')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-secondary-300 mb-1 sm:mb-2">Basic Salary *</label>
                  <input
                    type="number"
                    value={selectedEmployee.salaryInfo?.basicSalary || 0}
                    onChange={(e) => updateSelectedEmployee('salaryInfo', parseFloat(e.target.value) || 0, 'basicSalary')}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                    min="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-secondary-600">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 sm:px-6 py-2.5 sm:py-3 border border-secondary-600 text-secondary-300 text-sm rounded-lg hover:bg-secondary-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold text-sm rounded-lg hover-glow transition-all duration-300"
              >
                Update Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ViewModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Enhanced backdrop with blur */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal content */}
      <div className="relative glass-morphism neon-border rounded-2xl p-4 sm:p-6 w-full max-w-full sm:max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Employee Details</h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="text-secondary-400 hover:text-white"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        {selectedEmployee && (
          <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex items-center space-x-4 p-4 bg-secondary-800/30 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedEmployee.fullName}</h3>
                <p className="text-neon-pink text-base">{selectedEmployee.workInfo?.position}</p>
                <p className="text-secondary-400 text-sm">
                  {typeof selectedEmployee.workInfo?.department === 'object'
                    ? selectedEmployee.workInfo.department.name
                    : selectedEmployee.workInfo?.department}
                </p>
                <p className="text-secondary-400 text-sm">ID: {selectedEmployee.employeeId || selectedEmployee.user?.employeeId}</p>
                {selectedEmployee.hasFaceRegistered && (
                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-400/20 text-green-400 mt-1">
                    Face Registered
                  </span>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">First Name</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.personalInfo?.firstName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Last Name</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.personalInfo?.lastName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Date of Birth</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">
                    {selectedEmployee.personalInfo?.dateOfBirth ? new Date(selectedEmployee.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Gender</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.personalInfo?.gender || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Blood Group</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.personalInfo?.bloodGroup || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Email</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.contactInfo?.personalEmail || selectedEmployee.user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Phone</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.contactInfo?.phone || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-base font-semibold text-white mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-300 mb-2">Name</label>
                      <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.contactInfo?.emergencyContact?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-300 mb-2">Relationship</label>
                      <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.contactInfo?.emergencyContact?.relationship || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-300 mb-2">Phone</label>
                      <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.contactInfo?.emergencyContact?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Work Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Position</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.workInfo?.position || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Department</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">
                    {typeof selectedEmployee.workInfo?.department === 'object'
                      ? selectedEmployee.workInfo.department.name
                      : selectedEmployee.workInfo?.department || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Basic Salary</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">
                    {selectedEmployee.salaryInfo?.basicSalary ? `₹${selectedEmployee.salaryInfo.basicSalary}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Joining Date</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">
                    {selectedEmployee.workInfo?.joiningDate ? new Date(selectedEmployee.workInfo.joiningDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Employment Type</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.workInfo?.employmentType || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Work Location</label>
                  <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.workInfo?.workLocation || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Bank Information */}
            {selectedEmployee.bankInfo && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Bank Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Account Holder Name</label>
                    <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.bankInfo?.accountHolderName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Account Number</label>
                    <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.bankInfo?.accountNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Bank Name</label>
                    <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.bankInfo?.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">IFSC Code</label>
                    <p className="text-white bg-secondary-800/50 px-3 py-2 rounded-lg">{selectedEmployee.bankInfo?.ifscCode || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-white text-lg sm:text-xl">Loading employees...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Employee Management</p>
            <p className="text-secondary-400 text-xs sm:text-sm">Manage your company's workforce with integrated face registration</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold text-xs sm:text-sm rounded-lg hover-glow transition-all duration-300 flex items-center"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Add Employee
          </button>
        </div>
        {/* Filters */}
        <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 text-xs sm:text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-secondary-400" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="pl-9 sm:pl-10 pr-7 sm:pr-8 py-2 sm:py-2.5 md:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 text-xs sm:text-sm"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{employees.length}</h3>
                <p className="text-secondary-400 text-xs sm:text-sm">Total Employees</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                  {employees.filter(e => e.hasFaceRegistered).length}
                </h3>
                <p className="text-secondary-400 text-xs sm:text-sm">Face Registered</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                  {new Set(employees.map(e => e.workInfo?.department).filter(Boolean)).size}
                </h3>
                <p className="text-secondary-400 text-xs sm:text-sm">Departments</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                  {employees.filter(e => e.status === 'Active' || !e.status).length}
                </h3>
                <p className="text-secondary-400 text-xs sm:text-sm">Active</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
        {/* Employee Table/Cards */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          {/* Mobile Cards */}
          <div className="md:hidden grid gap-4 p-4">
            {filteredEmployees.map((employee) => (
              <div key={employee._id} className="bg-secondary-800/30 border border-secondary-700 rounded-xl p-4 hover:bg-secondary-800/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{employee.fullName}</p>
                      <p className="text-secondary-400 text-xs flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        <span className="truncate">{employee.user?.email || employee.contactInfo?.personalEmail}</span>
                      </p>
                      <p className="text-secondary-400 text-xs">ID: {employee.employeeId || employee.user?.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowViewModal(true);
                      }}
                      className="p-1.5 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowEditModal(true);
                      }}
                      className="p-1.5 text-secondary-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee._id)}
                      className="p-1.5 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400 text-xs">Position</span>
                    <span className="text-white text-sm font-medium">{employee.workInfo?.position}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400 text-xs">Department</span>
                    <span className="text-white text-sm">
                      {typeof employee.workInfo?.department === 'object'
                        ? employee.workInfo.department.name
                        : employee.workInfo?.department || 'No Department'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400 text-xs">Status</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      employee.status === 'Active' || !employee.status
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-red-400/20 text-red-400'
                    }`}>
                      {employee.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-neon-pink scrollbar-track-secondary-900">
              <table className="w-full">
                <thead className="border-b border-secondary-700">
                  <tr>
                    <th className="text-left p-4 md:p-6 text-secondary-300 font-medium text-sm">Employee</th>
                    <th className="text-left p-4 md:p-6 text-secondary-300 font-medium text-sm">Position</th>
                    <th className="text-left p-4 md:p-6 text-secondary-300 font-medium text-sm">Department</th>

                    <th className="text-left p-4 md:p-6 text-secondary-300 font-medium text-sm">Status</th>
                    <th className="text-left p-4 md:p-6 text-secondary-300 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee._id} className="border-b border-secondary-800 hover:bg-secondary-800/30 transition-colors">
                      <td className="p-4 md:p-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{employee.fullName}</p>
                            <p className="text-secondary-400 text-xs flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {employee.user?.email || employee.contactInfo?.personalEmail}
                            </p>
                            <p className="text-secondary-400 text-xs">ID: {employee.employeeId || employee.user?.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 md:p-6 text-white text-sm">{employee.workInfo?.position}</td>
                      <td className="p-4 md:p-6">
                        <span className="px-2.5 py-1.5 text-xs rounded-full bg-secondary-700 text-secondary-300">
                          {typeof employee.workInfo?.department === 'object'
                            ? employee.workInfo.department.name
                            : employee.workInfo?.department || 'No Department'}
                        </span>
                      </td>

                      <td className="p-4 md:p-6">
                        <span className={`px-2.5 py-1.5 text-xs rounded-full ${
                          employee.status === 'Active' || !employee.status
                            ? 'bg-green-400/20 text-green-400'
                            : 'bg-red-400/20 text-red-400'
                        }`}>
                          {employee.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4 md:p-6">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-secondary-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee._id)}
                            className="p-1.5 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {filteredEmployees.length === 0 && (
            <div className="p-6 sm:p-8 text-center">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-secondary-600 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-sm sm:text-base font-medium text-secondary-400 mb-1 sm:mb-2">No employees found</h3>
              <p className="text-secondary-500 text-xs sm:text-sm">
                {searchTerm || filterDepartment
                  ? 'Try adjusting your search filters'
                  : 'Start by adding your first employee'}
              </p>
            </div>
          )}
        </div>
      {/* Modals */}
      {showAddModal && (
        <AddEmployeeModal
          show={showAddModal}
          onClose={() => setShowAddModal(false)}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          newEmployee={newEmployee}
          setNewEmployee={setNewEmployee}
          departments={departments}
          faceRegistrationEnabled={faceRegistrationEnabled}
          setFaceRegistrationEnabled={setFaceRegistrationEnabled}
          modelsLoaded={globalModelsLoaded}
          faceDetected={faceDetected}
          isScanning={isScanning}
          capturedFaceData={capturedFaceData}
          setCapturedFaceData={setCapturedFaceData}
          capturedDescriptors={capturedDescriptors}
          setCapturedDescriptors={setCapturedDescriptors}
          posesCaptured={posesCaptured}
          setPosesCaptured={setPosesCaptured}
          videoRef={videoRef}
          canvasRef={canvasRef}
          startCamera={startCamera}
          captureCurrentPose={captureCurrentPose}
          handleCreateEmployee={handleCreateEmployee}
          handleFormNext={handleFormNext}
          resetForm={resetForm}
        />
      )}
      {showEditModal && <EditModal />}
      {showViewModal && <ViewModal />}
    </div>
  </AdminLayout>
);
};

export default EmployeeManagement;