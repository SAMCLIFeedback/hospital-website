import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
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
  const navigate = useNavigate();

  // State for the Staff's Source Department (from Token)
  const [staffDepartment, setStaffDepartment] = useState('');
  const [isLoadingDept, setIsLoadingDept] = useState(true);

  // State for Dropdown Logic (Target Department)
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });

  // General Form State
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const [formData, setFormData] = useState({
    feedbackNature: '',
    otherSpecify: '',
    immediateAttention: false,
    department: '', // This will be the Target Department selected via Dropdown
    customDepartment: '',
    impactSeverity: '',
    description: '',
    isAnonymous: true,
    email: '',
    confirmTruthful: false,
    consentData: false
  });

  const isSubmitDisabled = !formData.confirmTruthful || !formData.consentData;

  // 1. Authentication & Token Decoding Effect
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
    } catch (err) {
      console.error('Invalid token:', err);
      sessionStorage.removeItem('staff_token');
      navigate('/staff-verification', { replace: true });
    } finally {
      setIsLoadingDept(false);
    }
  }, [navigate]);

  // 2. Dropdown Event Listeners (Scroll & Click Outside)
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

  // 3. Handlers
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
    if (!formData.description || formData.description.length < 50) errors.push('Description must be at least 50 characters.');
    
    // Validate that the Target Department is selected
    if (!formData.department && !formData.customDepartment) {
      errors.push('Department selection (who this is about) is required.');
    }
    if (formData.department === 'custom' && !formData.customDepartment) {
      errors.push('Custom department name is required.');
    }

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
        
        // SOURCE: The staff member's department from the token
        sourceDepartment: staffDepartment, 
        
        // TARGET: The department selected in the dropdown
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
          'Authorization': `Bearer ${sessionStorage.getItem('staff_token')}`
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Submission failed');
      }

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

        {/* Section: Source Department (Locked/Read-Only) */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>
              <span className={styles.stepNumber}>2</span>
              This feedback is <strong>coming from</strong>:
            </h2>
          </div>
          <div className={styles.lockedDepartment}>
            <div className={styles.lockedDepartmentValue}>
              <strong>{isLoadingDept ? 'Loading...' : staffDepartment}</strong>
            </div>
            <p className={styles.lockedNote}>This field is locked based on your credentials.</p>
          </div>
        </section>

        {/* Section: Target Department (Dropdown) */}
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