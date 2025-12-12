

import React, { useState, useEffect } from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Navigation,
  Timer,
  TrendingUp,
  FileText,
  Users,
  Target,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI, geolocationUtils, OFFICE_LOCATION } from '../../utils/attendanceAPI';

const EmployeeAttendance = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [workingTime, setWorkingTime] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [realTimeWorkingTime, setRealTimeWorkingTime] = useState(0);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch attendance data
  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendanceHistory();
  }, []);

  // Get location
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Real-time working time counter
  useEffect(() => {
    let interval;
    if (hasCheckedIn && !hasCheckedOut && todayAttendance?.checkInTime) {
      interval = setInterval(() => {
        const checkInTime = new Date(todayAttendance.checkInTime);
        const now = new Date();
        const diffMs = now - checkInTime;
        const minutes = Math.floor(diffMs / (1000 * 60));
        setRealTimeWorkingTime(minutes);
      }, 1000);
    } else {
      setRealTimeWorkingTime(0);
    }
    return () => clearInterval(interval);
  }, [hasCheckedIn, hasCheckedOut, todayAttendance]);

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const position = await geolocationUtils.getCurrentPosition();
      const address = await geolocationUtils.getAddressFromCoords(position.latitude, position.longitude);
      setCurrentLocation({ ...position, address });
    } catch (error) {
      console.error('Location error:', error);
      toast.error(error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getTodayAttendance();
      if (response.data.success) {
        const data = response.data;
        setTodayAttendance(data.data);
        setHasCheckedIn(data.hasCheckedIn);
        setHasCheckedOut(data.hasCheckedOut);
        setWorkingTime(data.workingTime);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch today\'s attendance status');
      }
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedMonth + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      const response = await attendanceAPI.getAttendanceHistory({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 31
      });
      if (response.data.success) {
        setAttendanceHistory(response.data.data);
        setAttendanceStats(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      toast.error('Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  const checkLocationRadius = (lat, lon) => {
    return geolocationUtils.isWithinOfficeRadius(lat, lon);
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      toast.error('Location is required. Please enable location services.');
      return;
    }

    try {
      setLoading(true);
      const locationCheck = checkLocationRadius(currentLocation.latitude, currentLocation.longitude);
      if (!locationCheck.isWithin) {
        toast.error(`❌ Not within office premises. Distance: ${locationCheck.distance}m`);
        return;
      }

      const response = await attendanceAPI.checkIn({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        address: currentLocation.address
      });

      if (response.data.success) {
        toast.success('✅ Check-in marked successfully!');
        setTodayAttendance(response.data.data);
        setHasCheckedIn(true);
        setHasCheckedOut(false);
        fetchAttendanceHistory();
      } else {
        toast.error('❌ Check-in failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to mark attendance: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentLocation) {
      toast.error('Location is required for checkout.');
      getCurrentLocation();
      return;
    }

    try {
      setLoading(true);
      const locationCheck = checkLocationRadius(currentLocation.latitude, currentLocation.longitude);
      if (!locationCheck.isWithin) {
        toast.error(`You are not within office premises. Distance: ${locationCheck.distance}m`);
        return;
      }

      const response = await attendanceAPI.checkOut({ notes: 'Check-out via web' });
      if (response.data.success) {
        toast.success('Checkout marked successfully!');
        setTodayAttendance(response.data.data);
        setHasCheckedOut(true);
        setWorkingTime(response.data.workingTime);
        fetchAttendanceHistory();
        fetchTodayAttendance();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark checkout');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present': return 'text-green-400 bg-green-400/20';
      case 'late': return 'text-yellow-400 bg-yellow-400/20';
      case 'half day': return 'text-orange-400 bg-orange-400/20';
      case 'absent': return 'text-red-400 bg-red-400/20';
      case 'work from home': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatWorkingTime = (minutes) => {
    if (!minutes || minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <EmployeeLayout>
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="glass-morphism neon-border rounded-2xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                My <span className="neon-text">Attendance</span>
              </h1>
              <p className="text-secondary-400 text-sm md:text-base">Track your daily attendance and view history</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-lg md:text-2xl font-bold text-white">{currentTime.toLocaleTimeString()}</p>
              <p className="text-secondary-400 text-xs md:text-sm">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Attendance Card */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Today's Attendance</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${hasCheckedIn ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-sm text-secondary-400">
                {hasCheckedIn ? (hasCheckedOut ? 'Completed' : 'Checked In') : 'Not Marked'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Check In/Out Section */}
            <div className="space-y-4">
              {/* Location Status */}
              <div className="flex items-center space-x-3 p-3 bg-secondary-800/30 rounded-lg">
                <MapPin className={`w-5 h-5 ${currentLocation ? 'text-green-400' : 'text-red-400'}`} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {locationLoading ? 'Getting location...' : currentLocation ? 'Location Ready' : 'Location Required'}
                  </p>
                  <p className="text-xs text-secondary-400">
                    {currentLocation ? currentLocation.address : 'Enable location services'}
                  </p>
                </div>
                {!currentLocation && (
                  <button
                    onClick={getCurrentLocation}
                    className="px-3 py-1 bg-neon-pink/20 text-neon-pink rounded text-xs hover:bg-neon-pink/30 transition-colors"
                  >
                    {locationLoading ? 'Getting...' : 'Get Location'}
                  </button>
                )}
              </div>



              {/* Action Buttons */}
              <div className="space-y-3">
                {!hasCheckedIn ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={!currentLocation || loading}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm md:text-base min-h-[48px] touch-manipulation"
                  >
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-center">{loading ? 'Checking in...' : '📍 Check In (Location Verified)'}</span>
                  </button>
                ) : !hasCheckedOut ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={!currentLocation || loading}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm md:text-base min-h-[48px] touch-manipulation"
                  >
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{loading ? 'Checking out...' : 'Check Out'}</span>
                  </button>
                ) : (
                  <div className="w-full px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30 text-white font-semibold rounded-lg flex items-center justify-center space-x-2 text-sm md:text-base min-h-[48px]">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>Attendance Completed</span>
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-300">
                    <p className="font-medium mb-1">Location Verification Required</p>
                    <p>Your current location must be within office premises to mark attendance.</p>
                    <p className="mt-1 text-yellow-300">Note: Please enable location services for accurate attendance tracking.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary-800/30 rounded-lg text-center">
                  <p className="text-secondary-400 text-xs">Check In</p>
                  <p className="text-white font-bold">
                    {todayAttendance ? formatTime(todayAttendance.checkInTime) : '--:--'}
                  </p>
                </div>
                <div className="p-3 bg-secondary-800/30 rounded-lg text-center">
                  <p className="text-secondary-400 text-xs">Check Out</p>
                  <p className="text-white font-bold">
                    {todayAttendance ? formatTime(todayAttendance.checkOutTime) : '--:--'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary-800/30 rounded-lg text-center">
                  <p className="text-secondary-400 text-xs">Working Time</p>
                  <p className="text-neon-pink font-bold">
                    {hasCheckedIn && !hasCheckedOut ? formatWorkingTime(realTimeWorkingTime) : (workingTime ? workingTime.total : '00:00')}
                  </p>
                </div>
                <div className="p-3 bg-secondary-800/30 rounded-lg text-center">
                  <p className="text-secondary-400 text-xs">Status</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(todayAttendance?.status)}`}>
                    {todayAttendance?.status || 'Not Marked'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Statistics */}
        {attendanceStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="glass-morphism neon-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-400 text-xs md:text-sm">Total Days</p>
                  <p className="text-xl md:text-2xl font-bold text-white">{attendanceStats.totalDays}</p>
                </div>
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-neon-pink flex-shrink-0" />
              </div>
            </div>
            <div className="glass-morphism neon-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-400 text-xs md:text-sm">Present Days</p>
                  <p className="text-xl md:text-2xl font-bold text-green-400">{attendanceStats.presentDays}</p>
                </div>
                <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-400 flex-shrink-0" />
              </div>
            </div>
            <div className="glass-morphism neon-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-400 text-xs md:text-sm">Late Days</p>
                  <p className="text-xl md:text-2xl font-bold text-yellow-400">{attendanceStats.lateDays}</p>
                </div>
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 flex-shrink-0" />
              </div>
            </div>
            <div className="glass-morphism neon-border rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-400 text-xs md:text-sm">Half Days</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-400">{attendanceStats.halfDays}</p>
                </div>
                <Timer className="w-6 h-6 md:w-8 md:h-8 text-orange-400 flex-shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Attendance History */}
        <div className="glass-morphism neon-border rounded-2xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg md:text-xl font-bold text-white">Attendance History</h2>
            <div className="flex items-center gap-4">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setTimeout(fetchAttendanceHistory, 100);
                }}
                className="px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:outline-none focus:border-neon-pink w-full sm:w-auto"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-secondary-600">
                  <th className="pb-3 text-secondary-400 font-medium text-xs md:text-sm">Date</th>
                  <th className="pb-3 text-secondary-400 font-medium text-xs md:text-sm">Check In</th>
                  <th className="pb-3 text-secondary-400 font-medium text-xs md:text-sm">Check Out</th>
                  <th className="pb-3 text-secondary-400 font-medium text-xs md:text-sm">Working Time</th>
                  <th className="pb-3 text-secondary-400 font-medium text-xs md:text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-700">
                {loading ? (
                  <tr><td colSpan="5" className="py-8 text-center text-secondary-400">Loading...</td></tr>
                ) : attendanceHistory.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-secondary-400">No records found</td></tr>
                ) : (
                  attendanceHistory.map((record) => (
                    <tr key={record._id} className="hover:bg-secondary-800/20">
                      <td className="py-3 text-white text-sm md:text-base">{formatDate(record.date)}</td>
                      <td className="py-3 text-white text-sm md:text-base">{formatTime(record.checkInTime)}</td>
                      <td className="py-3 text-white text-sm md:text-base">{formatTime(record.checkOutTime)}</td>
                      <td className="py-3 text-neon-pink font-medium text-sm md:text-base">{formatWorkingTime(record.workingHours)}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeAttendance;
