const Consent = ({styles, formData, handleInputChange}) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionLabel}>
          <span className={styles.stepNumber}>{formData.feedbackNature === 'recognition' ? 5 : 6}</span>
          Consent
          <span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionDescription}>
          Please confirm your agreement.
        </p>
      </div>

      <div className={styles.confirmationGroup}>
        <label className={styles.confirmationItem}>
          <input
            type="checkbox"
            checked={formData.confirmTruthful}
            onChange={(e) => handleInputChange('confirmTruthful', e.target.checked)}
            className={styles.checkbox}
            aria-label="Confirm truthful feedback"
          />
          <span className={styles.checkboxCustom} />
          <div className={styles.confirmationText}>
            <strong>I confirm this is truthful, work-related feedback</strong>
            <span className={styles.required}>*</span>
          </div>
        </label>

        <label className={styles.confirmationItem}>
          <input
            type="checkbox"
            checked={formData.consentData}
            onChange={(e) => handleInputChange('consentData', e.target.checked)}
            className={styles.checkbox}
            aria-label="Consent to data use"
          />
          <span className={styles.checkboxCustom} />
          <div className={styles.confirmationText}>
            <strong>I consent to the use of my data for quality improvement.</strong>
            <span className={styles.required}>*</span>
            <div className={styles.confirmationLinks}>
              <a href="#" className={styles.link}>Privacy Policy</a> •
              <a href="#" className={styles.link}>Staff Handbook Section 4.5</a>
            </div>
          </div>
        </label>
      </div>
    </section>
  )
}

export default Consent