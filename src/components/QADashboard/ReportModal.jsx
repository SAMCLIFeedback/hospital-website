import PropTypes from 'prop-types';
import styles from '@assets/css/Dashboard.module.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ReportModal = ({
  BASE_URL,
  feedback,
  departments,
  onClose,
  onGenerateReport,
  onEscalate,
  reportContent,
  setReportContent,
  reportDepartment,
  setReportDepartment,
  prepareRawFeedbackForDisplay,
  isGenerating,
  setIsGenerating,
  hasGenerated,
  setHasGenerated,
}) => {
  const handleEscalateToAdmin = () => {
    onEscalate(feedback.id, reportContent, reportDepartment);
  };

  const feedbackDetails = prepareRawFeedbackForDisplay(feedback);
  delete feedbackDetails['Status'];

  const isCurrentlyGenerating = isGenerating[feedback.id]?.isGenerating;
  const hasAlreadyGenerated = hasGenerated[feedback.id]?.hasGenerated;

  const handleCancel = () => {
    // Check if there is content or an ongoing generation
    const hasContent = reportContent && reportContent.trim().length > 0;
    
    if (isCurrentlyGenerating || hasContent) {
      let message = 'Report generation stopped';
      if (isCurrentlyGenerating && hasContent) {
        message = 'Report generation stopped and input text cleared.';
      } else if (hasContent) {
        message = 'Input text cleared.';
      }
      toast.warn(message, {
        autoClose: 2000
      });
    } else {
      toast.info('Report creation canceled.', {
        autoClose: 2000
      });
    }

    // Abort any ongoing generation
    if (isCurrentlyGenerating) {
      isGenerating[feedback.id]?.abortController?.abort();
    }

    // Clear the report content and department
    setReportContent(feedback.id, '');
    setIsGenerating(feedback.id, false);
    setHasGenerated(feedback.id, false);

    // Call onClose with true to indicate cancellation
    onClose(true);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.reportModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create Report for Feedback (ID: {feedback.id.toUpperCase()})</h2>
          <button onClick={() => onClose(false)} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          {feedback.status === 'assigned' || feedback.status === 'escalated' ? (
            <>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-clipboard-list"></i> Original Feedback Data</h3>
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
                <p className={styles.descriptionText}>{feedback.description}</p>
              </div>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-sticky-note"></i> Report Details</h3>
                <pre className={styles.readonlyText}>
                  {reportContent || 'No report content available.'}
                </pre>
              </div>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-hospital-user"></i> Assigned Department</h3>
                <p className={styles.descriptionText}>{feedback.department || 'Unknown'}</p>
              </div>
            </>
          ) : (
            <>
              <div className={styles.detailSection}>
                <h3><i className="fas fa-clipboard-list"></i> Original Feedback Data</h3>
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
                <p className={styles.descriptionText}>{feedback.description}</p>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="reportContent" className={styles.inputLabel}>
                  Report Details <span className={styles.requiredField}>*</span>
                </label>
                <textarea
                  id="reportContent"
                  className={styles.noteTextarea}
                  value={reportContent}
                  onChange={e => setReportContent(feedback.id, e.target.value)}
                  placeholder="Summarize the feedback and identify key concerns or themes...
Conduct a root cause analysis to explain why the issue occurred...
Provide clear, targeted, and actionable recommendations for the department to address the issue..."
                  rows="8"
                  required
                  disabled={feedback.status === 'spam'}
                />
                <button
                  className={`${styles.actionButton} ${styles.generateReportButton}`}
                  onClick={async () => {
                    if (!feedback.description || !feedback.sentiment) {
                      console.warn("Missing feedback description or sentiment.");
                      toast.error('Missing feedback description or sentiment.');
                      return;
                    }
                    if (feedback.status === 'spam') {
                      toast.error('Cannot generate report for spam feedback. Restore to unassigned first.');
                      return;
                    }

                    const controller = new AbortController();
                    setIsGenerating(feedback.id, true, controller);
                    toast.info('Generating report...', {
                      autoClose: 1000
                    });
                    try {
                      const response = await fetch(`${BASE_URL}/api/generate-report`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          description: feedback.description,
                          sentiment: feedback.sentiment,
                          variant: hasAlreadyGenerated ? 'retry' : 'default',
                          ratings: feedback.rating || null,
                          impact_severity: feedback.impactSeverity || null,
                          feedback_type: feedback.feedbackType || null,
                          department: feedback.department || null,
                        }),
                        signal: controller.signal,
                      });

                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || 'Unknown error');

                      setReportContent(feedback.id, data.report);
                      setHasGenerated(feedback.id, true);
                      toast.success('Report generated successfully!', {
                        autoClose: 2000
                      });
                    } catch (err) {
                      if (err.name === 'AbortError') {
                        toast.warn('Report generation aborted.');
                        return;
                      }
                      console.error('Error generating report:', err.message);
                      toast.error(`Error generating report: ${err.message}`);
                    } finally {
                      setIsGenerating(feedback.id, false);
                    }
                  }}
                  disabled={isCurrentlyGenerating || feedback.status === 'spam'}
                >
                  {isCurrentlyGenerating ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Generating
                    </>
                  ) : hasAlreadyGenerated ? (
                    <>
                      <i className="fas fa-redo"></i> Generate Again
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic"></i> Generate Automatic Report
                    </>
                  )}
                </button>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="reportDepartment" className={styles.inputLabel}>
                  Assign to Department <span className={styles.requiredField}>*</span>
                </label>
                <select
                  id="reportDepartment"
                  className={styles.actionSelect}
                  value={reportDepartment}
                  onChange={e => setReportDepartment(feedback.id, e.target.value)}
                  required
                  disabled={feedback.status === 'spam'}
                >
                  <option value="">Select Department for Report</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.actionButton} ${styles.confirmButton}`}
                  onClick={() => onGenerateReport(feedback.id, reportContent, reportDepartment)}
                  disabled={
                    !reportContent ||
                    !reportDepartment ||
                    reportDepartment === '' ||
                    !departments.includes(reportDepartment) || 
                    feedback.status === 'spam'
                  }
                >
                  <i className="fas fa-paper-plane"></i> Send Report
                </button>
                <button
                  className={`${styles.actionButton} ${styles.escalateButton}`}
                  onClick={handleEscalateToAdmin}
                  disabled={feedback.status === 'spam' || !reportContent.trim()}
                >
                  <i className="fas fa-exclamation-triangle"></i> Escalate to Admin
                </button>
                <button
                  className={`${styles.actionButton} ${styles.cancelButton}`}
                  onClick={handleCancel}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ReportModal.propTypes = {
  feedback: PropTypes.object.isRequired,
  departments: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onGenerateReport: PropTypes.func.isRequired,
  onEscalate: PropTypes.func.isRequired,
  reportContent: PropTypes.string.isRequired,
  setReportContent: PropTypes.func.isRequired,
  reportDepartment: PropTypes.string.isRequired,
  setReportDepartment: PropTypes.func.isRequired,
  prepareRawFeedbackForDisplay: PropTypes.func.isRequired,
  isGenerating: PropTypes.object.isRequired,
  setIsGenerating: PropTypes.func.isRequired,
  hasGenerated: PropTypes.object.isRequired,
  setHasGenerated: PropTypes.func.isRequired,
};

export default ReportModal;