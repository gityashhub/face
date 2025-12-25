import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Filter,
  Search,
  Download,
  User,
  AlertCircle,
  FileText,
  TrendingUp,
  Users,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch leaves from backend
  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leaves', {
        params: {
          search: searchTerm,
          status: statusFilter,
          leaveType: leaveTypeFilter
        }
      });
      
      if (response.data.success) {
        setLeaves(response.data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to fetch leave applications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch leave statistics
  const fetchStats = async () => {
    try {
      const response = await api.get('/leaves/stats');
      
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching leave stats:', error);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchStats();
  }, [searchTerm, statusFilter, leaveTypeFilter]);

  const handleApprove = async (leaveId, comments = '') => {
    try {
      setActionLoading(true);
      
      await api.put(`/leaves/${leaveId}/approve`, 
        { comments }
      );
      
      toast.success('Leave application approved!');
      fetchLeaves();
      fetchStats();
      setShowModal(false);
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error(error.response?.data?.message || 'Failed to approve leave');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (leaveId, comments = '') => {
    try {
      setActionLoading(true);
      
      await api.put(`/leaves/${leaveId}/reject`, 
        { comments }
      );
      
      toast.success('Leave application rejected!');
      fetchLeaves();
      fetchStats();
      setShowModal(false);
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error(error.response?.data?.message || 'Failed to reject leave');
    } finally {
      setActionLoading(false);
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

  // Update the LeaveDetailModal function in your AdminLeaveManagement.jsx
// Replace the existing LeaveDetailModal with this fixed version

const LeaveDetailModal = () => {
  const [comments, setComments] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-morphism neon-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Leave Application Details</h2>
          <button 
            onClick={() => setShowModal(false)}
            className="text-secondary-400 hover:text-white"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        {selectedLeave && (
          <div className="space-y-6">
            {/* Employee Info */}
            <div className="flex items-center space-x-4 p-4 bg-secondary-800/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedLeave.employee?.fullName || 
                   selectedLeave.employee?.personalInfo?.firstName + ' ' + selectedLeave.employee?.personalInfo?.lastName ||
                   selectedLeave.employee?.user?.name}
                </h3>
                <p className="text-neon-pink">{selectedLeave.employee?.employeeId || selectedLeave.employee?.user?.employeeId}</p>
              </div>
            </div>

            {/* Leave Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-secondary-400">Leave Type</label>
                  <p className="text-white font-medium">{selectedLeave.leaveType}</p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Start Date</label>
                  <p className="text-white font-medium">{new Date(selectedLeave.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">End Date</label>
                  <p className="text-white font-medium">{new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-secondary-400">Duration</label>
                  <p className="text-white font-medium">
                    {selectedLeave.isHalfDay ? `0.5 day (${selectedLeave.halfDaySession})` : `${selectedLeave.totalDays} days`}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Applied Date</label>
                  <p className="text-white font-medium">{new Date(selectedLeave.appliedDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Status</label>
                  <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(selectedLeave.status)}`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm text-secondary-400">Reason</label>
              <p className="text-white bg-secondary-800/30 p-3 rounded-lg mt-1">{selectedLeave.reason}</p>
            </div>

            {/* Previous Comments - Fixed field name */}
            {selectedLeave.approverComments && (
              <div>
                <label className="text-sm text-secondary-400">Previous Comments</label>
                <p className="text-white bg-secondary-800/30 p-3 rounded-lg mt-1">{selectedLeave.approverComments}</p>
              </div>
            )}

            {/* Action Buttons */}
            {selectedLeave.status.toLowerCase() === 'pending' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-secondary-400">Comments (Optional)</label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 mt-1"
                    placeholder="Add comments for the employee..."
                    maxLength="300"
                  />
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => handleReject(selectedLeave._id, comments)}
                    disabled={actionLoading}
                    className="px-6 py-3 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {actionLoading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedLeave._id, comments)}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 flex items-center"
                  >
                    {actionLoading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Leave Management</h1>
            <p className="text-secondary-400">Manage employee leave requests</p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
                <p className="text-secondary-400">Total Applications</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-yellow-400">{stats.pending}</h3>
                <p className="text-secondary-400">Pending</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-green-400">{stats.approved}</h3>
                <p className="text-secondary-400">Approved</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-red-400">{stats.rejected}</h3>
                <p className="text-secondary-400">Rejected</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Types</option>
                <option value="Casual">Casual</option>
                <option value="Sick">Sick</option>
                <option value="Earned">Earned</option>
                <option value="Emergency">Emergency</option>
                <option value="Personal">Personal</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setLeaveTypeFilter('');
              }}
              className="px-4 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Leave Applications Table/Cards */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 text-neon-pink mx-auto mb-4 animate-spin" />
              <p className="text-secondary-400">Loading leave applications...</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden grid gap-4 p-4">
                {leaves.map((leave) => (
                  <div key={leave._id} className="bg-secondary-800/30 border border-secondary-700 rounded-xl p-4 hover:bg-secondary-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {leave.employee?.fullName ||
                             (leave.employee?.personalInfo?.firstName + ' ' + leave.employee?.personalInfo?.lastName) ||
                             leave.employee?.user?.name}
                          </p>
                          <p className="text-secondary-400 text-xs flex items-center">
                            <span className="truncate">{leave.employee?.employeeId || leave.employee?.user?.employeeId}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowModal(true);
                          }}
                          className="p-1.5 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {leave.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              className="p-1.5 text-secondary-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                              title="Quick Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(leave._id, 'Application rejected')}
                              className="p-1.5 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Quick Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-secondary-400 text-xs">Leave Type</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                          {leave.leaveType}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary-400 text-xs">Duration</span>
                        <span className="text-white text-sm">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary-400 text-xs">Days</span>
                        <span className="text-white text-sm">{leave.totalDays} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary-400 text-xs">Applied Date</span>
                        <span className="text-secondary-400 text-sm">
                          {new Date(leave.appliedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary-400 text-xs">Status</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-secondary-700">
                      <tr>
                        <th className="text-left p-6 text-secondary-300 font-medium">Employee</th>
                        <th className="text-left p-6 text-secondary-300 font-medium">Leave Type</th>
                        <th className="text-left p-6 text-secondary-300 font-medium">Duration</th>
                        <th className="text-left p-6 text-secondary-300 font-medium">Applied Date</th>
                        <th className="text-left p-6 text-secondary-300 font-medium">Status</th>
                        <th className="text-left p-6 text-secondary-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((leave) => (
                        <tr key={leave._id} className="border-b border-secondary-800 hover:bg-secondary-800/30 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {leave.employee?.fullName ||
                                   (leave.employee?.personalInfo?.firstName + ' ' + leave.employee?.personalInfo?.lastName) ||
                                   leave.employee?.user?.name}
                                </p>
                                <p className="text-secondary-400 text-sm">{leave.employee?.employeeId || leave.employee?.user?.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 text-xs rounded-full ${getLeaveTypeColor(leave.leaveType)}`}>
                              {leave.leaveType}
                            </span>
                          </td>
                          <td className="p-6 text-white">
                            <div>
                              <p>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                              <p className="text-sm text-secondary-400">{leave.totalDays} days</p>
                            </div>
                          </td>
                          <td className="p-6 text-secondary-400">
                            {new Date(leave.appliedDate).toLocaleDateString()}
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(leave.status)}`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedLeave(leave);
                                  setShowModal(true);
                                }}
                                className="p-2 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {leave.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(leave._id)}
                                    className="p-2 text-secondary-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                    title="Quick Approve"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(leave._id, 'Application rejected')}
                                    className="p-2 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    title="Quick Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!loading && leaves.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-400 mb-2">No leave applications found</h3>
              <p className="text-secondary-500">
                {searchTerm || statusFilter || leaveTypeFilter
                  ? 'Try adjusting your search filters'
                  : 'No leave applications have been submitted yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && <LeaveDetailModal />}
    </AdminLayout>
  );
};
export default AdminLeaveManagement;