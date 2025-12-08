import styles from '@assets/css/SuccessPage.module.css';

const SuccessPage = () => {
  return (
    <div className={styles.successContainer}>
      <div className={styles.successContent}>
        <div className={styles.checkmark}>✓</div>
        <h1 className={styles.successTitle}>Thank You!</h1>
        <p className={styles.successText}>
          Your feedback has been successfully submitted. We appreciate you helping us improve our services.
        </p>
      </div>
    </div>
  );
};

export default SuccessPage;