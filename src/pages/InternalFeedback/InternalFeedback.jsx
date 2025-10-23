import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '@assets/css/internalFeedback.module.css';
import DOMPurify from 'dompurify';
import Loader from '@components/Loader.jsx';
import ProgressBar from '@components/ProgressBar';
import FeedbackType from '@sections/InternalFeedback/FeedbackType';
import { departments, feedbackOptions, impactOptions } from './formdata';
import DepartmentConcerned from '@sections/InternalFeedback/DepartmentConcerned';
import ImpactSeverity from '@sections/InternalFeedback/ImpactSeverity';
import FeedbackDetails from '@sections/InternalFeedback/FeedbackDetails';
import SubmissionPreference from '@sections/InternalFeedback/SubmissionPreference';
import Consent from '@sections/InternalFeedback/Consent';

const StaffFeedbackForm = () => {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const navigate = useNavigate();
  const isSubmitDisabled = !formData.confirmTruthful || !formData.consentData;

  useEffect(() => {
    const handleScroll = () => setShowDropdown(false);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const handleDepartmentSelect = (dept) => {
    setFormData(prev => ({
      ...prev,
      department: dept,
      customDepartment: ''
    }));
    setShowDropdown(false);
    setSearchTerm(dept);
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.feedbackNature) errors.push('Feedback type is required.');
    if (!formData.description || formData.description.length < 50) {
      errors.push('Description must be at least 50 characters.');
    }
    if (!formData.department && !formData.customDepartment) {
      errors.push('Department selection is required.');
    }
    if (formData.department === 'custom' && !formData.customDepartment) {
      errors.push('Custom department name is required.');
    }
    if (formData.feedbackNature !== 'recognition' && !formData.impactSeverity) {
      errors.push('Impact severity is required for non-recognition feedback.');
    }
    if (!formData.confirmTruthful) errors.push('You must confirm the feedback is truthful.');
    if (!formData.consentData) errors.push('You must consent to data use.');
    if (!formData.isAnonymous && !formData.email) {
      errors.push('Email is required for non-anonymous feedback.');
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
      setIsSubmitting(false);
      setShowLoader(false);
      return;
    }

    setIsSubmitting(true);
    setShowLoader(true);

    try {
      const submissionData = {
        feedbackNature: formData.feedbackNature,
        otherSpecify: formData.otherSpecify,
        immediateAttention: formData.immediateAttention,
        department: formData.department === 'custom' ? formData.customDepartment : formData.department,
        impactSeverity: formData.feedbackNature === 'recognition' ? null : formData.impactSeverity,
        description: DOMPurify.sanitize(formData.description),
        isAnonymous: formData.isAnonymous,
        email: formData.isAnonymous ? null : formData.email
      };

      const response = await fetch(`${BASE_URL}/api/staff-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      navigate('/success', { state: { from: 'staff' } });
      setFormData({
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
      setSearchTerm('');
    } catch (error) {
      console.error('Submission error:', error);
      setErrorMessage(error.message || 'There was an error submitting your feedback. Please try again.');
      setShowLoader(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {showLoader && <Loader />}
      {errorMessage && (
        <div className={styles.errorMessage} role="alert">
          {errorMessage}
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <div className={styles.iconLarge}>🔒</div>
          <h1 className={styles.title}>Confidential Feedback Portal</h1>
          <p className={styles.subtitle}>
            Your voice matters. Share concerns safely and anonymously.
          </p>
          <div className={styles.securityBadge}>
            <span className={styles.securityIcon}>🛡️
            Protected by Hospital Policy | End-to-End Encrypted</span>
          </div>
        </div>
      </div>

      <ProgressBar formData={formData}/>

      <form className={styles.form} onSubmit={handleSubmit}>
        <FeedbackType styles={styles} formData={formData} handleInputChange={handleInputChange} feedbackOptions={feedbackOptions}/>
        <DepartmentConcerned 
          styles={styles} 
          dropdownRef={dropdownRef} 
          inputRef={inputRef} 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm}
          setShowDropdown={setShowDropdown}
          setDropdownCoords={setDropdownCoords}
          formData={formData}
          showDropdown={showDropdown}
          dropdownCoords={dropdownCoords}
          handleDepartmentSelect={handleDepartmentSelect}
          handleInputChange={handleInputChange}
          departments={departments}
        />

        {formData.feedbackNature && formData.feedbackNature !== 'recognition' && (
          <ImpactSeverity styles={styles} formData={formData} handleInputChange={handleInputChange} impactOptions={impactOptions}/>
        )}

        <FeedbackDetails styles={styles} formData={formData} handleInputChange={handleInputChange} departments={departments}/>
        <SubmissionPreference styles={styles} formData={formData} handleInputChange={handleInputChange}/>
        <Consent styles={styles} formData={formData} handleInputChange={handleInputChange}/>

        <div className={styles.submitSection}>
          <button
            type="submit"
            className={`${styles.submitButton} ${isSubmitDisabled ? styles.submitDisabled : ''}`}
            disabled={isSubmitDisabled || isSubmitting}
            aria-disabled={isSubmitDisabled || isSubmitting}
          >
            <span className={styles.submitText}>
              {isSubmitting ? 'Submitting Securely...' :
              (isSubmitDisabled ? 'Please confirm statements above' :
                'Submit Feedback Confidentially')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffFeedbackForm;