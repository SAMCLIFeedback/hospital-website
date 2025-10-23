import { useState } from 'react';
import Loader from '../Loader';
import Logo from '@assets/logo.png';
import PropTypes from 'prop-types';

const Header = ({ userName, userRole, date, onLogout, styles}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await onLogout();
  };

  return (
    <>
      {isLoggingOut && <Loader />}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logoContainer}>
              <img src={Logo} alt="Hospital Logo" className={styles.logoImage} />
            </div>
            <div className={styles.titleContainer}>
              <h1 className={styles.mainTitle}>Quality Assurance Dashboard</h1>
              <p className={styles.subTitle}>Patient & Staff Feedback Analysis</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                <i className="fas fa-user-shield"></i>
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userRole}>{userRole}</span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={`${styles.headerButton} ${styles.logoutButton}`}
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Logging Out
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
    </>
  );
};

Header.propTypes = {
  userName: PropTypes.string.isRequired,
  userRole: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Header;