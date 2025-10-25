import { useState } from 'react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import styles from '@assets/css/Dashboard.module.css';
import Logo from '@assets/logo.png';

const Header = ({ userName, userRole, date, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoading(true);
    try {
      await onLogout();
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <div className={styles.logoContainer}>
            <img src={Logo} alt="Hospital Logo" className={styles.logoImage} />
          </div>
          <div className={styles.titleContainer}>
            <h1 className={styles.mainTitle}>Admin Dashboard</h1>
            <p className={styles.subTitle}>Patient & Staff Feedback Analysis</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <i className="fas fa-user-shield"></i>
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{userName || 'Guest'}</span>
              <span className={styles.userRole}>{userRole || 'Administrator'}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              className={`${styles.headerButton} ${styles.logoutButton}`}
              onClick={handleLogoutClick}
              disabled={isLoading}
              aria-label={isLoading ? 'Logging out' : 'Logout'}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Logging out...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-out-alt"></i> Logout
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.dateIndicator}>
        <i className="fas fa-calendar-alt"></i>
        <span>{date}</span>
      </div>
    </header>
  );
};

Header.propTypes = {
  userName: PropTypes.string,
  userRole: PropTypes.string,
  date: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Header;