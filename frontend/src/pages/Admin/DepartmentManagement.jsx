import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../../utils/api';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Building,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  Eye,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    code: '',
    description: '',
    manager: '',
    location: '',
    budget: 0,
    status: 'Active',
    establishedDate: new Date().toISOString().split('T')[0],
    goals: []
  });

  const statusOptions = ['Active', 'Inactive', 'Restructuring'];

  // Fetch departments from backend
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentAPI.getDepartments();
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = departments.filter(dept => {
    const searchLower = searchTerm.toLowerCase();
    return dept.name.toLowerCase().includes(searchLower) ||
           dept.code.toLowerCase().includes(searchLower) ||
           dept.manager?.toLowerCase().includes(searchLower) ||
           dept.description?.toLowerCase().includes(searchLower);
  });

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    
    if (!newDepartment.name || !newDepartment.code) {
      toast.error('Department name and code are required');
      return;
    }

    try {
      const response = await departmentAPI.createDepartment(newDepartment);
      
      if (response.data.success) {
        await fetchDepartments();
        resetForm();
        setShowAddModal(false);
        toast.success('Department created successfully!');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error(error.response?.data?.message || 'Failed to create department');
    }
  };

  const handleEditDepartment = async (e) => {
    e.preventDefault();
    
    try {
      const response = await departmentAPI.updateDepartment(selectedDepartment._id, selectedDepartment);
      if (response.data.success) {
        await fetchDepartments();
        setShowEditModal(false);
        setSelectedDepartment(null);
        toast.success('Department updated successfully!');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error(error.response?.data?.message || 'Failed to update department');
    }
  };

  const handleDeleteDepartment = async (id) => {
    const department = departments.find(d => d._id === id);
    
    if (department?.employeeCount > 0) {
      toast.error('Cannot delete department with employees. Please reassign employees first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the ${department?.name} department?`)) {
      try {
        const response = await departmentAPI.deleteDepartment(id);
        if (response.data.success) {
          await fetchDepartments();
          toast.success('Department deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting department:', error);
        toast.error(error.response?.data?.message || 'Failed to delete department');
      }
    }
  };

  const resetForm = () => {
    setNewDepartment({
      name: '',
      code: '',
      description: '',
      manager: '',
      location: '',
      budget: 0,
      status: 'Active',
      establishedDate: new Date().toISOString().split('T')[0],
      goals: []
    });
  };

  const addGoal = () => {
    if (newDepartment.goals.length < 5) {
      setNewDepartment({
        ...newDepartment,
        goals: [...newDepartment.goals, '']
      });
    }
  };

  const updateGoal = (index, value) => {
    const updatedGoals = [...newDepartment.goals];
    updatedGoals[index] = value;
    setNewDepartment({
      ...newDepartment,
      goals: updatedGoals
    });
  };

  const removeGoal = (index) => {
    const updatedGoals = newDepartment.goals.filter((_, i) => i !== index);
    setNewDepartment({
      ...newDepartment,
      goals: updatedGoals
    });
  };

  // Add Department Modal
  const AddDepartmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 neon-border rounded-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add New Department</h2>
          <button 
            onClick={() => {resetForm(); setShowAddModal(false);}}
            className="text-secondary-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleCreateDepartment} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Department Name *</label>
                <input
                  type="text"
                  defaultValue={newDepartment.name}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Department Code *</label>
                <input
                  type="text"
                  defaultValue={newDepartment.code}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  placeholder="e.g., ENG, HR, MKT"
                  maxLength={5}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-secondary-300 mb-2">Description</label>
                <textarea
                  defaultValue={newDepartment.description}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  placeholder="Brief description of the department..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Department Manager</label>
                <input
                  type="text"
                  defaultValue={newDepartment.manager}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({
                      ...prev,
                      manager: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  placeholder="Manager name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Location</label>
                <input
                  type="text"
                  defaultValue={newDepartment.location}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  placeholder="Office location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Budget</label>
                <input
                  type="number"
                  defaultValue={newDepartment.budget}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({
                      ...prev,
                      budget: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Status</label>
                <select
                  defaultValue={newDepartment.status}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">Established Date</label>
                <input
                  type="date"
                  defaultValue={newDepartment.establishedDate}
                  onChange={(e) =>
                    setNewDepartment((prev) => ({
                      ...prev,
                      establishedDate: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                />
              </div>
            </div>
          </div>

          {/* Goals Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">Department Goals</h3>
              <button
                type="button"
                onClick={addGoal}
                className="px-3 py-1 text-sm bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors"
                disabled={newDepartment.goals.length >= 5}
              >
                Add Goal
              </button>
            </div>
            {newDepartment.goals.map((goal, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  defaultValue={goal}
                  onChange={(e) => updateGoal(index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                  placeholder={`Goal ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeGoal(index)}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-600">
            <button
              type="button"
              onClick={() => {resetForm(); setShowAddModal(false);}}
              className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300"
            >
              Create Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Edit Modal (similar to Add but with selectedDepartment)
  const EditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 neon-border rounded-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Department</h2>
          <button onClick={() => setShowEditModal(false)} className="text-secondary-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleEditDepartment} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">Department Name *</label>
              <input
                type="text"
                value={selectedDepartment?.name || ''}
                onChange={(e) => setSelectedDepartment({...selectedDepartment, name: e.target.value})}
                className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">Department Code *</label>
              <input
                type="text"
                value={selectedDepartment?.code || ''}
                onChange={(e) => setSelectedDepartment({...selectedDepartment, code: e.target.value.toUpperCase()})}
                className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                maxLength={5}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-600">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300"
            >
              Update Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // View Modal
  const ViewModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Enhanced backdrop with blur */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowViewModal(false)} />

      {/* Modal content */}
      <div className="relative glass-morphism neon-border rounded-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Department Details</h2>
          <button onClick={() => setShowViewModal(false)} className="text-secondary-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {selectedDepartment && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-secondary-800/30 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedDepartment.name}</h3>
                <p className="text-neon-pink">{selectedDepartment.code}</p>
                <p className="text-secondary-400">{selectedDepartment.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Information</h4>
                <div className="space-y-2">
                  <p className="text-secondary-300"><span className="text-white">Manager:</span> {selectedDepartment.manager || 'Not assigned'}</p>
                  <p className="text-secondary-300"><span className="text-white">Location:</span> {selectedDepartment.location || 'Not specified'}</p>
                  <p className="text-secondary-300"><span className="text-white">Status:</span> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      selectedDepartment.status === 'Active' ? 'bg-green-400/20 text-green-400' :
                      selectedDepartment.status === 'Inactive' ? 'bg-red-400/20 text-red-400' :
                      'bg-yellow-400/20 text-yellow-400'
                    }`}>
                      {selectedDepartment.status}
                    </span>
                  </p>
                  <p className="text-secondary-300"><span className="text-white">Employees:</span> {selectedDepartment.employeeCount || 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Goals</h4>
                {selectedDepartment.goals && selectedDepartment.goals.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedDepartment.goals.map((goal, index) => (
                      <li key={index} className="flex items-start space-x-2 text-secondary-300">
                        <CheckCircle className="w-4 h-4 text-neon-pink mt-1 flex-shrink-0" />
                        <span>{goal}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-secondary-400">No goals set</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading departments...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Department Management</h1>
            <p className="text-secondary-400 text-sm sm:text-base">Manage company departments and organizational structure</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold text-sm rounded-lg hover-glow transition-all duration-300 flex items-center"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Add Department
          </button>
        </div>

        {/* Search */}
        <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
            />
          </div>
        </div>

        {/* Department Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">{departments.length}</h3>
                <p className="text-secondary-400 text-sm sm:text-base">Total Departments</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {departments.filter(d => d.status === 'Active').length}
                </h3>
                <p className="text-secondary-400 text-sm sm:text-base">Active</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0)}
                </h3>
                <p className="text-secondary-400 text-sm sm:text-base">Total Employees</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="glass-morphism neon-border rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {departments.reduce((sum, dept) => sum + (dept.budget || 0), 0).toLocaleString()}
                </h3>
                <p className="text-secondary-400 text-sm sm:text-base">Total Budget</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Department Table */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-secondary-700">
                <tr>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Department</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Manager</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Employees</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Status</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Budget</th>
                  <th className="text-left p-4 sm:p-6 text-secondary-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((department) => (
                  <tr key={department._id} className="border-b border-secondary-800 hover:bg-secondary-800/30 transition-colors">
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                          <Building className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{department.name}</p>
                          <p className="text-secondary-400 text-sm">{department.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 text-white">{department.manager || 'Not assigned'}</td>
                    <td className="p-4 sm:p-6 text-white">{department.employeeCount || 0}</td>
                    <td className="p-4 sm:p-6">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        department.status === 'Active' ? 'bg-green-400/20 text-green-400' :
                        department.status === 'Inactive' ? 'bg-red-400/20 text-red-400' :
                        'bg-yellow-400/20 text-yellow-400'
                      }`}>
                        {department.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-6 text-white">{department.budget ? `₹${department.budget.toLocaleString()}` : '-'}</td>
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDepartment(department);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDepartment(department);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(department._id)}
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

          {/* Mobile Card View */}
          <div className="md:hidden">
            {filteredDepartments.map((department) => (
              <div key={department._id} className="p-4 border-b border-secondary-800 hover:bg-secondary-800/30 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{department.name}</p>
                    <p className="text-secondary-400 text-sm">{department.code}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <p className="text-secondary-300 text-sm"><span className="text-white">Manager:</span> {department.manager || 'Not assigned'}</p>
                  <p className="text-secondary-300 text-sm"><span className="text-white">Employees:</span> {department.employeeCount || 0}</p>
                  <p className="text-secondary-300 text-sm"><span className="text-white">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      department.status === 'Active' ? 'bg-green-400/20 text-green-400' :
                      department.status === 'Inactive' ? 'bg-red-400/20 text-red-400' :
                      'bg-yellow-400/20 text-yellow-400'
                    }`}>
                      {department.status}
                    </span>
                  </p>
                  <p className="text-secondary-300 text-sm"><span className="text-white">Budget:</span> {department.budget ? `₹${department.budget.toLocaleString()}` : '-'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedDepartment(department);
                      setShowViewModal(true);
                    }}
                    className="p-2 text-secondary-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDepartment(department);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-secondary-400 hover:text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(department._id)}
                    className="p-2 text-secondary-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredDepartments.length === 0 && (
            <div className="p-8 sm:p-12 text-center">
              <Building className="w-10 h-10 sm:w-12 sm:h-12 text-secondary-600 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-secondary-400 mb-2">No departments found</h3>
              <p className="text-sm sm:text-base text-secondary-500">
                {searchTerm
                  ? 'Try adjusting your search term'
                  : 'Start by adding your first department'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 neon-border rounded-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Department</h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
                className="text-secondary-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      defaultValue={newDepartment.name}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Department Code *
                    </label>
                    <input
                      type="text"
                      defaultValue={newDepartment.code}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({
                          ...prev,
                          code: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      placeholder="e.g., ENG, HR, MKT"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Description
                    </label>
                    <textarea
                      defaultValue={newDepartment.description}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      placeholder="Brief description of the department..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Department Manager
                    </label>
                    <input
                      type="text"
                      defaultValue={newDepartment.manager}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({
                          ...prev,
                          manager: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      placeholder="Manager name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      defaultValue={newDepartment.location}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      placeholder="Office location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Budget
                    </label>
                    <input
                      type="number"
                      defaultValue={newDepartment.budget}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({
                          ...prev,
                          budget: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Status
                    </label>
                    <select
                      defaultValue={newDepartment.status}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">
                      Established Date
                    </label>
                    <input
                      type="date"
                      defaultValue={newDepartment.establishedDate}
                      onChange={(e) =>
                        setNewDepartment((prev) => ({
                          ...prev,
                          establishedDate: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                    />
                  </div>
                </div>
              </div>

              {/* Goals Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white border-b border-secondary-600 pb-2">
                    Department Goals
                  </h3>
                  <button
                    type="button"
                    onClick={addGoal}
                    className="px-3 py-1 text-sm bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors"
                    disabled={newDepartment.goals.length >= 5}
                  >
                    Add Goal
                  </button>
                </div>
                {newDepartment.goals.map((goal, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      defaultValue={goal}
                      onChange={(e) => updateGoal(index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20"
                      placeholder={`Goal ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-600">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowAddModal(false);
                  }}
                  className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && <EditModal />}
      {showViewModal && <ViewModal />}
    </AdminLayout>
  );
};

export default DepartmentManagement;