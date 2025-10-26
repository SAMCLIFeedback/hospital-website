import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '@assets/css/Dashboard.module.css';
import axios from 'axios';

const FeedbackModal = ({ BASE_URL, feedback, onClose, prepareRawFeedbackForDisplay, actionState, setActionState, user }) => {  const isProposed = feedback.dept_status === 'proposed';
  const isNoActionNeeded = feedback.dept_status === 'no_action_needed';
  const isNeedRevision = feedback.dept_status === 'need_revision';
  const isApproved = feedback.dept_status === 'approved';
  const isActionMode = isProposed || isNeedRevision || actionState[feedback.id]?.isActionMode || false;
  const actionText = actionState[feedback.id]?.actionText || '';
  const isClosed = isApproved || isNoActionNeeded;

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  const handleTakeAction = () => {
    setActionState(prev => ({
      ...prev,
      [feedback.id]: { isActionMode: true, actionText: actionText },
    }));
  };

  const handleCancelAction = () => {
    const hasInput = actionText.trim().length > 0;
    setActionState(prev => ({
      ...prev,
      [feedback.id]: { isActionMode: false, actionText: '' },
    }));
    if (hasInput) {
      toast.warn('Input text cleared', {
        autoClose: 2000
      });
    } else {
      toast.info('Creation canceled', {
        autoClose: 2000
      });
    }
    if (isNeedRevision) {
      onClose();
    }
  };

  const handleSendForApproval = async () => {
    try {
      await axios.patch(`${BASE_URL}/api/dept/propose-action`, {
        ids: [feedback.id],
        finalActionDescription: actionText,
      });
      toast.success(`Action for ${feedback.id} sent for approval.`, {
        autoClose: 2000
      });
      onClose();
    } catch (err) {
      console.error('Error sending for approval:', err);
      toast.error('Failed to send action for approval.');
    }
  };

  const handleActionTextChange = (e) => {
    setActionState(prev => ({
      ...prev,
      [feedback.id]: { isActionMode: true, actionText: e.target.value },
    }));
  };

  const handleModalClose = () => {
    onClose();
  };

  // Prepare audit trail data
  const auditTrail = (isClosed) && feedback.actionHistory
    ? [
        {
          timestamp: new Date(feedback.date),
          action: 'Feedback Submitted',
          user: feedback.isAnonymous ? 'Anonymous' : feedback.email || 'Unknown',
          details: `Initial submission from ${feedback.source}.`,
        },
        ...feedback.actionHistory,
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Feedback Info (ID: {feedback.id.toUpperCase()})</h2>
          <button onClick={handleModalClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          {isClosed && auditTrail.length > 0 && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-history"></i> Action History</h3>
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
                      <td>{new Date(entry.timestamp).toLocaleString()}</td>
                      <td>{entry.action}</td>
                      <td>{entry.user}</td>
                      <td>{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
            <p className={styles.descriptionText}>
              {feedback.reportDetails || 'No report details available.'}
            </p>
          </div>
          {feedback.dept_status === 'needs_action' && feedback.adminNotes && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-file-signature"></i> Administrative Instructions</h3>
              <p className={styles.descriptionText}>
                {feedback.adminNotes}
              </p>
            </div>
          )}
          {isNeedRevision && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-sticky-note"></i> Revision Notes</h3>
              <p className={styles.descriptionText}>
                {feedback.revisionNotes || 'No revision notes available.'}
              </p>
            </div>
          )}
          {(isActionMode || isNoActionNeeded || isProposed || isApproved) && (
            <div className={styles.detailSection}>
              <h3>
                <i className="fas fa-tasks"></i>
                {isNoActionNeeded || isApproved ? ' Final Action' : ' Final Action Proposal'}
              </h3>
              <div className={styles.inputGroup}>
                {(isProposed || isNoActionNeeded || isApproved) ? (
                  <p className={styles.descriptionText}>
                    {isNoActionNeeded ? 'No Action Required' : feedback.finalActionDescription || 'No action description provided.'}
                  </p>
                ) : (
                  <>
                    <label className={styles.inputLabel} htmlFor="actionText">
                      Action Description<span className={styles.requiredField}>*</span>
                    </label>
                    <textarea
                      id="actionText"
                      className={styles.noteTextarea}
                      value={actionText}
                      onChange={handleActionTextChange}
                      placeholder="Describe the proposed action..."
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={styles.modalActions}>
          {!isActionMode && !isNoActionNeeded && !isApproved && (
            <button
              className={`${styles.actionButton} ${styles.createReportButton}`}
              onClick={handleTakeAction}
            >
              <i className="fas fa-tasks"></i> Take Action
            </button>
          )}
          {isActionMode && !isNoActionNeeded && !isApproved && (
            <>
              {isProposed ? (
                <button
                  className={`${styles.actionButton} ${styles.disabledButton}`}
                  disabled
                >
                  <i className="fas fa-hourglass-half"></i> Waiting for Approval
                </button>
              ) : (
                <>
                  {['needs_action', 'need_revision'].includes(feedback.dept_status) && (
                    <button
                      className={`${styles.actionButton} ${styles.noActionButton}`}
                      onClick={async () => {
                        if (!user?.name) {
                          toast.error('User session not loaded. Please log in again.');
                          return;
                        }
                        try {
                          await axios.patch(`${BASE_URL}/api/dept/no-action`, {
                            ids: [feedback.id],
                            userName: user.name,
                          });
                          toast.success(`Feedback ${feedback.id.toUpperCase()} marked as 'No Action Needed'.`, {
                            autoClose: 2000
                          });
                          onClose();
                        } catch (err) {
                          console.error('Error marking no action needed:', err);
                          toast.error('Failed to update feedback status.');
                        }
                      }}
                    >
                      <i className="fas fa-ban"></i> Mark No Action Needed
                    </button>
                  )}
                  <button
                    className={`${styles.actionButton} ${styles.confirmButton}`}
                    onClick={handleSendForApproval}
                    disabled={!actionText.trim()}
                  >
                    <i className="fas fa-paper-plane"></i> Send for Approval
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.cancelButton}`}
                    onClick={handleCancelAction}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

FeedbackModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  actionState: PropTypes.object.isRequired,
  setActionState: PropTypes.func.isRequired,
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default FeedbackModal;