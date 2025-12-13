import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role, requiredRole }) => {
  const effectiveRole = role || requiredRole;
  
  const token = localStorage.getItem('token') || 
                sessionStorage.getItem('token') || 
                sessionStorage.getItem('authToken');
  
  const userRole = localStorage.getItem('userRole') || 
                   sessionStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
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