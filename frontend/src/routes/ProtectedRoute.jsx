import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  // Check multiple possible token storage keys
  const token = sessionStorage.getItem('token') || 
                sessionStorage.getItem('authToken') || 
                localStorage.getItem('token');
  
  // Check multiple possible role storage keys
  const userRole = sessionStorage.getItem('userRole') || 
                   sessionStorage.getItem('role') || 
                   localStorage.getItem('userRole');

  console.log('ProtectedRoute Check:', {
    token: !!token,
    userRole: userRole,
    requiredRole: role,
    sessionStorage: {
      token: sessionStorage.getItem('token'),
      authToken: sessionStorage.getItem('authToken'),
      userRole: sessionStorage.getItem('userRole'),
      role: sessionStorage.getItem('role')
    }
  });

  // If no token, redirect to login
  if (!token) {
    console.log('ound, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If role is specified and doesn't match, redirect based on user's actual role
  if (role && userRole !== role) {
    console.log(`Role mismatch: required=${role}, user=${userRole}`);
    
    // Redirect to correct dashboard based on user's role
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    } else {
      // Unknown role, logout
      sessionStorage.clear();
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }
  }

  // All checks passed, render children
  return children;
};

export default ProtectedRoute;