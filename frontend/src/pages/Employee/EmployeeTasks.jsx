import React, { useState, useEffect } from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { 
  Target, 
  Clock, 
  CheckCircle, 
  Eye, 
  Play, 
  Pause,
  Flag,
  Calendar,
  BarChart3,
  MessageCircle,
  Plus,
  X,
  Send,
  AlertTriangle,
  User,
  FileText,
  Filter,
  Loader2   // Add loading spinner
} from 'lucide-react';
import toast from 'react-hot-toast';

// Import your API services
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/taskService';

const EmployeeTasks = () => {
  const { user } = useAuth();
  const {
    tasks,
    loading,
    error,
    stats,
    filters,
    setFilters,
    updateProgress,
    changeStatus,
    addComment,
    toggleSubtask,
    fetchTasks
  } = useTasks();

  const [filteredTasks, setFilteredTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [timeTracking, setTimeTracking] = useState({});
  const [modalLoading, setModalLoading] = useState(false);

  // Filter tasks based on frontend filters
  useEffect(() => {
    let filtered = tasks.filter(task => {
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });

    setFilteredTasks(filtered);
  }, [tasks, statusFilter, priorityFilter]);

  // Handle task status update
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await changeStatus(taskId, newStatus);
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  // Handle task progress update
  const updateTaskProgress = async (taskId, progress) => {
    try {
      await updateProgress(taskId, Math.max(0, Math.min(100, progress)));
    } catch (error) {
      toast.error('Failed to update task progress');
    }
  };

  // Handle subtask toggle
  const handleToggleSubtask = async (taskId, subtaskId) => {
    try {
      await toggleSubtask(taskId, subtaskId);
      
      // Update progress based on subtasks for the selected task in modal
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = tasks.find(t => t._id === taskId);
        if (updatedTask && updatedTask.subtasks.length > 0) {
          const completedSubtasks = updatedTask.subtasks.filter(st => st.completed).length;
          const totalSubtasks = updatedTask.subtasks.length;
          const newProgress = Math.round((completedSubtasks / totalSubtasks) * 100);
          await updateTaskProgress(taskId, newProgress);
        }
      }
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  // Handle add comment
  const handleAddComment = async (taskId) => {
    if (!newComment.trim()) return;

    try {
      await addComment(taskId, newComment.trim());
      setNewComment('');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  // Time tracking functions
  const startTimer = (taskId) => {
    setTimeTracking({
      ...timeTracking,
      [taskId]: {
        isRunning: true,
        startTime: Date.now(),
        elapsed: timeTracking[taskId]?.elapsed || 0
      }
    });
    toast.success('Timer started');
  };

  const stopTimer = (taskId) => {
    const tracking = timeTracking[taskId];
    if (tracking && tracking.isRunning) {
      const newElapsed = tracking.elapsed + (Date.now() - tracking.startTime);
      setTimeTracking({
        ...timeTracking,
        [taskId]: {
          ...tracking,
          isRunning: false,
          elapsed: newElapsed
        }
      });

      // Here you could also update actual hours in the backend
      const hoursToAdd = newElapsed / (1000 * 60 * 60);
      toast.success(`Timer stopped. Session: ${formatTime(newElapsed)}`);
    }
  };

  // Get task details for modal
  const handleViewTask = async (task) => {
    try {
      setModalLoading(true);
      setSelectedTask(task);
      setShowTaskModal(true);
      
      // Optionally fetch fresh task data
      const response = await taskService.getTaskById(task._id);
      setSelectedTask(response.task);
    } catch (error) {
      toast.error('Failed to load task details');
    } finally {
      setModalLoading(false);
    }
  };

  // Utility functions
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'not started': return 'text-gray-400 bg-gray-400/20';
      case 'in progress': return 'text-blue-400 bg-blue-400/20';
      case 'completed': return 'text-green-400 bg-green-400/20';
      case 'review': return 'text-purple-400 bg-purple-400/20';
      case 'on hold': return 'text-yellow-400 bg-yellow-400/20';
      case 'cancelled': return 'text-red-400 bg-red-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'text-green-400 bg-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'high': return 'text-orange-400 bg-orange-400/20';
      case 'critical': return 'text-red-400 bg-red-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  const isOverdue = (dueDate, status) => {
    return status !== 'Completed' && new Date(dueDate) < new Date();
  };

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-neon-pink" />
            <p className="text-secondary-400">Loading tasks...</p>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Error Loading Tasks</h3>
            <p className="text-secondary-400 mb-4">{error}</p>
            <button
              onClick={() => fetchTasks()}
              className="px-4 py-2 bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  const TaskDetailModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-morphism neon-border rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Task Details</h2>
          <button 
            onClick={() => setShowTaskModal(false)}
            className="text-secondary-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {modalLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neon-pink" />
          </div>
        ) : selectedTask && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Task Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-4 bg-secondary-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{selectedTask.title}</h3>
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                </div>
                <p className="text-secondary-400 mb-4">{selectedTask.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary-400">Project:</span>
                    <p className="text-white font-medium">{selectedTask.project}</p>
                  </div>
                  <div>
                    <span className="text-secondary-400">Category:</span>
                    <p className="text-white font-medium">{selectedTask.category}</p>
                  </div>
                  <div>
                    <span className="text-secondary-400">Priority:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-400">Due Date:</span>
                    <p className={`font-medium ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-400' : 'text-white'}`}>
                      {formatDate(selectedTask.dueDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-secondary-400">Assigned By:</span>
                    <p className="text-white font-medium">
                      {selectedTask.assignedBy?.name || 'Admin'}
                    </p>
                  </div>
                  <div>
                    <span className="text-secondary-400">Created:</span>
                    <p className="text-white font-medium">
                      {formatDate(selectedTask.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="p-4 bg-secondary-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-white">Progress</h4>
                  <span className="text-neon-pink font-bold">{selectedTask.progress}%</span>
                </div>
                <div className="w-full bg-secondary-700 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-neon-pink to-neon-purple h-3 rounded-full transition-all duration-300"
                    style={{ width: `${selectedTask.progress}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedTask.progress}
                    onChange={(e) => updateTaskProgress(selectedTask._id, parseInt(e.target.value))}
                    className="flex-1 accent-neon-pink"
                    disabled={selectedTask.status === 'Completed'}
                  />
                  <div className="flex space-x-2">
                    {selectedTask.status !== 'Completed' && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(selectedTask._id, selectedTask.status === 'In Progress' ? 'Not Started' : 'In Progress')}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors"
                        >
                          {selectedTask.status === 'In Progress' ? 'Pause' : 'Start'}
                        </button>
                        <button
                          onClick={() => updateTaskProgress(selectedTask._id, 100)}
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors"
                        >
                          Complete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="p-4 bg-secondary-800/30 rounded-lg">
                  <h4 className="text-lg font-bold text-white mb-4">
                    Subtasks ({selectedTask.subtasks.filter(st => st.completed).length}/{selectedTask.subtasks.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask) => (
                      <div key={subtask._id} className="flex items-center space-x-3 p-3 bg-secondary-700/30 rounded-lg">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => handleToggleSubtask(selectedTask._id, subtask._id)}
                          className="w-4 h-4 rounded border-secondary-600 bg-secondary-800 text-neon-pink focus:ring-neon-pink"
                        />
                        <span className={`flex-1 ${subtask.completed ? 'text-secondary-400 line-through' : 'text-white'}`}>
                          {subtask.title}
                        </span>
                        {subtask.completedAt && (
                          <span className="text-xs text-secondary-400">
                            {formatDate(subtask.completedAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="p-4 bg-secondary-800/30 rounded-lg">
                <h4 className="text-lg font-bold text-white mb-4">
                  Comments ({selectedTask.comments?.length || 0})
                </h4>
                
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((comment) => (
                      <div key={comment._id} className="p-3 bg-secondary-700/30 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-white font-medium text-sm">
                            {comment.user?.name || 'Unknown User'}
                          </span>
                          <span className="text-secondary-400 text-xs">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-secondary-300 text-sm">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-secondary-400 text-sm">No comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/20"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(selectedTask._id)}
                  />
                  <button
                    onClick={() => handleAddComment(selectedTask._id)}
                    disabled={!newComment.trim()}
                    className="px-3 py-2 bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-6">
              {/* Time Tracking */}
              <div className="p-4 bg-secondary-800/30 rounded-lg">
                <h4 className="text-lg font-bold text-white mb-4">Time Tracking</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-secondary-400">Estimated</span>
                    <span className="text-white">{selectedTask.estimatedHours || 0}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-400">Actual</span>
                    <span className="text-white">{Math.round(selectedTask.actualHours || 0)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-400">Session</span>
                    <span className="text-neon-pink">
                      {timeTracking[selectedTask._id] ? formatTime(timeTracking[selectedTask._id].elapsed) : '0h 0m'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {timeTracking[selectedTask._id]?.isRunning ? (
                    <button
                      onClick={() => stopTimer(selectedTask._id)}
                      className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Timer
                    </button>
                  ) : (
                    <button
                      onClick={() => startTimer(selectedTask._id)}
                      className="w-full px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors flex items-center justify-center"
                      disabled={selectedTask.status === 'Completed'}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Timer
                    </button>
                  )}
                </div>
              </div>

              {/* Task Actions */}
              <div className="p-4 bg-secondary-800/30 rounded-lg">
                <h4 className="text-lg font-bold text-white mb-4">Actions</h4>
                <div className="space-y-3">
                  {selectedTask.status !== 'Completed' && (
                    <>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'In Progress')}
                        disabled={selectedTask.status === 'In Progress'}
                        className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedTask.status === 'In Progress' ? 'Already In Progress' : 'Start Task'}
                      </button>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'On Hold')}
                        disabled={selectedTask.status === 'On Hold'}
                        className="w-full px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedTask.status === 'On Hold' ? 'Already On Hold' : 'Put On Hold'}
                      </button>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'Review')}
                        disabled={selectedTask.status === 'Review'}
                        className="w-full px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedTask.status === 'Review' ? 'In Review' : 'Submit for Review'}
                      </button>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'Completed')}
                        className="w-full px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        Mark Complete
                      </button>
                    </>
                  )}
                  {selectedTask.status === 'Completed' && (
                    <div className="text-center py-4">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-medium">Task Completed!</p>
                      <p className="text-secondary-400 text-sm mt-1">
                        Completed on {formatDate(selectedTask.completedDate || selectedTask.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Tasks</h1>
            <p className="text-secondary-400">Track and manage your assigned tasks</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-white">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-secondary-400">Welcome back, {user?.name}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{stats?.total || 0}</h3>
                <p className="text-secondary-400">Total Tasks</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-blue-400">{stats?.inProgress || 0}</h3>
                <p className="text-secondary-400">In Progress</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-green-400">{stats?.completed || 0}</h3>
                <p className="text-secondary-400">Completed</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-red-400">{stats?.overdue || 0}</h3>
                <p className="text-secondary-400">Overdue</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            <div className="relative">
              <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
              }}
              className="px-4 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
            >
              Clear Filters
            </button>

            <button
              onClick={() => fetchTasks()}
              className="px-4 py-3 bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div key={task._id} className="glass-morphism neon-border rounded-2xl p-6 hover-glow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{task.title}</h3>
                  <p className="text-secondary-400 text-sm mb-3 line-clamp-2">{task.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-400">Project</span>
                  <span className="text-white font-medium">{task.project}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-400">Due Date</span>
                  <span className={`font-medium ${isOverdue(task.dueDate, task.status) ? 'text-red-400' : 'text-white'}`}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-400">Status</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-secondary-400">Progress</span>
                    <span className="text-sm text-neon-pink font-medium">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-neon-pink to-neon-purple h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>

                {isOverdue(task.dueDate, task.status) && (
                  <div className="flex items-center text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Overdue
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => handleViewTask(task)}
                    className="px-4 py-2 bg-secondary-700 text-white rounded-lg hover:bg-secondary-600 transition-colors flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>

                  {task.status !== 'Completed' && (
                    <div className="flex space-x-2">
                      {timeTracking[task._id]?.isRunning ? (
                        <button
                          onClick={() => stopTimer(task._id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                          title="Stop Timer"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startTimer(task._id)}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                          title="Start Timer"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => updateTaskProgress(task._id, 100)}
                        className="p-2 bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors"
                        title="Mark Complete"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="glass-morphism neon-border rounded-2xl p-12 text-center">
            <Target className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-400 mb-2">No tasks found</h3>
            <p className="text-secondary-500">
              {statusFilter || priorityFilter
                ? 'Try adjusting your filters to see more tasks'
                : 'You have no assigned tasks at the moment'}
            </p>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {showTaskModal && <TaskDetailModal />}
    </EmployeeLayout>
  );
};

export default EmployeeTasks;