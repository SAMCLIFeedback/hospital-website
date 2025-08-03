import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../assets/css/SuccessPage.module.css';

const SuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || 'patient'; // default to patient if undefined

  const redirectPath = from === 'staff' ? '/staff-feedback' : '/patient-feedback';

  return (
    <div className={styles.successContainer}>
      <div className={styles.successContent}>
        <div className={styles.checkmark}>✓</div>
        <h1 className={styles.successTitle}>Thank You!</h1>
        <p className={styles.successText}>
          Your feedback has been successfully submitted. We appreciate you helping us improve our services.
        </p>
        <div className={styles.buttonGroup}>
          <button
            className={styles.submitAnotherButton}
            onClick={() => navigate(redirectPath)}
          >
            Submit Another Feedback
          </button>
        </div>
        <p className={styles.note}>
          Want to return home instead? <a href="https://samclifeedback.github.io/hospital-website/" className={styles.homeLink}>Click here</a>
        </p>
      </div>
    </div>
  );
};

export default SuccessPage;
