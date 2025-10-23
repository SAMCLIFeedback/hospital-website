import styles from '@assets/css/LoginButton.module.css';

const LoginButton = ({ children, type, onClick, disabled }) => (
  <button
    type={type}
    className={styles.loginButton}
    onClick={onClick}
    disabled={disabled}
  >
    <span className={styles.buttonContent}>{children}</span>
    <div className={styles.buttonRipple}></div>
  </button>
);

export default LoginButton;