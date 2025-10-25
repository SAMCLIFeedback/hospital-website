import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '@assets/css/Dashboard.module.css';
import axios from 'axios';

const FeedbackModal = ({ 
  BASE_URL,
  feedback,
  onClose,
  prepareRawFeedbackForDisplay,
  onApproveFeedback,
  setFeedbackData,
  setSelectedFeedback,
  user,
  fetchFeedback,
}) => {
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showAssignDept, setShowAssignDept] = useState(false);
  const [showTakeAction, setShowTakeAction] = useState(false);
  const [adminAssignNotes, setAdminAssignNotes] = useState('');
  const [adminFinalAction, setAdminFinalAction] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  const isApproved = feedback.dept_status === 'approved';
  const isNoActionNeeded = feedback.dept_status === 'no_action_needed';
  const isClosed = isApproved || isNoActionNeeded;

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  const auditTrail = (isClosed && feedback.actionHistory)
    ? [
        {
          timestamp: new Date(feedback.date),
          action: 'Feedback Submitted',
          user: feedback.isAnonymous ? 'Anonymous' : feedback.email || 'Unknown',
          details: `Initial submission from ${feedback.source}.`,
        },
        ...feedback.actionHistory.filter((entry, index, self) => 
          index === self.findIndex(e => 
            e.action === entry.action && 
            e.timestamp === entry.timestamp
          )
        )
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.feedbackModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Feedback Info (ID: {feedback.id.toUpperCase()})</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            title="Close feedback details modal"
            aria-label="Close modal"
          >
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
          {feedback.reportDetails?.trim() && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
              <p className={styles.descriptionText}>{feedback.reportDetails}</p>
            </div>
          )}

          {feedback.dept_status === 'proposed' && feedback.adminNotes && (
            <div className={styles.detailSection}>
              <h3><i className="fas fa-file-signature"></i> Administrative Instructions</h3>
              <p className={styles.descriptionText}>
                {feedback.adminNotes}
              </p>
            </div>
          )}

          {(isClosed || feedback.dept_status === 'proposed') && feedback.finalActionDescription?.trim() && (
            <div className={styles.detailSection}>
              <h3>
                <i className="fas fa-tasks"></i>{' '}
                {isClosed ? 'Final Action' : 'Final Action Proposed'}
              </h3>
              <p className={styles.descriptionText}>{feedback.finalActionDescription}</p>
            </div>
          )}
          
          {!isClosed && feedback.status === 'escalated' && feedback.dept_status !== 'proposed' && (
            <div className={styles.modalActions}>
              {!showAssignDept && !showTakeAction && (
                <>
                  <button
                    className={styles.revisionActionButton}
                    onClick={() => {
                      setShowAssignDept(true);
                      setShowTakeAction(false);
                    }}
                  >
                    <i className="fas fa-share-square"></i> Assign to Department
                  </button>
                  <button
                    className={styles.approveActionButton}
                    onClick={() => {
                      setShowTakeAction(true);
                      setShowAssignDept(false);
                    }}
                  >
                    <i className="fas fa-check-circle"></i> Take Own Action
                  </button>
                </>
              )}

              {showAssignDept && (
                <div className={styles.revisionRequestSection}>
                  <label className={styles.inputLabel} htmlFor="assignNotes">
                    Admin Notes / Guidance<span className={styles.requiredField}>*</span>
                  </label>
                  <textarea
                    id="assignNotes"
                    className={styles.noteTextarea}
                    value={adminAssignNotes}
                    onChange={(e) => setAdminAssignNotes(e.target.value)}
                    placeholder="Explain why you're assigning this and what the department should do..."
                  />
                  <label className={styles.inputLabel} htmlFor="departmentSelect">
                    Select Department<span className={styles.requiredField}>*</span>
                  </label>
                  <select
                    id="departmentSelect"
                    className={styles.actionSelect}
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                  >
                    <option value="">-- Choose a department --</option>
                    {[
                      'Anesthesiology',
                      'Cardiology',
                      'Dermatology',
                      'Internal Medicine',
                      'Obstetrics and Gynecology (OB-GYNE)',
                      'Pediatrics',
                      'Radiology',
                      'Rehabilitation Medicine',
                      'Surgery',
                      'Pathology',
                      'Urology',
                      'Nephrology',
                      'Orthopedics',
                      'Ophthalmology',
                      'ENT (Ear, Nose, Throat)',
                      'Family Medicine',
                      'BESTHEALTH',
                      'Dental Clinic',
                      'Diagnostics',
                      'Dietary',
                      'Emergency Room (ER)',
                      'Hemodialysis',
                      'Intensive Care Unit (ICU)',
                      'Inpatient Department',
                      'Neonatal ICU (NICU)',
                      'Nursing Service',
                      'Operating Room',
                      'Outpatient Department',
                      'Pharmacy',
                      'Physical Therapy'
                    ].map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <div className={styles.revisionActions}>
                    <button
                      className={styles.revisionSendButton}
                      disabled={!adminAssignNotes.trim() || !selectedDept}
                      onClick={async () => {
                        try {
                          const response = await axios.patch(`${BASE_URL}/api/dept/escalate-feedback`, {
                            ids: [feedback.id], // Send as array
                            adminNotes: adminAssignNotes.trim(),
                            department: selectedDept,
                            userName: user.name, // Send userName
                          });

                          if (response.status === 200) {
                            onClose();
                            toast.success('Feedback assigned to department.', {
                              autoClose: 2000,
                            });
                          } else {
                            throw new Error('Unexpected response');
                          }
                        } catch (error) {
                          console.error('Error escalating feedback:', error);
                          toast.error('Failed to assign feedback. Try again.');
                        }
                      }}
                    >
                      <i className="fas fa-share-square"></i> Assign
                    </button>
                    <button
                      className={styles.revisionCancelButton}
                      onClick={() => {
                        setShowAssignDept(false);
                        setAdminAssignNotes('');
                        setSelectedDept('');
                      }}
                    >
                      <i className="fas fa-times-circle"></i> Cancel
                    </button>
                  </div>
                </div>
              )}

              {showTakeAction && (
                <div className={styles.revisionRequestSection}>
                  <h3><i className="fas fa-tasks"></i> Final Action</h3>
                  <textarea
                    id="finalAction"
                    className={styles.noteTextarea}
                    value={adminFinalAction}
                    onChange={(e) => setAdminFinalAction(e.target.value)}
                    placeholder="Describe the final resolution or action taken..."
                  />
                  <div className={styles.revisionActions}>
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
                          setFeedbackData(prev =>
                            prev.map(f =>
                              f.id === feedback.id
                                ? {
                                    ...f,
                                    dept_status: 'no_action_needed',
                                    finalActionDescription: 'No Action Required',
                                  }
                                : f
                            )
                          );
                          setSelectedFeedback(prev => ({
                            ...prev,
                            dept_status: 'no_action_needed',
                            finalActionDescription: 'No Action Required',
                          }));
                          toast.success(`Feedback ${feedback.id.toUpperCase()} marked as 'No Action Needed'.`, {
                            autoClose: 2000,
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
                    <button
                      className={styles.revisionSendButton}
                      disabled={!adminFinalAction.trim()}
                      onClick={async () => {
                        try {
                          const response = await axios.patch(`${BASE_URL}/api/dept/final-approve`, {
                            ids: [feedback.id],
                            finalActionDescription: adminFinalAction.trim(),
                            userName: user.name,
                          });

                          if (response.status === 200) {
                            setFeedbackData(prev =>
                              prev.map(f =>
                                f.id === feedback.id
                                  ? { ...f, dept_status: 'approved', finalActionDescription: adminFinalAction.trim(), status: null }
                                  : f
                              )
                            );
                            toast.success('Feedback approved successfully!', {
                              autoClose: 2000,
                            });
                            onClose();
                          } else {
                            throw new Error('Unexpected response');
                          }
                        } catch (err) {
                          console.error('Final approval failed:', err);
                          toast.error('Failed to approve feedback.');
                        }
                      }}
                    >
                      <i className="fas fa-check-circle"></i> Approve
                    </button>
                    <button
                      className={styles.revisionCancelButton}
                      onClick={() => {
                        setShowTakeAction(false);
                        setAdminFinalAction('');
                      }}
                    >
                      <i className="fas fa-times-circle"></i> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {!isClosed && feedback.dept_status === 'proposed' && (
          <div className={styles.modalActions}>
            {!isRequestingRevision && (
              <>
                <button
                  className={styles.approveActionButton}
                  onClick={() => onApproveFeedback(feedback.id)}
                >
                  <i className="fas fa-check-circle"></i> Approve
                </button>
                <button
                  className={styles.revisionActionButton}
                  onClick={() => setIsRequestingRevision(true)}
                >
                  <i className="fas fa-edit"></i> Request Revision
                </button>
              </>
            )}

            {isRequestingRevision && (
              <div className={styles.revisionRequestSection}>
                <label className={styles.inputLabel} htmlFor="revisionNotes">
                  Notes for Revision<span className={styles.requiredField}>*</span>
                </label>
                <textarea
                  id="revisionNotes"
                  className={styles.noteTextarea}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Explain what needs to be revised..."
                />
                <div className={styles.revisionActions}>
                  <button
                    className={styles.revisionSendButton}
                    disabled={!revisionNotes.trim()}
                    onClick={async () => {
                      try {
                        // MODIFIED: Payload now matches bulk endpoint signature
                        const response = await axios.patch(`${BASE_URL}/api/dept/request-revision`, {
                          ids: [feedback.id], // Send as array
                          notes: revisionNotes.trim(),
                          userName: user.name, // Send userName
                        });

                        if (!response.data) throw new Error('Request failed');
                        
                        toast.success('Revision request sent!', {
                          autoClose: 2000,
                        });
                        setIsRequestingRevision(false);
                        setRevisionNotes('');
                        onClose();
                        // The bulkFeedbackUpdate event will handle the refresh
                      } catch (err) {
                        console.error('Failed to request revision:', err);
                        toast.error(`Failed to send revision request: ${err.response?.data?.error || err.message}`);
                      }
                    }}
                  >
                    <i className="fas fa-paper-plane"></i> Send
                  </button>
                  <button
                    className={styles.revisionCancelButton}
                    onClick={() => {
                      setIsRequestingRevision(false);
                      setRevisionNotes('');
                    }}
                  >
                    <i className="fas fa-times-circle"></i> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

FeedbackModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  onApproveFeedback: PropTypes.func.isRequired,
  setFeedbackData: PropTypes.func.isRequired,
  setSelectedFeedback: PropTypes.func.isRequired,
  user: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
    username: PropTypes.string,
  }).isRequired,
};

export default FeedbackModal;