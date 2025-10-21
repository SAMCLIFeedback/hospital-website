import styles from '@assets/css/StepTracker.module.css';

const StepTracker = ({ completedSteps, totalSteps }) => {
  return (
    <div className={styles.stepWrapper}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = completedSteps.includes(stepNumber);

        return (
          <div key={stepNumber} className={styles.stepItem}>
            <div
              className={`${styles.circle} ${isCompleted ? styles.completed : ''}`}
            >
              {isCompleted ? '✓' : stepNumber}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StepTracker;