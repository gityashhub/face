import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  FileText,
  User,
  X,
  Save,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const EmployeeLeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
 const [leaveBalance, setLeaveBalance] = useState({
  total: 30,
  used: 0,
  remaining: 30
});

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [newLeave, setNewLeave] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDaySession: 'Morning'
  });

  const leaveTypes = ['casual', 'sick', 'earned', 'emergency', 'personal'];

  // Fetch employee's leave requests
  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leaves');
      
      if (response.data.success) {
        setLeaveRequests(response.data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

// Update the fetchLeaveBalance function
const fetchLeaveBalance = async () => {
  try {
    const response = await api.get('/leaves/balance');
    
    if (response.data.success) {
      setLeaveBalance(response.data.balance);
    }
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    toast.error('Failed to fetch leave balance');
  }
};

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveBalance();
  }, []);

  const calculateDays = (start, end, isHalfDay) => {
    if (isHalfDay) return 0.5;
    if (!start || !end) return 0;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

// Update the leave validation in handleApplyLeave
const handleApplyLeave = async (e) => {
  e.preventDefault();

  // Validate reason length
  if (newLeave.reason.trim().length < 10) {
    toast.error('Reason must be at least 10 characters long');
    return;
  }

  const totalDays = calculateDays(newLeave.startDate, newLeave.endDate, newLeave.isHalfDay);
  const availableBalance = leaveBalance.remaining || 0;

  if (totalDays > availableBalance) {
    toast.error(`Insufficient leave balance. Available: ${availableBalance} days`);
    return;
  }

  try {
    setSubmitLoading(true);
    const token = localStorage.getItem('token');
    
    const leaveData = {
      ...newLeave,
      leaveType: newLeave.leaveType.toLowerCase(),
      totalDays,
      endDate: newLeave.isHalfDay ? newLeave.startDate : newLeave.endDate
    };

    if (!newLeave.isHalfDay) delete leaveData.halfDaySession;

    console.log('Sending leave data:', leaveData); // Debug log

    const response = await api.post('/leaves', leaveData);

    if (response.data.success) {
      toast.success('Leave application submitted successfully!');
      setNewLeave({
        leaveType: 'casual',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDaySession: 'Morning'
      });
      setShowModal(false);
      fetchLeaveRequests();
      fetchLeaveBalance();
    }
  } catch (error) {
    console.error('Error applying for leave:', error);
    console.error('Error response data:', error.response?.data); // Debug log
    console.error('Error response status:', error.response?.status); // Debug log
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors); // Debug log
      // Log each individual error
      error.response.data.errors.forEach((err, index) => {
        console.error(`Validation error ${index + 1}:`, err);
      });
    }
    toast.error(error.response?.data?.message || 'Failed to submit leave application');
  } finally {
    setSubmitLoading(false);
  }
};

  const handleCancelLeave = async (leaveId) => {
    if (window.confirm('Are you sure you want to cancel this leave request?')) {
      try {
        await api.put(`/leaves/${leaveId}/cancel`, {});
        
        toast.success('Leave request cancelled!');
        fetchLeaveRequests();
        fetchLeaveBalance();
      } catch (error) {
        console.error('Error cancelling leave:', error);
        toast.error(error.response?.data?.message || 'Failed to cancel leave request');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'approved': return 'text-green-400 bg-green-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/20';
      case 'cancelled': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'casual': return 'bg-blue-500/20 text-blue-400';
      case 'sick': return 'bg-red-500/20 text-red-400';
      case 'earned': return 'bg-green-500/20 text-green-400';
      case 'emergency': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-purple-500/20 text-purple-400';
    }
  };

  const ApplyLeaveModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Enhanced backdrop with blur */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => !submitLoading && setShowModal(false)} />

      {/* Modal content */}
      <div className="relative glass-morphism neon-border rounded-2xl p-4 sm:p-6 w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Apply for Leave</h2>
          <button 
            onClick={() => setShowModal(false)}
            className="text-secondary-400 hover:text-white"
            disabled={submitLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleApplyLeave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">Leave Type</label>
              <select
                value={newLeave.leaveType}
                onChange={(e) => setNewLeave({...newLeave, leaveType: e.target.value})}
                className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                required
                disabled={submitLoading}
              >
                {leaveTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <p className="text-sm text-secondary-400 mt-1">
  Available: {leaveBalance.remaining || 0} days
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <input
                type="checkbox"
                id="halfDay"
                checked={newLeave.isHalfDay}
                onChange={(e) => setNewLeave({...newLeave, isHalfDay: e.target.checked})}
                className="w-4 h-4 rounded border-secondary-600 bg-secondary-800 text-neon-pink focus:ring-neon-pink"
                disabled={submitLoading}
              />
              <label htmlFor="halfDay" className="text-sm text-secondary-300">Half Day Leave</label>
            </div>
          </div>

          {newLeave.isHalfDay && (
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">Half Day Session</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="halfDaySession"
                    value="Morning"
                    checked={newLeave.halfDaySession === 'Morning'}
                    onChange={(e) => setNewLeave({...newLeave, halfDaySession: e.target.value})}
                    className="w-4 h-4 text-neon-pink"
                    disabled={submitLoading}
                  />
                  <span className="ml-2 text-white">Morning</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="halfDaySession"
                    value="Evening"
                    checked={newLeave.halfDaySession === 'Evening'}
                    onChange={(e) => setNewLeave({...newLeave, halfDaySession: e.target.value})}
                    className="w-4 h-4 text-neon-pink"
                    disabled={submitLoading}
                  />
                  <span className="ml-2 text-white">Evening</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">Start Date</label>
              <input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({...newLeave, startDate: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                required
                disabled={submitLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                {newLeave.isHalfDay ? 'Date' : 'End Date'}
              </label>
              <input
                type="date"
                value={newLeave.isHalfDay ? newLeave.startDate : newLeave.endDate}
                onChange={(e) => setNewLeave({...newLeave, endDate: newLeave.isHalfDay ? newLeave.startDate : e.target.value})}
                min={newLeave.startDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                required
                disabled={newLeave.isHalfDay || submitLoading}
              />
            </div>
          </div>

          {newLeave.startDate && (newLeave.endDate || newLeave.isHalfDay) && (
            <div className="p-4 bg-secondary-800/30 rounded-lg">
              <p className="text-sm text-secondary-400">Total Days: 
                <span className="text-neon-pink font-medium ml-2">
                  {calculateDays(newLeave.startDate, newLeave.endDate || newLeave.startDate, newLeave.isHalfDay)} 
                  {newLeave.isHalfDay ? ' (Half Day)' : ' days'}
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary-300 mb-2">Reason for Leave</label>
            <input
              type="text"
              value={newLeave.reason}
              onChange={(e) => setNewLeave({...newLeave, reason: e.target.value})}
              className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              placeholder="Please provide reason for your leave request..."
              required
              disabled={submitLoading}
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-secondary-500 mt-1">{newLeave.reason.length}/500 characters (minimum 10)</p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
              disabled={submitLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 flex items-center"
              disabled={submitLoading}
            >
              {submitLoading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {submitLoading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const ViewLeaveModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-morphism neon-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Leave Request Details</h2>
          <button
            onClick={() => setShowViewModal(false)}
            className="text-secondary-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {selectedLeave && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-secondary-800/30 rounded-lg">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedLeave.leaveType} Leave</h3>
                <p className="text-secondary-400">Applied on {new Date(selectedLeave.appliedDate).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedLeave.status)}`}>
                {selectedLeave.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-secondary-400">Start Date</label>
                  <p className="text-white font-medium">{new Date(selectedLeave.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">End Date</label>
                  <p className="text-white font-medium">{new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-secondary-400">Total Days</label>
                  <p className="text-white font-medium">
                    {selectedLeave.isHalfDay ? `0.5 day (${selectedLeave.halfDaySession})` : `${selectedLeave.totalDays} days`}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Status</label>
                  <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(selectedLeave.status)}`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-secondary-400">Reason</label>
              <p className="text-white bg-secondary-800/30 p-3 rounded-lg mt-1">{selectedLeave.reason}</p>
            </div>

            {selectedLeave.adminComments && (
              <div>
                <label className="text-sm text-secondary-400">Admin Comments</label>
                <p className="text-white bg-secondary-800/30 p-3 rounded-lg mt-1">{selectedLeave.adminComments}</p>
              </div>
            )}

            {selectedLeave.actionDate && selectedLeave.status !== 'pending' && (
              <div>
                <label className="text-sm text-secondary-400">Action Date</label>
                <p className="text-white font-medium">{new Date(selectedLeave.actionDate).toLocaleDateString()}</p>
              </div>
            )}

            {selectedLeave.status === 'Pending' && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    handleCancelLeave(selectedLeave._id);
                    setShowViewModal(false);
                  }}
                  className="px-6 py-3 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Cancel Request
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const CalendarModal = () => {
    const getLeaveDates = () => {
      const dates = [];
      leaveRequests.forEach(leave => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push({
            date: new Date(d),
            status: leave.status,
            type: leave.leaveType
          });
        }
      });
      return dates;
    };

    const leaveDates = getLeaveDates();

    const tileClassName = ({ date, view }) => {
      if (view === 'month') {
        const leaveDate = leaveDates.find(d =>
          d.date.toDateString() === date.toDateString()
        );
        if (leaveDate) {
          switch (leaveDate.status.toLowerCase()) {
            case 'approved': return 'bg-green-500/20 text-green-400';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400';
            case 'rejected': return 'bg-red-500/20 text-red-400';
            case 'cancelled': return 'bg-gray-500/20 text-gray-400';
            default: return '';
          }
        }
      }
      return '';
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="glass-morphism neon-border rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Leave Calendar</h2>
            <button
              onClick={() => setShowCalendarModal(false)}
              className="text-secondary-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500/20 rounded mr-2"></div>
                <span className="text-secondary-400">Approved</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500/20 rounded mr-2"></div>
                <span className="text-secondary-400">Pending</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500/20 rounded mr-2"></div>
                <span className="text-secondary-400">Rejected</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-500/20 rounded mr-2"></div>
                <span className="text-secondary-400">Cancelled</span>
              </div>
            </div>
          </div>

          <Calendar
            tileClassName={tileClassName}
            className="w-full bg-secondary-800/50 rounded-lg p-4"
          />
        </div>
      </div>
    );
  };

  const getLeaveStats = () => {
    const approved = leaveRequests.filter(l => l.status === 'Approved').length;
    const pending = leaveRequests.filter(l => l.status === 'Pending').length;
    const rejected = leaveRequests.filter(l => l.status === 'Rejected').length;
    const cancelled = leaveRequests.filter(l => l.status === 'Cancelled').length;
    
    return { approved, pending, rejected, cancelled, total: leaveRequests.length };
  };

  const stats = getLeaveStats();

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Leave Requests</h1>
            <p className="text-secondary-400">Manage your leave applications</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Apply for Leave
          </button>
        </div>
{/* // Update the JSX for Leave Balance Card (keep only one card) */}
{/* Leave Balance Card - Single Total Card */}
<div className="grid grid-cols-1 gap-6">
  <div className="glass-morphism neon-border rounded-2xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-white">Total Leave Balance</h3>
      <CalendarIcon className="w-6 h-6 text-neon-pink cursor-pointer" onClick={() => setShowCalendarModal(true)} />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-secondary-400">Total Allocated</span>
        <span className="text-white font-medium">{leaveBalance.total}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-secondary-400">Used</span>
        <span className="text-red-400 font-medium">{leaveBalance.used}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-secondary-400">Remaining</span>
        <span className="text-green-400 font-medium">{leaveBalance.remaining}</span>
      </div>
      <div className="w-full bg-secondary-700 rounded-full h-2 mt-3">
        <div 
          className="bg-gradient-to-r from-neon-pink to-neon-purple h-2 rounded-full transition-all duration-500"
          style={{ width: `${leaveBalance.total > 0 ? (leaveBalance.used / leaveBalance.total) * 100 : 0}%` }}
        />
      </div>
    </div>
  </div>
</div>

        {/* Leave Requests Table */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-secondary-700">
            <h2 className="text-xl font-bold text-white">My Leave Requests</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 text-neon-pink mx-auto mb-4 animate-spin" />
              <p className="text-secondary-400">Loading your leave requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] sm:min-w-full">
            <thead className="border-b border-secondary-700">
              <tr>
                <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Leave Type</th>
                <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Duration</th>
                <th className="hidden sm:table-cell text-left p-4 sm:p-6 text-secondary-300 font-medium">Applied Date</th>
                <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Status</th>
                <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((leave) => (
                <tr key={leave._id} className="border-b border-secondary-800 hover:bg-secondary-800/30 transition-colors">
                  <td className="p-4 sm:p-6">
                    <span className={`px-2 sm:px-3 py-1 text-sm rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                      {leave.leaveType}
                    </span>
                  </td>
                  <td className="p-4 sm:p-6 text-white">
                    <div>
                      <p>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                      <p className="text-sm text-secondary-400">
                        {leave.isHalfDay ? `0.5 day (${leave.halfDaySession})` : `${leave.totalDays} days`}
                      </p>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell p-4 sm:p-6 text-secondary-400">
                    {new Date(leave.appliedDate).toLocaleDateString()}
                  </td>
                  <td className="p-4 sm:p-6">
                    <span className={`px-2 sm:px-3 py-1 text-xs rounded-full ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-4 sm:p-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setShowViewModal(true);
                        }}
                        className="p-2 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {leave.status === 'Pending' && (
                        <button
                          onClick={() => handleCancelLeave(leave._id)}
                          className="p-2 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Cancel Request"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          )}

          {!loading && leaveRequests.length === 0 && (
            <div className="p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-400 mb-2">No leave requests</h3>
              <p className="text-secondary-500">You haven't applied for any leaves yet.</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Leave Statistics</h2>
              <FileText className="w-5 h-5 text-neon-pink" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Total Applications</span>
                <span className="text-white font-bold">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Approved</span>
                <span className="text-green-400 font-bold">{stats.approved}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Pending</span>
                <span className="text-yellow-400 font-bold">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Rejected</span>
                <span className="text-red-400 font-bold">{stats.rejected}</span>
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <Clock className="w-5 h-5 text-neon-purple" />
            </div>
            <div className="space-y-4">
              {leaveRequests.slice(0, 4).map((leave) => (
                <div key={leave._id} className="flex items-center justify-between p-3 bg-secondary-800/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{leave.leaveType} Leave</p>
                    <p className="text-sm text-secondary-400">
                      {leave.isHalfDay ? `0.5 day` : `${leave.totalDays} days`} • {new Date(leave.appliedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(leave.status)}`}>
                    {leave.status}
                  </span>
                </div>
              ))}
              {leaveRequests.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-secondary-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && <ApplyLeaveModal />}
      {showViewModal && <ViewLeaveModal />}
      {showCalendarModal && <CalendarModal />}
    </EmployeeLayout>
  );
};

export default EmployeeLeaveRequests;