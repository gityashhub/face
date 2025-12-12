import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { User, Settings, LogOut, Shield, Calendar, Clock } from "lucide-react";

const ProfileDropdown = ({ onLogout, userProfile, onClose }) => {
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Get user role from localStorage or userProfile
  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'employee';
  const isAdmin = userRole === 'admin';

  // Get profile route based on role
  const getProfileRoute = () => {
    return isAdmin ? '/admin/profile' : '/employee/profile';
  };

  // Get settings route based on role
  const getSettingsRoute = () => {
    return isAdmin ? '/admin/settings' : '/employee/settings';
  };

  // Format joining date if available
  const getJoiningInfo = () => {
    if (userProfile?.workInfo?.joiningDate) {
      const joinDate = new Date(userProfile.workInfo.joiningDate);
      const monthsEmployed = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24 * 30));
      return {
        date: joinDate.toLocaleDateString(),
        months: monthsEmployed
      };
    }
    return null;
  };

  const joiningInfo = getJoiningInfo();

  return (
    <div className="absolute right-0 mt-2 w-72 glass-morphism rounded-lg border border-secondary-600 shadow-lg z-50">
      {/* Profile Header */}
      <div className="p-4 border-b border-secondary-600">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {userProfile?.name || 
               (userProfile?.personalInfo && 
                `${userProfile.personalInfo.firstName} ${userProfile.personalInfo.lastName}`) ||
               localStorage.getItem('userName') || 
               'User'}
            </p>
            <p className="text-xs text-secondary-400 truncate">
              {userProfile?.email || 
               userProfile?.contactInfo?.personalEmail ||
               localStorage.getItem('userEmail') || 
               ''}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-neon-pink" />
                <span className="text-xs text-neon-pink capitalize">
                  {isAdmin ? 'Administrator' : 'Employee'}
                </span>
              </div>
              {userProfile?.employeeId && (
                <span className="text-xs text-secondary-500">
                  ID: {userProfile.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info for Employees */}
        {!isAdmin && userProfile && (
          <div className="mt-3 p-2 bg-secondary-800/30 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {userProfile.workInfo?.department && (
                <div>
                  <span className="text-secondary-500">Department:</span>
                  <p className="text-white font-medium">{userProfile.workInfo.department}</p>
                </div>
              )}
              {userProfile.workInfo?.position && (
                <div>
                  <span className="text-secondary-500">Position:</span>
                  <p className="text-white font-medium">{userProfile.workInfo.position}</p>
                </div>
              )}
              {joiningInfo && (
                <div className="col-span-2 flex items-center space-x-1 text-secondary-400">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {joiningInfo.date} ({joiningInfo.months} months)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="py-2">
        <Link
          to={getProfileRoute()}
          onClick={onClose}
          className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
        >
          <User className="w-4 h-4 mr-3" />
          Profile Settings
        </Link>
        
        {isAdmin && (
          <Link
            to="/admin/employee-management"
            onClick={onClose}
            className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
          >
            <User className="w-4 h-4 mr-3" />
            Manage Employees
          </Link>
        )}

        <Link
          to={getSettingsRoute()}
          onClick={onClose}
          className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Link>

        {!isAdmin && (
          <>
            <Link
              to="/employee/attendance"
              onClick={onClose}
              className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
            >
              <Clock className="w-4 h-4 mr-3" />
              My Attendance
            </Link>
            <Link
              to="/employee/leaves"
              onClick={onClose}
              className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
            >
              <Calendar className="w-4 h-4 mr-3" />
              My Leaves
            </Link>
          </>
        )}

        <hr className="my-2 border-secondary-600" />
        
        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;