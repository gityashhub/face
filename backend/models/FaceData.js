// models/FaceData.js
import mongoose from 'mongoose';

const faceDataSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  faceDescriptor: {
    type: [Number], // 128-dimensional face descriptor array
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 128;
      },
      message: 'Face descriptor must be exactly 128 dimensions'
    }
  },
  landmarks: [{
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  }],
  faceImageUrl: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  metadata: {
    captureDevice: String,
    captureEnvironment: String,
    processingVersion: {
      type: String,
      default: '1.0'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
faceDataSchema.index({ employee: 1 });
faceDataSchema.index({ user: 1 });
faceDataSchema.index({ isActive: 1 });

// Methods
faceDataSchema.methods.updateDescriptor = function(newDescriptor, confidence = 0) {
  this.faceDescriptor = newDescriptor;
  this.confidence = confidence;
  this.lastUpdated = new Date();
  return this.save();
};

faceDataSchema.methods.deactivate = function() {
  this.isActive = false;
  this.lastUpdated = new Date();
  return this.save();
};

// Static methods
faceDataSchema.statics.findByEmployee = function(employeeId) {
  return this.findOne({ employee: employeeId, isActive: true })
    .populate('employee', 'personalInfo workInfo')
    .populate('user', 'name email employeeId');
};

faceDataSchema.statics.findByUser = function(userId) {
  return this.findOne({ user: userId, isActive: true })
    .populate('employee', 'personalInfo workInfo')
    .populate('user', 'name email employeeId');
};

export default mongoose.model('FaceData', faceDataSchema);