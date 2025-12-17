import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isModulePathAllowed, normalizeDepartment } from '../utils/departmentAccess';

const ProtectedRoute = ({ children, role, requiredRole }) => {
  const location = useLocation();
  const effectiveRole = role || requiredRole;
  
  const token = localStorage.getItem('token') || 
                sessionStorage.getItem('token') || 
                sessionStorage.getItem('authToken');
  
  const userRole = localStorage.getItem('userRole') || 
                   sessionStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'employee') {
    const storedDept =
      localStorage.getItem('userDepartment') ||
      sessionStorage.getItem('userDepartment');

    let department = storedDept;
    if (!department) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        department = storedUser?.department?.name || storedUser?.department;
      } catch (err) {
        department = '';
      }
    }

    const normalizedDept = normalizeDepartment(department);
    if (!isModulePathAllowed(location.pathname, normalizedDept)) {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  if (effectiveRole && userRole !== effectiveRole) {
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    } else {
      localStorage.clear();
      sessionStorage.clear();
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;