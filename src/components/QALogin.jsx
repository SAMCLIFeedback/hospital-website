import React from 'react';
import LoginForm from '../components/LoginForm';
import styles from '../assets/css/QALogin.module.css';
import Logo from '../assets/logo.png';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const QALogin = () => (
  <LoginForm
    apiEndpoint={`${BASE_URL}/api/qa-login`}
    navigateTo="/QA-dashboard"
    brandLogo={Logo}
    title="QA Admin"
    subtitle="Welcome, QA Admin! Sign in to access your dashboard"
    styles={styles}
  />
);

export default QALogin;