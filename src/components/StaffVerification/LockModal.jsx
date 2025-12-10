// src/components/StaffVerification/LockModal.jsx
import React, { useState } from 'react';
import styles from '@assets/css/StaffsVerification.module.css';

const LockModal = ({ nextOpenDate, onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bypass-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassCode: code.trim() })
      });

      const data = await res.json();

      if (data.success) {
        onUnlock();
      } else {
        setError('Invalid bypass code');
      }
    } catch (err) {
      setError('Connection failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.lockOverlay}>
      <div className={styles.lockModal}>
        <div className={styles.lockIcon}>Locked</div>
        <h2>Feedback Submission Locked</h2>
        <p>Available only on the <strong>last day of every month</strong>.</p>
        
        <div className={styles.nextOpenBox}>
          Next open: <strong>{formatDate(nextOpenDate)}</strong>
        </div>

        <form onSubmit={handleSubmit} className={styles.bypassForm}>
          <label>Admin Bypass Code</label>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code to unlock"
            disabled={loading}
            autoFocus
          />
          {error && <p className={styles.errorText}>{error}</p>}
          <button type="submit" disabled={loading || !code.trim()}>
            {loading ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LockModal;