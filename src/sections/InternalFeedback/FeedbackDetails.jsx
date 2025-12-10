import React from 'react';

const FeedbackDetails = ({ styles, formData, handleInputChange, departments }) => {
  // Safe fallback: if departments is missing, treat as empty list
  const departmentNames = departments
    ? Object.values(departments).flat().map(d => d.toLowerCase())
    : [];

  // Detect if user typed a full name like "John Doe" that is NOT a department name
  const isPotentialName = (text) => {
    if (!text || text.length < 5) return false;

    const words = text.split(/\s+/);
    return words.some(word => {
      // Match pattern like "John Doe" — two capitalized words
      const isFullNamePattern = /^[A-Z][a-zA-Z]+ [A-Z][a-zA-Z]+$/.test(word);
      if (!isFullNamePattern) return false;

      // If it matches a known department (e.g. "Operating Room"), allow it
      const lowerWord = word.toLowerCase();
      return !departmentNames.some(dept => dept.includes(lowerWord) || lowerWord.includes(dept));
    });
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionLabel}>
          <span className={styles.stepNumber}>
            {formData.feedbackNature === 'recognition' ? 3 : 4}
          </span>
          Tell us more details
          <span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionDescription}>
          Provide specific information to help us understand and address your feedback.
        </p>
      </div>

      <div className={styles.textareaContainer}>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Please include:\n• Specific location or equipment (if applicable)\n• When this occurred or was noticed\n• What you observed or experienced\n• Any suggestions for improvement\n\nExample: 'The hand sanitizer dispenser near Room 205 has been empty for 3 days.'"
          className={styles.textarea}
          minLength="50"
          maxLength="1200"
          required
          aria-required="true"
        />

        <div className={styles.textareaFooter}>
          <div className={styles.charCount}>
            <span className={formData.description.length >= 50 ? styles.charCountGood : styles.charCountWarning}>
              {formData.description.length}
            </span>
            <span className={styles.charCountTotal}>/1200 characters</span>
            {formData.description.length < 50 && (
              <span className={styles.minWarning}>
                {50 - formData.description.length} more needed
              </span>
            )}
          </div>
        </div>

        {/* Privacy Warning — now safe */}
        {isPotentialName(formData.description) && (
          <div className={styles.warning}>
            <span className={styles.warningIcon}>Warning</span>
            <span>Use initials or roles instead of full names to protect privacy (e.g. 'Dr. J.S.' instead of 'Dr. John Smith').</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeedbackDetails;