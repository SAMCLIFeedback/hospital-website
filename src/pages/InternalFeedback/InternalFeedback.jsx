import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import styles from '@assets/css/internalFeedback.module.css';
import DOMPurify from 'dompurify';
import Loader from '@components/Loader.jsx';
import ProgressBar from '@components/ProgressBar';
import FeedbackType from '@sections/InternalFeedback/FeedbackType';
import { departments, feedbackOptions, impactOptions } from './formdata';
import ImpactSeverity from '@sections/InternalFeedback/ImpactSeverity';
import FeedbackDetails from '@sections/InternalFeedback/FeedbackDetails';
import SubmissionPreference from '@sections/InternalFeedback/SubmissionPreference';
import Consent from '@sections/InternalFeedback/Consent';

const StaffFeedbackForm = () => {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const [staffDepartment, setStaffDepartment] = useState('');
  const [isLoadingDept, setIsLoadingDept] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const [formData, setFormData] = useState({
    feedbackNature: '',
    otherSpecify: '',
    immediateAttention: false,
    department: '',
    customDepartment: '',
    impactSeverity: '',
    description: '',
    isAnonymous: true,
    email: '',
    confirmTruthful: false,
    consentData: false
  });

  const isSubmitDisabled = !formData.confirmTruthful || !formData.consentData;

  useEffect(() => {
    const token = sessionStorage.getItem('staff_token');

    if (!token) {
      navigate('/staff-verification', { replace: true });
      return;
    }

    try {
      const decoded = jwtDecode(token);
      console.log('TOKEN DECODED:', decoded);

      const dept = (decoded.department || 'General Staff').trim();
      setStaffDepartment(dept);
      setFormData(prev => ({ ...prev, department: dept }));
    } catch (err) {
      console.error('Invalid token:', err);
      sessionStorage.removeItem('staff_token');
      navigate('/staff-verification', { replace: true });
    } finally {
      setIsLoadingDept(false);
    }
  }, [navigate]);

  // REMOVED THE CLEANUP THAT WAS DELETING THE TOKEN TOO EARLY

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.feedbackNature) errors.push('Feedback type is required.');
    if (!formData.description || formData.description.length < 50) errors.push('Description must be at least 50 characters.');
    if (formData.feedbackNature !== 'recognition' && !formData.impactSeverity) errors.push('Impact severity is required.');
    if (!formData.confirmTruthful || !formData.consentData) errors.push('You must confirm both statements.');
    if (!formData.isAnonymous && !formData.email) errors.push('Email is required for non-anonymous submission.');
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
      return;
    }

    setIsSubmitting(true);
    setShowLoader(true);

    try {
      const submissionData = {
        feedbackNature: formData.feedbackNature,
        otherSpecify: formData.otherSpecify || null,
        immediateAttention: formData.immediateAttention,
        department: staffDepartment,
        impactSeverity: formData.feedbackNature === 'recognition' ? null : formData.impactSeverity,
        description: DOMPurify.sanitize(formData.description),
        isAnonymous: formData.isAnonymous,
        email: formData.isAnonymous ? null : formData.email
      };

      const response = await fetch(`${BASE_URL}/api/staff-feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('staff_token')}`  // Send token
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Submission failed');
      }

      // Success → Token removed + redirect
      sessionStorage.removeItem('staff_token');
      navigate('/success', { state: { from: 'staff' } });

    } catch (error) {
      setErrorMessage(error.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowLoader(false);
    }
  };

  return (
    <div className={styles.container}>
      {showLoader && <Loader />}
      {errorMessage && <div className={styles.errorMessage} role="alert">{errorMessage}</div>}

      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <div className={styles.iconLarge}>Lock</div>
          <h1 className={styles.title}>Confidential Feedback Portal</h1>
          <p className={styles.subtitle}>Your voice matters. Share concerns safely and anonymously.</p>
          <div className={styles.securityBadge}>
            <span className={styles.securityIcon}>Shield Protected by Hospital Policy | End-to-End Encrypted</span>
          </div>
        </div>
      </div>

      <ProgressBar formData={formData} />

      <form className={styles.form} onSubmit={handleSubmit}>
        <FeedbackType styles={styles} formData={formData} handleInputChange={handleInputChange} feedbackOptions={feedbackOptions} />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>
              <span className={styles.stepNumber}>2</span>
              This feedback is comming from:
            </h2>
          </div>
          <div className={styles.lockedDepartment}>
            <div className={styles.lockedDepartmentValue}>
              <strong>{isLoadingDept ? 'Loading...' : staffDepartment}</strong>
            </div>
            <p className={styles.lockedNote}>This field is locked and cannot be changed.</p>
          </div>
        </section>

        {formData.feedbackNature && formData.feedbackNature !== 'recognition' && (
          <ImpactSeverity styles={styles} formData={formData} handleInputChange={handleInputChange} impactOptions={impactOptions} />
        )}

        <FeedbackDetails styles={styles} formData={formData} handleInputChange={handleInputChange} departments={departments} />
        <SubmissionPreference styles={styles} formData={formData} handleInputChange={handleInputChange} />
        <Consent styles={styles} formData={formData} handleInputChange={handleInputChange} />

        <div className={styles.submitSection}>
          <button
            type="submit"
            className={`${styles.submitButton} ${isSubmitDisabled ? styles.submitDisabled : ''}`}
            disabled={isSubmitDisabled || isSubmitting}
          >
            <span className={styles.submitText}>
              {isSubmitting ? 'Submitting Securely...' : isSubmitDisabled ? 'Please confirm statements above' : 'Submit Feedback Confidentially'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffFeedbackForm;