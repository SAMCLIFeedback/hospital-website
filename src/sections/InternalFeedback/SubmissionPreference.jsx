const SubmissionPreference = ({styles, formData, handleInputChange, }) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionLabel}>
          <span className={styles.stepNumber}>{formData.feedbackNature === 'recognition' ? 4 : 5}</span>
          How would you like to submit this?
          <span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionDescription}>
          Choose whether to submit anonymously or allow follow-up.
        </p>
      </div>

      <div className={styles.anonymityOptions}>
        <label className={styles.anonymityCard}>
          <input
            type="radio"
            name="anonymity"
            checked={formData.isAnonymous}
            onChange={() => handleInputChange('isAnonymous', true)}
            className={styles.radioInput}
            aria-label="Submit anonymously"
          />
          <div className={styles.anonymityCardContent}>
            <div className={styles.anonymityIcon}>👻</div>
            <div className={styles.anonymityText}>
              <div className={styles.anonymityTitle}>Submit Anonymously</div>
              <div className={styles.anonymityDesc}>
                No identifying information stored
              </div>
            </div>
          </div>
        </label>

        <label className={styles.anonymityCard}>
          <input
            type="radio"
            name="anonymity"
            checked={!formData.isAnonymous}
            onChange={() => handleInputChange('isAnonymous', false)}
            className={styles.radioInput}
            aria-label="Allow follow-up"
          />
          <div className={styles.anonymityCardContent}>
            <div className={styles.anonymityIcon}>👤</div>
            <div className={styles.anonymityText}>
              <div className={styles.anonymityTitle}>Provide Contact Info</div>
              <div className={styles.anonymityDesc}>
                We may contact you for follow-up.
              </div>
            </div>
          </div>
        </label>
      </div>

      {!formData.isAnonymous && (
        <div className={styles.conditionalField}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Hospital Email Address:</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="yourname@hospital.org"
              className={styles.textInput}
              required
              aria-required="true"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default SubmissionPreference