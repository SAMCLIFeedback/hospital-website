import React from 'react'

const StepPinEntry = ({
  styles,
  email,
  pin,
  pinRefs,
  handlePinChange,
  handlePinKeyDown,
  handlePinSubmit,
  handleResendPin,
  setStep,
  isLoading,
  resendTimer,
  attemptCount,
  error,
}) => {
  return (
    <div className={styles.fadeIn}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className={`${styles.iconContainer} ${styles.iconContainerGreen}`}>
          🛡️
        </div>
        <h2 className={styles.title}>Enter Verification Code</h2>
        <p className={styles.subtitle}>
          We've sent a 6-digit code to <span className={styles.subtitleHighlight}>{email}</span>.
          Enter it below to continue.
        </p>
        <p className={styles.helpText}>
          (Check your spam folder if you don't see it.)
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div className={styles.formGroup}>
          <label className={`${styles.label} ${styles.labelCentered}`}>
            Enter your verification code
          </label>
          <div className={styles.pinContainer}>
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => pinRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(index, e)}
                className={styles.pinInput}
              />
            ))}
          </div>
          {error && (
            <p className={`${styles.error} ${styles.errorCentered}`}>
              ⚠️ {error}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={handlePinSubmit}
            disabled={isLoading || pin.join('').length !== 6}
            className={`${styles.button} ${isLoading || pin.join('').length !== 6 ? styles.buttonDisabled : ''}`}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>✅</span>
                <span>Verify and Proceed</span>
              </>
            )}
          </button>

          <button
            onClick={() => setStep(1)}
            className={styles.secondaryButton}
          >
            <span>←</span>
            <span>Use a different email</span>
          </button>
        </div>
      </div>

      {/* Resend Code */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        {resendTimer > 0 ? (
          <p className={styles.timerText}>
            <span>🕐</span>
            <span>Request a new code in {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}</span>
          </p>
        ) : (
          <button
            onClick={handleResendPin}
            disabled={isLoading}
            className={styles.privacyLink} // Reusing privacyLink style as it matches for now
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            Resend code
          </button>
        )}
      </div>

      {/* Attempt Warning */}
      {attemptCount > 0 && (
        <div className={styles.timerBox}>
          <p className={styles.timerText}>
            {3 - attemptCount} attempt{3 - attemptCount !== 1 ? 's' : ''} remaining
          </p>
        </div>
      )}
    </div>
  )
}

export default StepPinEntry