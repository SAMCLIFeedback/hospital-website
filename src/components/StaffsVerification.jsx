import React, { useState, useEffect, useRef } from 'react';
import styles from '../assets/css/StaffsVerification.module.css'; // Import the CSS module
import verifiedEmails from '../data/verified-emails.json'; // Import the verified emails
import Loader from './Loader.jsx';
import { useNavigate } from 'react-router-dom';

const StaffsVerification = () => {
  const [step, setStep] = useState(1); // 1: Email input, 2: PIN entry
  const [email, setEmail] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const pinRefs = useRef([]);
  const emailInputContainerRef = useRef(null); // Ref for email input container
  const navigate = useNavigate();
  const [showLoader, setShowLoader] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Timer countdown for resend
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle focus for email input container
  useEffect(() => {
    const handleFocusIn = () => {
      emailInputContainerRef.current?.classList.add(styles.focusWithin);
    };
    const handleFocusOut = () => {
      emailInputContainerRef.current?.classList.remove(styles.focusWithin);
    };

    const container = emailInputContainerRef.current;
    if (container) {
      container.addEventListener('focusin', handleFocusIn);
      container.addEventListener('focusout', handleFocusOut);
    }

    return () => {
      if (container) {
        container.removeEventListener('focusin', handleFocusIn);
        container.removeEventListener('focusout', handleFocusOut);
      }
    };
  }, []);

  const validateEmail = (emailPrefix) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+$/;
    return emailRegex.test(emailPrefix) && emailPrefix.length > 0;
  };

const handleEmailSubmit = async (e) => {
  e.preventDefault();
  setError('');
  const enteredPrefix = emailPrefix.trim();

  if (!validateEmail(enteredPrefix)) {
    setError('Please enter a valid email address.');
    return;
  }

  const fullEmail = `${enteredPrefix.toLowerCase()}@gmail.com`;
  const isVerified = verifiedEmails.includes(fullEmail);

  if (!isVerified) {
    setError('This email is not authorized for verification.');
    return;
  }

  setIsLoading(true);

  try {
    const response = await fetch(`${BASE_URL}/api/send-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fullEmail })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Error sending PIN');
    }

    setEmail(fullEmail);
    setStep(2);
    setResendTimer(60);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

  const handlePinChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

const handlePinSubmit = async (e) => {
  e.preventDefault();
  const pinCode = pin.join('');

  if (pinCode.length !== 6) {
    setError('Please enter the complete 6-digit code.');
    return;
  }

  setIsLoading(true);
  setShowLoader(true); // Show loader at the beginning of the async operation
  setAttemptCount(prev => prev + 1);
 
  try {
    const response = await fetch(`${BASE_URL}/api/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin: pinCode })
    });

    const data = await response.json();

    if (!data.success) {
      if (attemptCount >= 2) {
        setError('Too many incorrect attempts. Please request a new code.');
        setAttemptCount(0);
      } else {
        setError('Code is incorrect. Try again.');
      }
      setPin(['', '', '', '', '', '']);
      pinRefs.current[0]?.focus();
      setShowLoader(false); // Hide loader on verification failure
      return;
    }

    sessionStorage.setItem('staff_token', data.token);
    navigate('/staff-feedback');

  } catch (err) {
    setError('Verification failed. Please try again.');
    setShowLoader(false); // Hide loader on any verification error
  } finally {
    setIsLoading(false); // Always set isLoading to false
  }
};


const handleResendPin = async () => {
  if (resendTimer > 0) return;

  setIsLoading(true);
  setError('');

  try {
    const response = await fetch(`${BASE_URL}/api/send-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    setResendTimer(60);
    setAttemptCount(0);
    setPin(['', '', '', '', '', '']);
  } catch (err) {
    setError('Failed to resend code. Please try again.');
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className={styles.container}>
      {showLoader && <Loader />}
      {/* Main Content */}
      <div className={styles.mainCard}>
        <div className={styles.card}>
          {step === 1 ? (
            // Step 1: Email Input
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

              {/* Privacy Assurance */}
              <div className={styles.privacyBox}>
                <div className={styles.privacyBoxContent}>
                  <span className={styles.privacyBoxIcon}>✅</span>
                  <div>
                    <p className={styles.privacyTitle}>Privacy Protected</p>
                    <p className={styles.privacyText}>
                      Your email will only be used to verify your employment. It will not be stored or shared with anyone, including QA or management.
                    </p>
                    <button
                      onClick={() => setShowPrivacyModal(true)}
                      className={styles.privacyLink}
                    >
                      How we protect your privacy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Step 2: PIN Entry
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
          )}
        </div>

        {/* Anonymous Disclaimer */}
        <div className={styles.disclaimer}>
          <p className={styles.disclaimerText}>
            🔒 Your feedback cannot be traced back to you. QA and managers will only see anonymous responses.
          </p>
        </div>
      </div>

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>How We Protect Your Privacy</h3>
            <ul className={styles.modalList}>
              <li className={styles.modalListItem}>• Email used only for verification, never stored</li>
              <li className={styles.modalListItem}>• All metadata stripped from submissions</li>
              <li className={styles.modalListItem}>• Responses aggregated and anonymized</li>
              <li className={styles.modalListItem}>• No IP tracking or user fingerprinting</li>
              <li className={styles.modalListItem}>• Data encrypted in transit and at rest</li>
            </ul>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className={styles.button}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffsVerification;