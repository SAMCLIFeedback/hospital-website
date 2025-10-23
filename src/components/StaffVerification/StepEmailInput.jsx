import PrivacyBox from './PrivacyBox'

const StepEmailInput = ({styles, setShowPrivacyModal, emailInputContainerRef, emailPrefix, setEmailPrefix, handleEmailSubmit, isLoading, error}) => {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className={styles.iconContainer}>
          ✉️
        </div>
        <h2 className={styles.title}>Staff Verification</h2>
        <p className={styles.subtitle}>
          To ensure you're a hospital staff member, we'll send a one-time PIN to your hospital email address.
          Your identity will remain confidential.
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Enter your hospital email address
          </label>
          <div
            ref={emailInputContainerRef}
            className={styles.emailInputContainer}
          >
            <input
              type="text"
              value={emailPrefix}
              onChange={(e) => setEmailPrefix(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit(e)}
              className={styles.emailInput}
              placeholder="your.name"
            />
            <div className={styles.emailSuffix}>
              @gmail.com
            </div>
          </div>
          {error && (
            <p className={styles.error}>
              ⚠️ {error}
            </p>
          )}
        </div>

        <button
          onClick={handleEmailSubmit}
          disabled={isLoading || !emailPrefix}
          className={`${styles.button} ${isLoading || !emailPrefix ? styles.buttonDisabled : ''}`}
        >
          {isLoading ? (
            <>
              <div className={styles.spinner}></div>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>📧</span>
              <span>Send Verification PIN</span>
            </>
          )}
        </button>
      </div>

      <PrivacyBox styles={styles} setShowPrivacyModal={setShowPrivacyModal}/>
    </div>
  )
}

export default StepEmailInput