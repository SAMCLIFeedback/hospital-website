import React from 'react';
import { Navigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';  

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('staff_token');
  
  // Use { replace: true } to prevent history stacking
  if (!token) return <Navigate to="/staff-verification" replace />;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      sessionStorage.removeItem('staff_token');
      return <Navigate to="/staff-verification" replace />;
    }
  } catch {
    sessionStorage.removeItem('staff_token');
    return <Navigate to="/staff-verification" replace />;
  }

  return children;
};

export default ProtectedRoute;