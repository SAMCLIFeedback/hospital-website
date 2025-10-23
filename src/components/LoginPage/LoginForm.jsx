import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import FormField from './FormField';
import Button from './LoginButton';
import Loader from '../Loader';
import styles from '@assets/css/LoginForm.module.css';

// Simple UUID generator for session IDs
const generateSessionId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const LoginForm = ({
  apiEndpoint,
  navigateTo,
  brandLogo,
  title,
  subtitle,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const sessionId = generateSessionId();
      const storageKey = apiEndpoint.includes('qa-login')
        ? `qa_user_session_${sessionId}`
        : `dept_user_session_${sessionId}`;
      const sessionIdKey = apiEndpoint.includes('qa-login')
        ? 'current_qa_session'
        : 'current_dept_session';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data || !data.username) {
        throw new Error(data.message || 'Invalid username or password.');
      }

      localStorage.setItem(storageKey, JSON.stringify({ ...data, sessionId }));
      sessionStorage.setItem(sessionIdKey, sessionId);
      setTimeout(() => {
        setIsLoading(false);
        navigate(navigateTo);
      }, 2000);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className={styles.loginPage}>
      {isLoading && <Loader />}
      <div className={styles.loginContainer}>
        <div className={styles.brandingSection}>
          <div className={styles.logoContainer}>
            {brandLogo && <img src={brandLogo} alt="Brand Logo" className={styles.brandLogo} />}
          </div>
          <h1 className={styles.brandingTitle}>Better Care Starts Here</h1>
          <p className={styles.brandingSubtitle}>Monitor and improve quality of care.</p>
        </div>
        <div className={styles.formSection}>
          <form className={styles.loginForm} onSubmit={handleLogin}>
            <header className={styles.header}>
              <h2 className={styles.title}>{title}</h2>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </header>

            {error && (
              <div
                className={styles.errorText}
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <FormField
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />

            <FormField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

LoginForm.propTypes = {
  apiEndpoint: PropTypes.string.isRequired,
  navigateTo: PropTypes.string.isRequired,
  brandLogo: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

LoginForm.defaultProps = {
  brandLogo: '',
  subtitle: '',
};

export default LoginForm;