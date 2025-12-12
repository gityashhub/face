// components/Dashboard/QuickActions.js
import React from 'react';
import { Users, Calendar, TrendingUp, Award, Settings, FileText, Clock, Building2 } from 'lucide-react';

const QuickActions = ({ userRole = 'admin' }) => {
  const adminActions = [
    {
      icon: Users,
      label: 'Manage Employees',
      href: '/admin/employees',
      color: 'neon-pink',
      description: 'Add, edit, or remove employees'
    },
    {
      icon: Calendar,
      label: 'Leave Management',
      href: '/admin/leaves',
      color: 'neon-purple',
      description: 'Review and approve leave requests'
    },
    {
      icon: TrendingUp,
      label: 'View Reports',
      href: '/admin/reports',
      color: 'neon-pink',
      description: 'Analyze performance and attendance'
    },
    {
      icon: Award,
      label: 'Task Management',
      href: '/admin/tasks',
      color: 'neon-purple',
      description: 'Assign and track tasks'
    },
    {
      icon: Building2,
      label: 'Departments',
      href: '/admin/department',
      color: 'neon-pink',
      description: 'Manage company departments'
    },
    {
      icon: Settings,
      label: 'System Settings',
      href: '/admin/settings',
      color: 'neon-purple',
      description: 'Configure system preferences'
    },
    {
      icon: Clock,
      label: 'Attendance',
      href: '/admin/attendance',
      color: 'neon-pink',
      description: 'Monitor employee attendance'
    },
    {
      icon: FileText,
      label: 'Documents',
      href: '/admin/documents',
      color: 'neon-purple',
      description: 'Manage company documents'
    }
  ];

  const employeeActions = [
    {
      icon: Clock,
      label: 'Check In/Out',
      href: '/employee/attendance',
      color: 'neon-pink',
      description: 'Mark your attendance'
    },
    {
      icon: Calendar,
      label: 'Apply for Leave',
      href: '/employee/leave',
      color: 'neon-purple',
      description: 'Submit leave applications'
    },
    {
      icon: Award,
      label: 'My Tasks',
      href: '/employee/tasks',
      color: 'neon-pink',
      description: 'View assigned tasks'
    },
    {
      icon: TrendingUp,
      label: 'My Reports',
      href: '/employee/reports',
      color: 'neon-purple',
      description: 'View your performance'
    }
  ];

  const actions = userRole === 'admin' ? adminActions : employeeActions;
  const visibleActions = actions.slice(0, userRole === 'admin' ? 8 : 4);

  const handleActionClick = (href, event) => {
    event.preventDefault();
    // You can add custom navigation logic here
    window.location.href = href;
  };

  return (
    <div className="glass-morphism neon-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
        {userRole === 'admin' && (
          <span className="text-xs px-2 py-1 bg-neon-pink/20 text-neon-pink rounded-full">
            Admin Panel
          </span>
        )}
      </div>
      
      <div className={`grid gap-4 ${
        userRole === 'admin' 
          ? 'grid-cols-2 md:grid-cols-4' 
          : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {visibleActions.map((action, index) => (
          <button
            key={index}
            onClick={(e) => handleActionClick(action.href, e)}
            className={`p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-${action.color}/50 hover:bg-${action.color}/5 transition-all duration-300 group relative overflow-hidden`}
            title={action.description}
          >
            {/* Background glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-r from-${action.color}/0 via-${action.color}/5 to-${action.color}/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            
            {/* Content */}
            <div className="relative z-10">
              <action.icon className={`w-8 h-8 text-secondary-400 group-hover:text-${action.color} mx-auto mb-2 transition-all duration-300 group-hover:scale-110`} />
              <p className="text-sm text-secondary-400 group-hover:text-white transition-colors duration-300 leading-tight">
                {action.label}
              </p>
            </div>

            {/* Hover tooltip */}
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20`}>
              {action.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </button>
        ))}
      </div>

      {userRole === 'admin' && actions.length > 8 && (
        <div className="mt-6 text-center">
          <button className="text-neon-purple hover:text-white transition-colors duration-300 text-sm font-medium">
            View More Actions →
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickActions;