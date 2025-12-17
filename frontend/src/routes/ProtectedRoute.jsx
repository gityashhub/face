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

  // Check role first before department-based access
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

  // Department-based access control for employees
  if (userRole === 'employee') {
    // Get department from multiple sources
    let department = localStorage.getItem('userDepartment') || 
                     sessionStorage.getItem('userDepartment');

    // Fallback to user object if direct storage is empty
    if (!department) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        department = storedUser?.department?.name || storedUser?.department;
      } catch (err) {
        department = '';
      }
    }

    // Only restrict access if we have a valid department AND the path is not allowed
    // If department is missing or invalid, allow access (let the page handle it)
    if (department && department !== 'N/A' && department !== '') {
      const normalizedDept = normalizeDepartment(department);
      if (!isModulePathAllowed(location.pathname, normalizedDept)) {
        return <Navigate to="/employee/dashboard" replace />;
      }
    }
    // If no department is set yet, allow navigation (prevents premature redirects)
    // The actual page can handle unauthorized access if needed
  }

  return children;
};

export default ProtectedRoute;