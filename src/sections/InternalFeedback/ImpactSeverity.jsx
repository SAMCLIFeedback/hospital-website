const ImpactSeverity = ({styles, impactOptions, formData, handleInputChange}) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionLabel}>
          <span className={styles.stepNumber}>4</span>
          How does this impact daily operations?
          <span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionDescription}>
          Help us prioritize by indicating the severity of the impact.
        </p>
      </div>

      <div className={styles.severityContainer}>
        <div className={styles.severityOptions}>
          {impactOptions.map(option => (
            <label key={option.value} className={styles.severityOption}>
              <input
                type="radio"
                name="impactSeverity"
                value={option.value}
                checked={formData.impactSeverity === option.value}
                onChange={(e) => handleInputChange('impactSeverity', e.target.value)}
                className={styles.radioInput}
                required
                aria-label={option.label}
              />
              <div className={styles.severityCard}>
                <div className={styles.severityIcon}>{option.icon}</div>
                <div className={styles.severityLabel}>{option.label}</div>
                <div className={styles.severityDesc}>{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ImpactSeverity