import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, Shield, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { authAPI } from '../../utils/api';

const AdminProfile = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Administration',
    role: 'admin'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      if (response.data.success) {
        const userData = response.data.data.user;
        setProfile({
          name: userData.name || localStorage.getItem('userName') || '',
          email: userData.email || localStorage.getItem('userEmail') || '',
          phone: userData.phone || '',
          department: 'Administration',
          role: 'admin'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile({
        name: localStorage.getItem('userName') || 'Admin',
        email: localStorage.getItem('userEmail') || 'admin@company.com',
        phone: '',
        department: 'Administration',
        role: 'admin'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile({
        name: profile.name,
        phone: profile.phone
      });
      toast.success('Profile updated successfully');
      localStorage.setItem('userName', profile.name);
      // Refresh profile data to show updated values
      await fetchProfile();
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-pink"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-secondary-400 mt-1">Manage your account information</p>
        </div>

        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="flex items-center space-x-4 mb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-secondary-700 rounded-full flex items-center justify-center border-2 border-secondary-800 hover:bg-secondary-600 transition-colors">
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{profile.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <Shield className="w-4 h-4 text-neon-pink" />
                <span className="text-sm text-neon-pink">Administrator</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-secondary-800/30 border border-secondary-700 rounded-lg text-secondary-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-secondary-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Department
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  value={profile.department}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-secondary-800/30 border border-secondary-700 rounded-lg text-secondary-400 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;