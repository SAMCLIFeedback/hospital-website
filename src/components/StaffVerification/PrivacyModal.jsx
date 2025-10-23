import React from 'react'

const PrivacyModal = ({styles, setShowPrivacyModal}) => {
  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>How We Protect Your Privacy</h3>
        <ul className={styles.modalList}>
          <li className={styles.modalListItem}>• Email used only for verification, never stored</li>
          <li className={styles.modalListItem}>• All metadata stripped from submissions</li>
          <li className={styles.modalListItem}>• Responses aggregated and anonymized</li>
          <li className={styles.modalListItem}>• No IP tracking or user fingerprinting</li>
          <li className={styles.modalListItem}>• Data encrypted in transit and at rest</li>
        </ul>
        <button
          onClick={() => setShowPrivacyModal(false)}
          className={styles.button}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export default PrivacyModal