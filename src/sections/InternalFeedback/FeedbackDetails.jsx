const FeedbackDetails = ({styles, formData, handleInputChange, departments}) => {
  const isPotentialName = (text) => {
    const departmentNames = Object.values(departments).flat().map(d => d.toLowerCase());
    const words = text.split(/\s+/);
    return words.some(word => 
      /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(word) && 
      !departmentNames.includes(word.toLowerCase())
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionLabel}>
          <span className={styles.stepNumber}>{formData.feedbackNature === 'recognition' ? 3 : 4}</span>
          Tell us more details
          <span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionDescription}>
          Provide specific information to help us understand and address your feedback.
        </p>
      </div>

      <div className={styles.textareaContainer}>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Please include:
• Specific location or equipment (if applicable)
• When this occurred or was noticed
• What you observed or experienced
• Any suggestions for improvement

Example: 'The hand sanitizer dispenser near Room 205 has been empty for 3 days.'"
          className={styles.textarea}
          minLength="50"
          maxLength="1200"
          required
          aria-required="true"
        />

        <div className={styles.textareaFooter}>
          <div className={styles.charCount}>
            <span className={formData.description.length >= 50 ? styles.charCountGood : styles.charCountWarning}>
              {formData.description.length}
            </span>
            <span className={styles.charCountTotal}>/1200 characters</span>
            {formData.description.length < 50 && (
              <span className={styles.minWarning}>
                {50 - formData.description.length} more needed
              </span>
            )}
          </div>
        </div>

        {isPotentialName(formData.description) && (
          <div className={styles.warning}>
            <span className={styles.warningIcon}>⚠️</span>
            <span>Use initials or roles instead of full names to protect privacy.</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default FeedbackDetails