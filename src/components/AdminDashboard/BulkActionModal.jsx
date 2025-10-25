import styles from '@assets/css/Dashboard.module.css';

const BulkActionModal = ({ title, onConfirm, onClose, children, confirmText, confirmIcon, isConfirmDisabled }) => (
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
                <button className={`${styles.actionButton} ${styles.confirmButton}`} onClick={onConfirm} disabled={isConfirmDisabled}>
                    <i className={`fas ${confirmIcon}`}></i> {confirmText}
                </button>
                <button className={`${styles.actionButton} ${styles.cancelButton}`} onClick={onClose}>
                    <i className="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    </div>
);

export default BulkActionModal;
