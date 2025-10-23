import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FeedbackModal = ({styles, BASE_URL, feedback, onClose, onCreateReport, prepareRawFeedbackForDisplay, updateSentiment, handleViewHistory }) => {
  const [newSentiment, setNewSentiment] = useState(feedback.sentiment);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (newSentiment === feedback.sentiment) {
      console.log('No changes to save for sentiment.');
      return;
    }

    if (feedback.status === 'spam') {
      toast.error('Cannot update sentiment for spam feedback. Restore to unassigned first.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        sentiment: newSentiment,
        sentiment_status: 'completed',
      };

      const response = await fetch(`${BASE_URL}/api/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update feedback');
      }

      updateSentiment(feedback.id, newSentiment);
      toast.success('Sentiment updated successfully!', {
        autoClose: 2000
      });
    } catch (error) {
      console.error(`Failed to update feedback: ${error.message}`);
      toast.error(`Failed to update sentiment: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Feedback Info (ID: {feedback.id.toUpperCase()})</h2>
          <button onClick={onClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.detailSection}>
            <h3><i className="fas fa-file-alt"></i> Feedback Description</h3>
            <p className={styles.descriptionText}>{feedback.description}</p>
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
            <h3><i className="fas fa-smile"></i> Update Sentiment</h3>
            <div className={styles.detailValue}>
              <select
                value={newSentiment || ''}
                onChange={e => setNewSentiment(e.target.value)}
                className={styles.actionSelect}
                disabled={feedback.status === 'spam'}
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>s
                <option value="negative">Negative</option>
              </select>
              <button
                className={`${styles.actionButton} ${styles.saveSentimentButton}`}
                onClick={handleSave}
                disabled={isSaving || newSentiment === feedback.sentiment || feedback.status === 'spam'}
              >
                <i className="fas fa-save"></i> Save Changes
              </button>
            </div>
          </div>
          <div className={styles.modalActions}>
            {feedback.status !== 'assigned' ? (
              <button
                className={`${styles.actionButton} ${styles.createReportButton}`}
                onClick={onCreateReport}
                disabled={feedback.status === 'spam'}
              >
                <i className="fas fa-pen-alt"></i> Create Formal Report
              </button>
            ) : (
              <button
                className={`${styles.actionButton} ${styles.viewReportButton}`}
                onClick={onCreateReport}
              >
                <i className="fas fa-eye"></i> View Formal Report
              </button>
            )}
            {feedback.status === 'assigned' && (
              <button
                className={`${styles.actionButton} ${styles.viewReportButton}`}
                onClick={() => handleViewHistory(feedback)}
              >
                <i className="fas fa-history"></i> View History
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

FeedbackModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreateReport: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  updateSentiment: PropTypes.func.isRequired,
  handleViewHistory: PropTypes.func.isRequired,
};

export default FeedbackModal;