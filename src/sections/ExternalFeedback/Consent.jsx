import ReCAPTCHA from 'react-google-recaptcha';

const Consent = ({styles, formData, handleInputChange, }) => {
  return (
    <section className={`${styles.section} ${styles.fadeInUp}`}>
      <div className={styles.sectionHeader}>
        <label htmlFor="consent" className={styles.sectionLabel}>
          <span className={styles.stepNumber}>7</span> Consent
          <span className={styles.required}>*</span>
        </label>
        <p className={styles.sectionDescription}>Please confirm your agreement.</p>
      </div>
      <div className={styles.confirmationGroup}>
          <label className={styles.confirmationItem}>
              <input
              type="checkbox"
              id="consent"
              className={styles.checkbox}
              checked={formData.consentAgreed}
              onChange={(e) => handleInputChange('consentAgreed', e.target.checked)}
              required
              />
              <span className={styles.checkboxCustom} />
              <div className={styles.confirmationText}>
              <strong>I agree to have my feedback used to improve hospital services.</strong>
              <span className={styles.required}>*</span>
                <div className={styles.confirmationLinks}>
                  <a href="#privacy" className={styles.link}>Privacy Policy</a>
              </div>
              </div>
        </label>
        <ReCAPTCHA
          sitekey="6LfMCpkrAAAAAEj2FgwNmdZdC8B9y1M-iFzwj2xT"
          onChange={(token) => handleInputChange('reCaptchaToken', token)}
        />
      </div>
    </section>
  )
}

export default Consent