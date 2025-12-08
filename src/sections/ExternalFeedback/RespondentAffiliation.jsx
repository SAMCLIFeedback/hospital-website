import React, { useEffect } from 'react';

const RespondentAffiliation = ({styles, formData, handleInputChange, roleOptions, type}) => {
  
  useEffect(() => {
    let newRole = '';
    
    if (type === 'patients') {
      newRole = 'patient';
    } else {
      newRole = 'visitor';
    }
    
    if (formData.role !== newRole) {
      handleInputChange('role', newRole);
    }
  }, [type, formData.role, handleInputChange]); 

  return (
    <>
      <section className={`${styles.section} ${styles.fadeInUp}`}>
        <div className={styles.sectionHeader}>
          <label htmlFor="role" className={styles.sectionLabel}>
            <span className={styles.stepNumber}>1</span>Welcome, {type === 'patients' ? 'Patient!' : 'Visitor!'}
            <span className={styles.required}>*</span>
          </label>
        </div>
        <div className={styles.inputGroup}>
          <select
            id="role"
            name="role"
            className={styles.formSelect}
            value={formData.role} 
            disabled
          >
            <option value={type === 'patients' ? 'patient' : 'visitor'}>
              {type === 'patients' ? 'Patient' : 'Visitor'}
            </option>
          </select>
        </div>
      </section>
    </>
  );
};

export default RespondentAffiliation;