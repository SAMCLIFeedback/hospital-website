import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AuditTrailModal = ({ styles, feedback, onClose, prepareRawFeedbackForDisplay }) => {
  const [latestFeedback, setLatestFeedback] = React.useState(feedback);

  React.useEffect(() => {
    const fetchLatestFeedback = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/feedback/${feedback.id}`);
        if (!response.ok) throw new Error('Failed to fetch latest feedback');
        const updated = await response.json();
        console.log(`[AuditTrailModal] Fetched latest feedback for ${feedback.id}:`, {
          id: updated.id,
          reportDetails: updated.reportDetails,
          reportCreatedAt: updated.reportCreatedAt,
          status: updated.status,
          department: updated.department,
          actionHistory: updated.actionHistory,
        });
        setLatestFeedback(updated);
      } catch (err) {
        toast.error(`Failed to load latest feedback: ${err.message}`);
        console.error('Error fetching latest feedback:', err);
      }
    };
    fetchLatestFeedback();
  }, [feedback.id]);

  // Use actionHistory from the database, with a fallback for initial submission
  const auditTrail = [
    {
      timestamp: new Date(latestFeedback.date),
      action: 'Feedback Submitted',
      user: latestFeedback.isAnonymous ? 'Anonymous' : latestFeedback.email || 'Unknown',
      details: `Feedback ID: ${latestFeedback.id}`,
    },
    ...(latestFeedback.actionHistory || [])
      .filter(entry => [
        'Tagged as Spam',
        'Restored',
        'Report Assigned',
        'Escalated'
      ].includes(entry.action))
      .map(entry => ({
        timestamp: new Date(entry.timestamp),
        action: entry.action,
        user: entry.user,
        details: entry.details,
      })),
  ];

  const feedbackDetails = prepareRawFeedbackForDisplay(latestFeedback);
  delete feedbackDetails['Status'];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Audit Trail for Feedback (ID: {latestFeedback.id.toUpperCase()})</h2>
          <button onClick={onClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-history"></i> Action History</h3>
            <div className={styles.auditTableWrapper}>
              <table className={styles.auditTable}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditTrail.map((entry, index) => (
                    <tr key={index}>
                      <td>{entry.timestamp.toLocaleString()}</td>
                      <td>{entry.action}</td>
                      <td>{entry.user}</td>
                      <td>{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-comment-dots"></i> Feedback Details</h3>
            <div className={styles.detailGrid}>
              {Object.entries(feedbackDetails).map(([key, value]) => (
                <div className={styles.detailItem} key={key}>
                  <div className={styles.detailLabel}>{key}</div>
                  <div className={styles.detailValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-file-alt"></i> Feedback Description</h3>
            <p className={styles.descriptionText}>{latestFeedback.description}</p>
          </div>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
            <p className={styles.descriptionText}>
              {latestFeedback.reportDetails || 'No report details available.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

AuditTrailModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
};

export default AuditTrailModal;