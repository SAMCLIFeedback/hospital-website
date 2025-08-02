import React from 'react';
import LoginForm from '../components/LoginForm';
import styles from '../assets/css/QALogin.module.css';
import Logo from '../assets/logo.png';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AdminLogin = () => (
  <LoginForm
    apiEndpoint={`${BASE_URL}/api/admin-login`}
    navigateTo="/adminDashboard"
    brandLogo={Logo} 
    title="Admin"
    subtitle="Welcome, Admin! Sign in to access your dashboard"
    styles={styles}
  />
);

export default AdminLogin;