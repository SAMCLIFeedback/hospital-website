import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import styles from '@assets/css/ExternalFeedback.module.css';
import Loader from '@components/Loader';
import StepTracker from '@components/StepTracker.jsx';
import RespondentAffiliation from '@sections/ExternalFeedback/RespondentAffiliation.jsx';
import FeedbackType from '@sections/ExternalFeedback/FeedbackType.jsx';
import DepartmentConcerned from '@sections/ExternalFeedback/DepartmentConcerned.jsx';
import {departments, getStepLabels, roleOptions, feedbackTypes} from './formData.js';
import OverallExperienceRating from '@sections/ExternalFeedback/overallExperienceRating.jsx';
import FeedbackDetails from '@sections/ExternalFeedback/FeedbackDetails.jsx';
import SubmissionPreference from '@sections/ExternalFeedback/SubmissionPreference.jsx';
import Consent from '@sections/ExternalFeedback/Consent.jsx';

const ExternalFeedback = () => {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [formData, setFormData] = useState({
    role: '',
    feedbackType: '',
    otherSpecify: '',
    department: '',
    customDepartment: '',
    rating: 0,
    description: '',
    isAnonymous: true,
    email: '',
    phone: '',
    consentAgreed: false,
    reCaptchaToken: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });
  const [completedSteps, setCompletedSteps] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const stepLabels = getStepLabels(formData.isAnonymous);
  const isSubmitDisabled = !formData.consentAgreed || !formData.reCaptchaToken || isSubmitting;

  useEffect(() => {
    const stepsDone = [];
    if (formData.role === 'patient' || formData.role === 'visitor') stepsDone.push(1);

    const hasValidFeedbackType = formData.feedbackType &&
      (formData.feedbackType !== 'other' || formData.otherSpecify.trim());
    if (hasValidFeedbackType) stepsDone.push(2);

    const selectedDepartmentExists =
      formData.department === 'General Feedback' ||
      departments.some((dept) => dept.value === formData.department);

    const hasValidDepartment = formData.department &&
      (selectedDepartmentExists || (formData.department === 'custom' && formData.customDepartment.trim()));

    if (hasValidDepartment) stepsDone.push(3);

    if (formData.rating > 0) stepsDone.push(4);

    if (formData.description.trim()) stepsDone.push(5);

    if (formData.isAnonymous !== undefined) stepsDone.push(6);

    if (formData.isAnonymous === false) {
      if (formData.email.trim()) stepsDone.push(7);
      if (formData.phone.trim()) stepsDone.push(8);
      if (formData.consentAgreed) stepsDone.push(9);
    } else {
      if (formData.consentAgreed) stepsDone.push(7);
    }

    setCompletedSteps(stepsDone);
  }, [formData]);

  useEffect(() => {
    const relevantDepts = departments.filter(dept => dept.value && dept.value !== 'custom' && dept.value !== 'General Feedback');
    if (searchTerm.trim() === '') {
      setFilteredDepartments(relevantDepts);
    } else {
      setFilteredDepartments(
        relevantDepts.filter(
          (dept) => dept.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm]);

  useEffect(() => {
    const handleScroll = () => setShowDropdown(false);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

    const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDepartmentSelect = (departmentValue, departmentLabel) => {
    handleInputChange('department', departmentValue);
    if (departmentValue === 'custom') {
      handleInputChange('customDepartment', '');
      setSearchTerm('');
    } else {
      setSearchTerm(departmentLabel);
    }
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.role ||
      !formData.feedbackType ||
      (formData.feedbackType === 'other' && !formData.otherSpecify.trim()) ||
      !formData.department ||
      (formData.department === 'custom' && !formData.customDepartment.trim()) ||
      !formData.rating ||
      !formData.description.trim() ||
      !formData.consentAgreed
    ) {
      alert('Please complete all required fields before submitting.');
      setIsSubmitting(false);
      setIsNavigating(false);
      return;
    }

    if (!formData.reCaptchaToken) {
        alert('Please verify that you are not a robot.');
        setIsSubmitting(false);
        setIsNavigating(false);
        return;
    }

    setIsSubmitting(true);
    setIsNavigating(true);

    try {
      const response = await fetch(`${BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: formData.role,
          feedbackType: formData.feedbackType === 'other' ? formData.otherSpecify : formData.feedbackType,
          department: formData.department === 'custom' ? formData.customDepartment : formData.department,
          rating: formData.rating,
          description: DOMPurify.sanitize(formData.description),
          isAnonymous: formData.isAnonymous,
          email: formData.isAnonymous ? null : formData.email,
          phone: formData.isAnonymous ? null : formData.phone,
          consentAgreed: formData.consentAgreed,
          reCaptchaToken: formData.reCaptchaToken, 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      navigate('/success', { state: { from: 'external' } });
      setFormData({
        role: '',
        feedbackType: '',
        otherSpecify: '',
        department: '',
        customDepartment: '',
        rating: 0,
        description: '',
        isAnonymous: true,
        email: '',
        phone: '',
        consentAgreed: false,
      });
      setSearchTerm('');
    } catch (error) {
      console.error('Submission error:', error);
      alert(error.message || 'There was an error submitting your feedback. Please try again.');
      setIsNavigating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {isNavigating && <Loader />}
      
      <div className={styles.header}>
        <span role="img" aria-label="Hospital icon" className={styles.iconLarge}> 🤝</span>
        <h1 className={styles.title}>Help Us Serve You Better</h1>
        <p className={styles.subtitle}>Share your experience to help us improve our services.</p>
        <div className={styles.securityBadge}>
          <span className={styles.securityIcon}>🛡️ Your voice matters. Share concerns safely and anonymously.</span>
        </div>
      </div>

      {/* ✅ New Step Tracker */}
      <StepTracker
        completedSteps={completedSteps}
        totalSteps={stepLabels.length}
      />

      <div className={styles.form}>
        <form onSubmit={handleSubmit}>
          <RespondentAffiliation styles={styles} formData={formData} handleInputChange={handleInputChange} roleOptions={roleOptions}/>
          <FeedbackType styles={styles} feedbackTypes={feedbackTypes} formData={formData} handleInputChange={handleInputChange}/>
          <DepartmentConcerned 
            styles={styles} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            inputRef={inputRef} 
            setShowDropdown={setShowDropdown} 
            formData={formData} 
            handleInputChange={handleInputChange} 
            setDropdownCoords={setDropdownCoords} 
            dropdownCoords={dropdownCoords} 
            showDropdown={showDropdown} 
            dropdownRef={dropdownRef} 
            filteredDepartments={filteredDepartments} 
            handleDepartmentSelect={handleDepartmentSelect} 
          />
          <OverallExperienceRating styles={styles} handleInputChange={handleInputChange} formData={formData}/>
          <FeedbackDetails styles={styles} handleInputChange={handleInputChange} formData={formData}/>
          <SubmissionPreference styles={styles} handleInputChange={handleInputChange} formData={formData}/>
          <Consent styles={styles} handleInputChange={handleInputChange} formData={formData}/>

          <div className={styles.submitSection}>
            <button
              type="submit"
              className={`${styles.submitButton} ${isSubmitDisabled ? styles.submitDisabled : ''}`}
              disabled={isSubmitDisabled}
              aria-disabled={isSubmitDisabled}
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
    </div>
  );
};

export default ExternalFeedback;