// models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: function() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date,
    // default: null
  },

  checkInLocation: {
    type: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      },
      address: {
        type: String,
        default: ''
      },
      accuracy: {
        type: Number,
        default: 0
      }
    },
    
    required: true
  },
  checkOutLocation: {
    type: {
      latitude: {
        type: Number
      },
      longitude: {
        type: Number
      },
      address: {
        type: String,
        default: ''
      },
      accuracy: {
        type: Number,
        default: 0
      }
    },
    default: null
  },
  workingHours: {
    type: Number,
    default: 0 // in minutes
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Half Day', 'Absent', 'Work from Home'],
    default: 'Present'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String
  },
  isManualEntry: {
    type: Boolean,
    default: false
  },
  manualEntryReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Create indexes - avoid duplicates by only defining them once here
attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ checkInTime: 1 });

// Compound unique index to prevent duplicate attendance for same day
attendanceSchema.index(
  { employee: 1, date: 1 },
  { 
    unique: true,
    partialFilterExpression: { date: { $type: "date" } }
  }
);

// Pre-save middleware to set date to start of day and calculate working hours
attendanceSchema.pre('save', function(next) {
  // Ensure date is set to start of day (midnight) based on checkInTime
  if (this.checkInTime && this.isNew) {
    const checkInDate = new Date(this.checkInTime);
    this.date = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
  }

  // Calculate working hours if both check-in and check-out exist
  if (this.checkInTime && this.checkOutTime) {
    const timeDiff = this.checkOutTime - this.checkInTime;
    this.workingHours = Math.round(timeDiff / (1000 * 60)); // Convert to minutes
  }

  // Check if employee is late (assuming 9:00 AM is standard time)
  if (this.checkInTime && (this.isNew || this.isModified('checkInTime'))) {
    const checkInTime = new Date(this.checkInTime);
    const standardTime = new Date(checkInTime);
    standardTime.setHours(9, 0, 0, 0); // 9:00 AM

    if (checkInTime > standardTime) {
      this.isLate = true;
      this.lateMinutes = Math.round((checkInTime - standardTime) / (1000 * 60));
      
      // Set status based on how late
      if (this.lateMinutes > 240) { // More than 4 hours late
        this.status = 'Half Day';
      } else if (this.lateMinutes > 30) { // More than 30 minutes late
        this.status = 'Late';
      } else {
        this.status = 'Present';
      }
    } else {
      this.isLate = false;
      this.lateMinutes = 0;
      this.status = 'Present';
    }
  }

  next();
});

// Instance method to calculate total working time with better formatting
attendanceSchema.methods.getWorkingTime = function() {
  if (!this.checkOutTime || !this.workingHours) {
    return {
      hours: 0,
      minutes: 0,
      total: '00:00',
      totalMinutes: 0
    };
  }

  const hours = Math.floor(this.workingHours / 60);
  const minutes = this.workingHours % 60;
  
  return {
    hours,
    minutes,
    total: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    totalMinutes: this.workingHours
  };
};

// Static method to get attendance summary for a date range
attendanceSchema.statics.getAttendanceSummary = async function(employeeId, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include the entire end date
  
  return await this.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: { 
          $sum: { 
            $cond: [
              { $or: [
                { $eq: ['$status', 'Present'] },
                { $eq: ['$status', 'Late'] }
              ]}, 
              1, 
              0
            ] 
          } 
        },
        lateDays: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] 
          } 
        },
        halfDays: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0] 
          } 
        },
        totalWorkingMinutes: { $sum: '$workingHours' },
        avgCheckInTime: { $avg: '$checkInTime' }
      }
    }
  ]);
};

// Static method to check if attendance exists for today
attendanceSchema.statics.getTodayAttendance = async function(employeeId) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  
  return await this.findOne({
    employee: employeeId,
    date: { $gte: startOfDay, $lt: endOfDay }
  }).populate([
    { path: 'employee', select: 'personalInfo workInfo' },
    { path: 'user', select: 'name email employeeId' }
  ]);
};

// Static method to get monthly attendance statistics
attendanceSchema.statics.getMonthlyStats = async function(year, month, employeeId = null) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const matchCondition = {
    date: { $gte: startOfMonth, $lte: endOfMonth }
  };

  if (employeeId) {
    matchCondition.employee = new mongoose.Types.ObjectId(employeeId);
  }

  return await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: employeeId ? '$employee' : null,
        totalDays: { $sum: 1 },
        presentDays: { 
          $sum: { 
            $cond: [
              { $in: ['$status', ['Present', 'Late']] }, 
              1, 
              0
            ] 
          } 
        },
        lateDays: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        halfDays: { $sum: { $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0] } },
        totalWorkingHours: { $sum: '$workingHours' },
        avgWorkingHours: { $avg: '$workingHours' }
      }
    }
  ]);
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;