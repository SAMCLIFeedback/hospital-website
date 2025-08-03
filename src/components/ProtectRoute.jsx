import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('staff_token');
  if (!token) return <Navigate to="/staff-verification" />;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      sessionStorage.removeItem('staff_token');
      return <Navigate to="/staff-verification" />;
    }
  } catch {
    sessionStorage.removeItem('staff_token');
    return <Navigate to="/staff-verification" />;
  }

  return children;
};

export default ProtectedRoute;
