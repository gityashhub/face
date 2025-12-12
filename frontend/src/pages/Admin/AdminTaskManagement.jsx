import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit,
  Trash2, 
  User,
  Calendar,
  Flag,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  X,
  Save,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Import API services
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { employeeAPI } from '../../utils/api'; // Use the same API as employee management

const AdminTaskManagement = () => {


  const { user } = useAuth();
  const {
    tasks,
    loading,
    error,
    stats,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks
  } = useTasks();

  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    project: '',
    priority: 'Medium',
    dueDate: '',
    category: 'Development',
    estimatedHours: 0
  });

  // State for employees and projects
  const [employees, setEmployees] = useState([]);
  const [projects] = useState(['E-commerce Platform', 'Mobile App', 'Bug Fixes', 'Website Redesign', 'API Integration']);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch employees when component mounts using the same API as employee management
  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      console.log('Fetching employees for task assignment...');
      
      const response = await employeeAPI.getEmployees();
      console.log('Employee API Response for tasks:', response.data);
      
      if (response.data.success) {
        const employeeData = response.data.data?.employees || [];
        console.log('Setting employees for task assignment:', employeeData.length, 'employees');
        setEmployees(employeeData);
      } else {
        console.error('API returned success: false');
        toast.error('Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees for task assignment:', error);
      
      // Better error handling
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You don\'t have permission to view employees.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to fetch employees. Please try again.');
      }
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter tasks
  useEffect(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.assignedTo?.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.project.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      const matchesProject = !projectFilter || task.project === projectFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, statusFilter, priorityFilter, projectFilter]);
const handleAddTask = async (e) => {
  // Prevent form submission if it's a form event
  if (e && e.preventDefault) {
    e.preventDefault();
  }

  try {
    // Validation
    if (!newTask.title?.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!newTask.description?.trim()) {
      toast.error("Task description is required");
      return;
    }

    if (!newTask.assignedTo) {
      toast.error("Please assign the task to an employee");
      return;
    }

    if (!newTask.dueDate) {
      toast.error("Due date is required");
      return;
    }

    // Find the selected employee to verify it exists
    const selectedEmployee = employees.find(emp => emp._id === newTask.assignedTo);
    if (!selectedEmployee) {
      toast.error("Selected employee not found. Please refresh and try again.");
      return;
    }

    console.log('AdminTask: Creating task with data:', newTask);
    console.log('AdminTask: Selected employee:', selectedEmployee);

    // Prepare task payload
    const taskPayload = {
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      assignedTo: newTask.assignedTo, // This should be the employee _id
      project: newTask.project || '',
      priority: newTask.priority || 'Medium',
      dueDate: newTask.dueDate,
      category: newTask.category || 'Development',
      estimatedHours: parseInt(newTask.estimatedHours) || 0
    };

    console.log('AdminTask: Final payload:', taskPayload);

    // Create the task
    const response = await createTask(taskPayload);
    console.log('AdminTask: Create response:', response);

    // Reset form and close modal
    setNewTask({
      title: '',
      description: '',
      assignedTo: '',
      project: '',
      priority: 'Medium',
      dueDate: '',
      category: 'Development',
      estimatedHours: 0
    });
    setShowAddModal(false);

    // Refresh tasks to ensure we have the latest data
    await fetchTasks();
    
  } catch (error) {
    console.error('AdminTask: Create task error:', error);
    
    // Better error handling
    if (error.response?.data?.errors) {
      // Validation errors from backend
      const validationErrors = error.response.data.errors;
      validationErrors.forEach(err => {
        toast.error(err.msg || err.message);
      });
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error(error.message || 'Failed to create task');
    }
  }
};


  const handleEditTask = async (e) => {
    e.preventDefault();
    try {
      await updateTask(selectedTask._id, {
        title: selectedTask.title,
        description: selectedTask.description,
        assignedTo: selectedTask.assignedTo._id,
        project: selectedTask.project,
        priority: selectedTask.priority,
        dueDate: selectedTask.dueDate,
        category: selectedTask.category,
        estimatedHours: parseInt(selectedTask.estimatedHours) || 0
      });
      
      setShowEditModal(false);
      setSelectedTask(null);
    } catch (error) {
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
      }
    }
  };

  const handleViewTask = async (task) => {
    try {
      setModalLoading(true);
      setSelectedTask(task);
      setShowViewModal(true);
      
      // Optionally fetch fresh task data
      // const response = await taskService.getTaskById(task._id);
      // setSelectedTask(response.task);
    } catch (error) {
      toast.error('Failed to load task details');
    } finally {
      setModalLoading(false);
    }
  };

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
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-neon-pink" />
            <p className="text-secondary-400">Loading tasks...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminLayout>
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
      </AdminLayout>
    );
  }

  const TaskModal = ({ isEdit = false, isView = false }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-2 md:p-4">
      <div className="glass-morphism neon-border rounded-2xl p-1 sm:p-3 md:p-4 lg:p-6 w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
            {isView ? 'Task Details' : isEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button 
            onClick={() => {
              if (isView) setShowViewModal(false);
              else if (isEdit) setShowEditModal(false);
              else setShowAddModal(false);
            }}
            className="text-secondary-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {modalLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neon-pink" />
          </div>
        ) : isView ? (
          // View Mode
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-secondary-800/30 rounded-lg">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedTask.title}</h3>
                <p className="text-neon-pink">{selectedTask.project}</p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedTask.status)}`}>
                {selectedTask.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-secondary-400">Assigned To</label>
                  <p className="text-white font-medium">
                    {selectedTask.assignedTo?.user?.name || selectedTask.assignedTo?.fullName || 'Unknown Employee'}
                  </p>
                  <p className="text-secondary-400 text-sm">
                    {selectedTask.assignedTo?.user?.employeeId || selectedTask.assignedTo?.employeeId || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Priority</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Category</label>
                  <p className="text-white font-medium">{selectedTask.category}</p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Created</label>
                  <p className="text-white font-medium">{formatDate(selectedTask.createdAt)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-secondary-400">Due Date</label>
                  <p className={`font-medium ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-400' : 'text-white'}`}>
                    {formatDate(selectedTask.dueDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Progress</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-secondary-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-neon-pink to-neon-purple h-2 rounded-full"
                        style={{ width: `${selectedTask.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-neon-pink text-sm">{selectedTask.progress}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Hours</label>
                  <p className="text-white font-medium">
                    {Math.round(selectedTask.actualHours || 0)} / {selectedTask.estimatedHours || 0} hrs
                  </p>
                </div>
                <div>
                  <label className="text-sm text-secondary-400">Last Updated</label>
                  <p className="text-white font-medium">{formatDate(selectedTask.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-secondary-400">Description</label>
              <p className="text-white bg-secondary-800/30 p-3 rounded-lg mt-1">{selectedTask.description}</p>
            </div>

            {selectedTask.comments && selectedTask.comments.length > 0 && (
              <div>
                <label className="text-sm text-secondary-400">Recent Comments ({selectedTask.comments.length})</label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {selectedTask.comments.slice(-3).map((comment) => (
                    <div key={comment._id} className="bg-secondary-800/30 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white text-sm font-medium">
                          {comment.user?.name || 'Unknown'}
                        </span>
                        <span className="text-secondary-400 text-xs">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-secondary-300 text-sm">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Add/Edit Form
          <form onSubmit={isEdit ? handleEditTask : handleAddTask} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Title</label>
                <input
                  type="text"
                  value={isEdit ? selectedTask?.title || '' : newTask.title}
                  onChange={(e) => {
                    if (isEdit) {
                      setSelectedTask({...selectedTask, title: e.target.value});
                    } else {
                      setNewTask({...newTask, title: e.target.value});
                    }
                  }}
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Project</label>
                <select
                  value={isEdit ? selectedTask?.project || '' : newTask.project}
                  onChange={(e) => {
                    if (isEdit) {
                      setSelectedTask({...selectedTask, project: e.target.value});
                    } else {
                      setNewTask({...newTask, project: e.target.value});
                    }
                  }}
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">Description</label>
              <textarea
                value={isEdit ? selectedTask?.description || '' : newTask.description}
                onChange={(e) => {
                  if (isEdit) {
                    setSelectedTask({...selectedTask, description: e.target.value});
                  } else {
                    setNewTask({...newTask, description: e.target.value});
                  }
                }}
                rows="3"
                className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                required
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Assign To</label>
                {employeesLoading ? (
                  <div className="flex items-center space-x-2 px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-neon-pink" />
                    <span className="text-secondary-400">Loading employees...</span>
                  </div>
                ) : (
                  <select
                    value={isEdit ? selectedTask?.assignedTo?._id || '' : newTask.assignedTo}
                    onChange={(e) => {
                      if (isEdit) {
                        const employee = employees.find(emp => emp._id === e.target.value);
                        setSelectedTask({...selectedTask, assignedTo: employee});
                      } else {
                        setNewTask({...newTask, assignedTo: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName || `${emp.personalInfo?.firstName} ${emp.personalInfo?.lastName}` || emp.user?.name || 'Unknown'} 
                        ({emp.employeeId || emp.user?.employeeId || 'N/A'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Priority</label>
                <select
                  value={isEdit ? selectedTask?.priority || '' : newTask.priority}
                  onChange={(e) => {
                    if (isEdit) {
                      setSelectedTask({...selectedTask, priority: e.target.value});
                    } else {
                      setNewTask({...newTask, priority: e.target.value});
                    }
                  }}
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Due Date</label>
                <input
                  type="date"
                  value={isEdit ? selectedTask?.dueDate?.split('T')[0] || '' : newTask.dueDate}
                  onChange={(e) => {
                    if (isEdit) {
                      setSelectedTask({...selectedTask, dueDate: e.target.value});
                    } else {
                      setNewTask({...newTask, dueDate: e.target.value});
                    }
                  }}
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Category</label>
                <select
                  value={isEdit ? selectedTask?.category || '' : newTask.category}
                  onChange={(e) => {
                    if (isEdit) {
                      setSelectedTask({...selectedTask, category: e.target.value});
                    } else {
                      setNewTask({...newTask, category: e.target.value});
                    }
                  }}
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                >
                  <option value="Development">Development</option>
                  <option value="Design">Design</option>
                  <option value="Testing">Testing</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Bug Fix">Bug Fix</option>
                  <option value="Feature">Feature</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Estimated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={isEdit ? selectedTask?.estimatedHours || '' : newTask.estimatedHours}
                  onChange={(e) => {
                    if (isEdit) {
                      setSelectedTask({...selectedTask, estimatedHours: parseFloat(e.target.value) || 0});
                    } else {
                      setNewTask({...newTask, estimatedHours: parseFloat(e.target.value) || 0});
                    }
                  }}
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  if (isEdit) setShowEditModal(false);
                  else setShowAddModal(false);
                }}
                className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={employeesLoading}
                className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                {isEdit ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Task Management</h1>
            <p className="text-secondary-400 text-sm sm:text-base">Assign and track tasks for your team</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 space-x-0 sm:space-x-3">
            <button
              onClick={() => {
                fetchTasks();
                fetchEmployees();
              }}
              className="px-4 sm:px-6 py-2 sm:py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors flex items-center"
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">{stats?.total || 0}</h3>
                <p className="text-secondary-400 text-sm sm:text-base">Total Tasks</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-blue-400">{stats?.inProgress || 0}</h3>
                <p className="text-secondary-400 text-sm sm:text-base">In Progress</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-green-400">{stats?.completed || 0}</h3>
                <p className="text-secondary-400 text-sm sm:text-base">Completed</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-red-400">{stats?.overdue || 0}</h3>
                <p className="text-secondary-400 text-sm sm:text-base">Overdue</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Project Filter */}
            <div className="relative">
              <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setPriorityFilter('');
                setProjectFilter('');
              }}
              className="px-4 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors md:col-span-2 lg:col-span-1"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Tasks Table - Desktop */}
        <div className="hidden md:block glass-morphism neon-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-secondary-700">
                <tr>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Task</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Assigned To</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Project</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Priority</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Status</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Progress</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Due Date</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task._id} className="border-b border-secondary-800 hover:bg-secondary-800/30 transition-colors">
                    <td className="p-4 sm:p-6">
                      <div>
                        <p className="text-white font-medium">{task.title}</p>
                        <p className="text-secondary-400 text-sm">{task.category}</p>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {task.assignedTo?.user?.name || 'Unknown Employee'}
                          </p>
                          <p className="text-secondary-400 text-sm">
                            {task.assignedTo?.user?.employeeId || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6">
                      <span className="px-3 py-1 text-xs rounded-full bg-secondary-700 text-secondary-300">
                        {task.project}
                      </span>
                    </td>
                    <td className="p-4 sm:p-6">
                      <span className={`px-3 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4 sm:p-6">
                      <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-secondary-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-neon-pink to-neon-purple h-2 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-neon-pink text-sm">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className={`${isOverdue(task.dueDate, task.status) ? 'text-red-400' : 'text-white'}`}>
                        {formatDate(task.dueDate)}
                        {isOverdue(task.dueDate, task.status) && (
                          <div className="flex items-center text-red-400 text-sm mt-1">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Overdue
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewTask(task)}
                          className="p-2 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-2 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="p-6 sm:p-12 text-center">
              <Target className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-400 mb-2">No tasks found</h3>
              <p className="text-secondary-500">
                {searchTerm || statusFilter || priorityFilter || projectFilter
                  ? 'Try adjusting your search filters'
                  : 'Start by creating your first task'}
              </p>
            </div>
          )}
        </div>

        {/* Tasks Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="glass-morphism neon-border rounded-2xl p-6 sm:p-12 text-center">
              <Target className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-400 mb-2">No tasks found</h3>
              <p className="text-secondary-500">
                {searchTerm || statusFilter || priorityFilter || projectFilter
                  ? 'Try adjusting your search filters'
                  : 'Start by creating your first task'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task._id} className="glass-morphism neon-border rounded-2xl p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-medium text-lg">{task.title}</h3>
                    <p className="text-secondary-400 text-sm">{task.category}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-secondary-400">Assigned To</p>
                    <p className="text-white font-medium">
                      {task.assignedTo?.user?.name || 'Unknown Employee'}
                    </p>
                  </div>
                  <div>
                    <p className="text-secondary-400">Project</p>
                    <p className="text-white font-medium">{task.project}</p>
                  </div>
                  <div>
                    <p className="text-secondary-400">Priority</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-secondary-400">Due Date</p>
                    <p className={`font-medium ${isOverdue(task.dueDate, task.status) ? 'text-red-400' : 'text-white'}`}>
                      {formatDate(task.dueDate)}
                      {isOverdue(task.dueDate, task.status) && (
                        <span className="text-red-400 text-xs block">Overdue</span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-secondary-400 text-sm mb-2">Progress</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-secondary-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-neon-pink to-neon-purple h-2 rounded-full"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-neon-pink text-sm">{task.progress}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-secondary-700">
                  <button
                    onClick={() => handleViewTask(task)}
                    className="p-2 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-secondary-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="p-2 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Task Distribution by Project</h2>
              <BarChart3 className="w-5 h-5 text-neon-pink" />
            </div>
            <div className="space-y-4">
              {stats?.projectDistribution?.slice(0, 4).map((project) => {
                const percentage = stats.total > 0 ? (project.count / stats.total) * 100 : 0;
                return (
                  <div key={project._id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{project._id || 'No Project'}</span>
                      <span className="text-neon-pink text-sm">{project.count} tasks</span>
                    </div>
                    <div className="w-full bg-secondary-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-neon-pink to-neon-purple h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              }) || (
                <div className="text-center py-4">
                  <p className="text-secondary-400">No project data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Tasks</h2>
              <Clock className="w-5 h-5 text-neon-purple" />
            </div>
            <div className="space-y-4">
              {tasks.slice(0, 4).map((task) => (
                <div key={task._id} className="flex items-center justify-between p-3 bg-secondary-800/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-sm text-secondary-400">
                      {task.assignedTo?.user?.name || 'Unknown Employee'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className="text-xs text-secondary-400">
                      {formatDate(task.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-secondary-400">No tasks created yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <TaskModal />}
      {showEditModal && <TaskModal isEdit />}
      {showViewModal && <TaskModal isView />}
    </AdminLayout>
  );
};

export default AdminTaskManagement;