import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { User, LogOut, Shield, Clock } from "lucide-react";

const ProfileDropdown = ({ onLogout, userProfile, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'employee';
  const isAdmin = userRole === 'admin';

  const formatName = () => {
    if (userProfile?.name) return userProfile.name;
    if (userProfile?.personalInfo) {
      const { firstName, lastName } = userProfile.personalInfo;
      if (firstName && lastName) return `${firstName} ${lastName}`;
    }
    return localStorage.getItem('userName') || 'User';
  };

  const formatEmail = () => {
    return userProfile?.email || 
           userProfile?.contactInfo?.personalEmail ||
           localStorage.getItem('userEmail') || 
           '';
  };

  return (
    <div className="absolute right-0 mt-2 w-72 bg-secondary-800 rounded-lg border border-secondary-600 shadow-xl z-50">
      <div className="p-4 border-b border-secondary-600">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {formatName()}
            </p>
            <p className="text-xs text-secondary-400 truncate">
              {formatEmail()}
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
      </div>

      <div className="py-2">
        <Link
          to={isAdmin ? '/admin/profile' : '/employee/profile'}
          onClick={onClose}
          className="flex items-center px-4 py-2.5 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
        >
          <User className="w-4 h-4 mr-3" />
          {isAdmin ? 'Profile Settings' : 'Profile Information'}
        </Link>

        {isAdmin && (
          <Link
            to="/admin/employees"
            onClick={onClose}
            className="flex items-center px-4 py-2.5 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
          >
            <User className="w-4 h-4 mr-3" />
            Manage Employees
          </Link>
        )}

        {!isAdmin && (
          <Link
            to="/employee/attendance"
            onClick={onClose}
            className="flex items-center px-4 py-2.5 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50 transition-colors"
          >
            <Clock className="w-4 h-4 mr-3" />
            My Attendance
          </Link>
        )}

        <hr className="my-2 border-secondary-600" />

        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;