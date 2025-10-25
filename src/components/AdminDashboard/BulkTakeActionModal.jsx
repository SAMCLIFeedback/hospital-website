import styles from '@assets/css/Dashboard.module.css';

const BulkTakeActionModal = ({ title, onClose, onNoAction, onApprove, children, isConfirmDisabled }) => (
     <div className={styles.modalOverlay}>
        <div className={`${styles.modalContent} ${styles.reportModalContent}`}>
            <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>{title}</h2>
                <button onClick={onClose} className={styles.closeButton} title="Close Modal">
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className={styles.modalBody}>{children}</div>
            <div className={styles.modalActions}>
                 <button className={`${styles.actionButton} ${styles.noActionButton}`} onClick={onNoAction}>
                    <i className="fas fa-ban"></i> Mark No Action Needed
                </button>
                <button className={`${styles.actionButton} ${styles.approveActionButton}`} onClick={onApprove} disabled={isConfirmDisabled}>
                    <i className="fas fa-check-circle"></i> Approve
                </button>
                <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={onClose}>
                    <i className="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>
);
export default BulkTakeActionModal;