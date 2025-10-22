const SubmissionPreference = ({styles, formData, handleInputChange}) => {
  return (
    <section className={`${styles.section} ${styles.fadeInUp}`}>
      <div className={styles.sectionHeader}>
        <label className={styles.sectionLabel}>
          <span className={styles.stepNumber}>6</span> How would you like to submit this?
          <span className={styles.required}>*</span>
        </label>
        <p className={styles.sectionDescription}>
          Choose whether to submit anonymously or allow follow-up.
        </p>
      </div>
      <div className={styles.radioGrid}>
        <label className={styles.radioCard}>
          <input
            type="radio"
            name="isAnonymous"
            value="true"
            checked={formData.isAnonymous === true}
            onChange={() => handleInputChange('isAnonymous', true)}
            className={styles.radioInput}
          />
          <div className={styles.radioCardContent}>
            <span className={styles.radioCardIcon}>👻</span>
            <div className={styles.radioCardText}>
              <span className={styles.radioCardTitle}>Submit Anonymously</span>
              <br />
              <small className={styles.radioCardDesc}>No identifying information stored</small>
            </div>
            <span className={styles.radioCardCheck}>✓</span>
          </div>
        </label>
        <label className={styles.radioCard}>
          <input
            type="radio"
            name="isAnonymous"
            value="false"
            checked={formData.isAnonymous === false}
            onChange={() => handleInputChange('isAnonymous', false)}
            className={styles.radioInput}
          />
          <div className={styles.radioCardContent}>
            <span className={styles.radioCardIcon}>👤</span>
            <div className={styles.radioCardText}>
              <span className={styles.radioCardTitle}>Provide Contact Info</span>
              <br />
              <small className={styles.radioCardDesc}>We may contact you for follow-up.</small>
            </div>
            <span className={styles.radioCardCheck}>✓</span>
          </div>
        </label>
      </div>
      {!formData.isAnonymous && (
        <div className={`${styles.conditionalField} ${formData.isAnonymous ? '' : styles.visible}`}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.inputLabel}>Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.textInput}
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
            <label htmlFor="phone" className={styles.inputLabel}>Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className={styles.textInput}
              placeholder="Phone (optional, SMS updates)"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default SubmissionPreference