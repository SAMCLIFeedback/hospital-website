const FeedbackDetails = ({styles, formData, handleInputChange}) => {
  return (
    <section className={`${styles.section} ${styles.fadeInUp}`}>
      <div className={styles.sectionHeader}>
        <label htmlFor="description" className={styles.sectionLabel}>
          <span className={styles.stepNumber}>5</span> Tell us more details
          <span className={styles.required}>*</span>
        </label>
        <p className={styles.sectionDescription}>Provide specific information to help us understand and address your feedback.</p>
      </div>
      <div className={styles.inputGroup}>
        <label htmlFor="description" className={styles.inputLabel}>Description</label>
        <textarea
          id="description"
          name="description"
          className={styles.formTextarea}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows="5"
          placeholder="E.g., I experienced a long wait time..."
          required
        ></textarea>
      </div>
    </section>
  )
}

export default FeedbackDetails