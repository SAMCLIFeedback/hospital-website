const FeedbackType = ({styles, formData, feedbackOptions, handleInputChange}) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionLabel}>
          <span className={styles.stepNumber}>1</span>
          What type of feedback do you have?
          <span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionDescription}>
          Select the category that best describes your concern or suggestion.
        </p>
      </div>

      <div className={styles.radioGrid}>
        {feedbackOptions.map(option => (
          <label key={option.value} className={`${styles.radioCard} ${styles[option.value]}`}>
            <input
              type="radio"
              name="feedbackNature"
              value={option.value}
              checked={formData.feedbackNature === option.value}
              onChange={(e) => {
                handleInputChange('feedbackNature', e.target.value);
                if (e.target.value === 'recognition') {
                  handleInputChange('impactSeverity', '');
                }
              }}
              className={styles.radioInput}
              required
              aria-label={option.label}
            />
            <div className={styles.radioCardContent}>
              <div className={styles.radioCardIcon} style={{ color: option.color }}>
                {option.icon}
              </div>
              <div className={styles.radioCardText}>
                <div className={styles.radioCardTitle}>{option.label}</div>
                {option.desc && <div className={styles.radioCardDesc}>{option.desc}</div>}
              </div>
              <div className={styles.radioCardCheck}>✓</div>
            </div>
          </label>
        ))}
      </div>

      {formData.feedbackNature && formData.feedbackNature !== 'recognition' && (
        <div className={styles.conditionalField}>
          <label className={styles.urgentCheckbox}>
            <input
              type="checkbox"
              checked={formData.immediateAttention}
              onChange={(e) => handleInputChange('immediateAttention', e.target.checked)}
              className={styles.checkbox}
              aria-label="Requires immediate attention"
            />
            <span className={styles.checkboxCustom} />
            <div className={styles.urgentContent}>
              <span className={styles.urgentIcon}>🚨</span>
              <span className={styles.urgentText}>This requires immediate attention</span>
            </div>
          </label>
        </div>
      )}

      {formData.feedbackNature === 'other' && (
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