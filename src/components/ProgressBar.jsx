import styles from '@assets/css/internalFeedback.module.css';

const ProgressBar = ({formData}) => {
  const getProgressPercentage = () => {
    let completed = 0;
    const isRecognition = formData.feedbackNature === 'recognition';
    const isAnonymous = formData.isAnonymous;
    const total = isRecognition ? (isAnonymous ? 4 : 5) : (isAnonymous ? 5 : 6);

    if (formData.feedbackNature) completed++;
    if (formData.department && (formData.department !== 'custom' || formData.customDepartment)) completed++;
    if (!isRecognition && formData.impactSeverity) completed++;
    if (formData.description.length >= 50) completed++;
    if (formData.confirmTruthful && formData.consentData) completed++;
    if (!isAnonymous && formData.email) completed++;

    return (completed / total) * 100;
  };

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
      <div className={styles.textContainer}>
        <div className={styles.progressText}>
          {Math.round(getProgressPercentage())}% Complete
        </div>
      </div>
    </div>
  )
}

export default ProgressBar