import React from 'react'

const FeedbackType = ({styles, feedbackTypes,formData, handleInputChange}) => {
  return (
    <section className={`${styles.section} ${styles.fadeInUp}`}>
      <div className={styles.sectionHeader}>
        <label htmlFor="feedbackType" className={styles.sectionLabel}>
          <span className={styles.stepNumber}>2</span> What type of feedback do you have?
          <span className={styles.required}>*</span>
        </label>
        <p className={styles.sectionDescription}>Select the category that best describes your concern or suggestion.</p>
      </div>
      <div className={styles.radioGrid}>
        {feedbackTypes.map((type) => (
          <label key={type.value} className={styles.radioCard}>
            <input
              type="radio"
              name="feedbackType"
              value={type.value}
              checked={formData.feedbackType === type.value}
              onChange={(e) => handleInputChange('feedbackType', e.target.value)}
              className={styles.radioInput}
              required
            />
            <div className={styles.radioCardContent}>
              <span className={styles.radioCardIcon} style={{ color: type.color }}>{type.icon}</span>
              <div className={styles.radioCardText}>
                <span className={styles.radioCardTitle}>{type.label}</span>
                <br />
                <small className={styles.radioCardDesc}>{type.description}</small>
              </div>
              <span className={styles.radioCardCheck}>✓</span>
            </div>
          </label>
        ))}
      </div>
      {formData.feedbackType === 'other' && (
        <div className={styles.conditionalField}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Please specify:</label>
            <input
              type="text"
              maxLength="40"
              value={formData.otherSpecify}
              onChange={(e) => handleInputChange('otherSpecify', e.target.value)}
              className={styles.textInput}
              placeholder="Briefly describe the nature of your feedback..."
              required
              aria-required="true"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default FeedbackType