const PrivacyBox = ({styles, setShowPrivacyModal}) => {
  return (
    <div className={styles.privacyBox}>
      <div className={styles.privacyBoxContent}>
        <span className={styles.privacyBoxIcon}>✅</span>
        <div>
          <p className={styles.privacyTitle}>Privacy Protected</p>
          <p className={styles.privacyText}>
            Your email will only be used to verify your employment. It will not be stored or shared with anyone, including QA or management.
          </p>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className={styles.privacyLink}
          >
            How we protect your privacy
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyBox