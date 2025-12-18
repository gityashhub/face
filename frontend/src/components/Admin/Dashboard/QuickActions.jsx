import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Award, Clock, Building2, DollarSign, FileText, UserCheck } from 'lucide-react';

const QuickActions = ({ userRole = 'admin' }) => {
  const navigate = useNavigate();

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
      icon: Award,
      label: 'Task Management',
      href: '/admin/tasks',
      color: 'neon-pink',
      description: 'Assign and track tasks'
    },
    {
      icon: Building2,
      label: 'Departments',
      href: '/admin/department',
      color: 'neon-purple',
      description: 'Manage company departments'
    },
    {
      icon: Clock,
      label: 'Attendance',
      href: '/admin/attendance',
      color: 'neon-pink',
      description: 'Monitor employee attendance'
    },
    {
      icon: DollarSign,
      label: 'Sales Dashboard',
      href: '/admin/sales',
      color: 'neon-pink',
      description: 'View sales performance'
    },
    {
      icon: FileText,
      label: 'Purchase Orders',
      href: '/admin/purchase-orders',
      color: 'neon-purple',
      description: 'Manage purchase orders'
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
      href: '/employee/leaves',
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
      icon: DollarSign,
      label: 'Sales',
      href: '/employee/sales',
      color: 'neon-purple',
      description: 'View your sales'
    }
  ];

  const actions = userRole === 'admin' ? adminActions : employeeActions;
  const visibleActions = actions.slice(0, userRole === 'admin' ? 8 : 4);

  const handleActionClick = (href) => {
    navigate(href);
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
            onClick={() => handleActionClick(action.href)}
            className="p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-neon-pink/50 hover:bg-neon-pink/5 transition-all duration-300 group relative overflow-hidden"
            title={action.description}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-pink/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <action.icon className="w-8 h-8 text-secondary-400 group-hover:text-neon-pink mx-auto mb-2 transition-all duration-300 group-hover:scale-110" />
              <p className="text-sm text-secondary-400 group-hover:text-white transition-colors duration-300 leading-tight">
                {action.label}
              </p>
            </div>

            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
              {action.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;