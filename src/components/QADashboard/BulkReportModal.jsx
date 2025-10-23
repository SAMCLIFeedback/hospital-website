import PropTypes from 'prop-types';
import styles from '@assets/css/Dashboard.module.css';

const BulkReportModal = ({
  selectedFeedbackIds,
  departments,
  onClose,
  onBulkGenerateReport,
  onBulkEscalate,
  reportContent,
  setReportContent,
  reportDepartment,
  setReportDepartment,
}) => {
  const handleEscalateToAdmin = () => {
    onBulkEscalate();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles.reportModalContent}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create Bulk Report for {selectedFeedbackIds.length} Feedback Items</h2>
          <button onClick={onClose} className={styles.closeButton} title="Close Modal">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.inputGroup}>
            <label htmlFor="bulkReportContent" className={styles.inputLabel}>
              Report Details <span className={styles.requiredField}>*</span>
            </label>
            <textarea
              id="bulkReportContent"
              className={styles.noteTextarea}
              value={reportContent}
              onChange={e => setReportContent(e.target.value)}
              placeholder="Summarize the common themes and concerns across selected feedback items...
Provide clear, targeted, and actionable recommendations for the department to address these issues..."
              rows="10"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="bulkReportDepartment" className={styles.inputLabel}>
              Assign to Department <span className={styles.requiredField}>*</span>
            </label>
            <select
              id="bulkReportDepartment"
              className={styles.actionSelect}
              value={reportDepartment}
              onChange={e => setReportDepartment(e.target.value)}
              required
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
              onClick={onBulkGenerateReport}
              disabled={!reportContent || !reportDepartment}
            >
              <i className="fas fa-paper-plane"></i> Send Report
            </button>
            <button
              className={`${styles.actionButton} ${styles.escalateButton}`}
              onClick={handleEscalateToAdmin}
              disabled={!reportContent.trim()}
            >
              <i className="fas fa-exclamation-triangle"></i> Escalate to Admin
            </button>
            <button
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={onClose}
            >
              <i className="fas fa-times"></i> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

BulkReportModal.propTypes = {
  selectedFeedbackIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  departments: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onBulkGenerateReport: PropTypes.func.isRequired,
  onBulkEscalate: PropTypes.func.isRequired,
  reportContent: PropTypes.string.isRequired,
  setReportContent: PropTypes.func.isRequired,
  reportDepartment: PropTypes.string.isRequired,
  setReportDepartment: PropTypes.func.isRequired,
};

export default BulkReportModal;