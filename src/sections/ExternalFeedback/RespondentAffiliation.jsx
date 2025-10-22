const RespondentAffiliation = ({styles, formData, handleInputChange, roleOptions}) => {
  return (
    <section className={`${styles.section} ${styles.fadeInUp}`}>
      <div className={styles.sectionHeader}>
        <label htmlFor="role" className={styles.sectionLabel}>
          <span className={styles.stepNumber}>1</span> What Is Your Role or Affiliation with the Hospital?
          <span className={styles.required}>*</span>
        </label>
        <p className={styles.sectionDescription}>Please tell us your relationship with the hospital.</p>
      </div>
      <div className={styles.inputGroup}>
        <select
          id="role"
          name="role"
          className={styles.formSelect}
          value={formData.role}
          onChange={(e) => handleInputChange('role', e.target.value)}
          required
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}

export default RespondentAffiliation