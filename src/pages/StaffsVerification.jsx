import React, { useState, useEffect, useRef } from 'react';
import styles from '@assets/css/StaffsVerification.module.css';
import Loader from '@components/Loader.jsx';
import { useNavigate } from 'react-router-dom';
import StepEmailInput from '@components/StaffVerification/StepEmailInput';
import StepPinEntry from '@components/StaffVerification/StepPinEntry';
import PrivacyModal from '@components/StaffVerification/PrivacyModal';
import LockModal from '@components/StaffVerification/LockModal'; // ← NEW

const StaffsVerification = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showLoader, setShowLoader] = useState(false);

  // ←←← NEW: Lock States
  const [showLockModal, setShowLockModal] = useState(false);
  const [nextOpenDate, setNextOpenDate] = useState(null);

  const pinRefs = useRef([]);
  const emailInputContainerRef = useRef(null);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const isLastDay = today.getDate() === lastDayOfMonth.getDate();

    if (isLastDay) {
      setShowLockModal(false);
    } else {
      setNextOpenDate(lastDayOfMonth);
      setShowLockModal(true);
    }
  }, []);

  // Resend timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Email input focus styling
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

    try {
      const checkResponse = await fetch(`${BASE_URL}/api/check-staff-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail })
      });

      const checkData = await checkResponse.json();

      if (!checkData.success) {
        setError(checkData.message);
        return;
      }

      setIsLoading(true);
      const response = await fetch(`${BASE_URL}/api/send-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Error sending PIN');

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
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
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
    setShowLoader(true);
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
        setShowLoader(false);
        return;
      }

      sessionStorage.setItem('staff_token', data.token);
      navigate('/staff-feedback', { replace: true });
    } catch (err) {
      setError('Verification failed. Please try again.');
      setShowLoader(false);
    } finally {
      setIsLoading(false);
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

  // ←←← FINAL RENDER
  return (
    <>
      {/* MONTHLY LOCK MODAL */}
      {showLockModal && (
        <LockModal
          nextOpenDate={nextOpenDate}
          onUnlock={() => {
            sessionStorage.setItem('staff_bypass_unlocked', 'true');
            setShowLockModal(false);
          }}
        />
      )}

      {/* ORIGINAL PAGE — only visible when unlocked */}
      {!showLockModal && (
        <div className={styles.container}>
          {showLoader && <Loader />}
          <div className={styles.mainCard}>
            <div className={styles.card}>
              {step === 1 ? (
                <StepEmailInput
                  styles={styles}
                  setShowPrivacyModal={setShowPrivacyModal}
                  emailInputContainerRef={emailInputContainerRef}
                  emailPrefix={emailPrefix}
                  setEmailPrefix={setEmailPrefix}
                  handleEmailSubmit={handleEmailSubmit}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <StepPinEntry
                  styles={styles}
                  email={email}
                  pin={pin}
                  pinRefs={pinRefs}
                  handlePinChange={handlePinChange}
                  handlePinKeyDown={handlePinKeyDown}
                  handlePinSubmit={handlePinSubmit}
                  handleResendPin={handleResendPin}
                  setStep={setStep}
                  isLoading={isLoading}
                  resendTimer={resendTimer}
                  attemptCount={attemptCount}
                  error={error}
                />
              )}
            </div>

            <div className={styles.disclaimer}>
              <p className={styles.disclaimerText}>
                Your feedback cannot be traced back to you. QA and managers will only see anonymous responses.
              </p>
            </div>
          </div>

          {showPrivacyModal && (
            <PrivacyModal styles={styles} setShowPrivacyModal={setShowPrivacyModal} />
          )}
        </div>
      )}
    </>
  );
};

export default StaffsVerification;