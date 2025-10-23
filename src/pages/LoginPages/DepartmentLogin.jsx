import LoginForm from '@components/LoginPage/LoginForm';
import styles from '@assets/css/DepartmentLogin.module.css';
import Logo from '@assets/logo.png';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DepartmentLogin = () => (
  <LoginForm
    apiEndpoint={`${BASE_URL}/api/login`}
    navigateTo="/deptHead-Dashboard"
    brandLogo={Logo}
    title="Department Head"
    subtitle="Welcome back! Please sign in to your account"
    styles={styles}
  />
);

export default DepartmentLogin;