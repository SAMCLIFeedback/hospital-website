import { useState } from 'react';
import { ratingLabels } from '@pages/ExternalFeedback/formData';

const OverallExperienceRating = ({styles, handleInputChange, formData, }) => {
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <section className={`${styles.section} ${styles.fadeInUp}`}>
      <div className={styles.sectionHeader}>
        <label className={styles.sectionLabel}>
          <span className={styles.stepNumber}>4</span> Overall Experience Rating
          <span className={styles.required}>*</span>
        </label>
        <p className={styles.sectionDescription}>How would you rate your overall experience?</p>
      </div>
      <div className={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${styles.star} ${star <= (hoveredStar || formData.rating) ? styles.filled : ''}`}
            onClick={() => handleInputChange('rating', star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            role="button"
            aria-label={`${star} out of 5 stars`}
          >
            ★
          </span>
        ))}
      </div>
      {formData.rating > 0 && (
        <p style={{ textAlign: 'center', marginTop: '0.5rem', color: '#4b5563', fontWeight: '500' }}>
          {ratingLabels[formData.rating]}
        </p>
      )}
    </section>
  )
}

export default OverallExperienceRating