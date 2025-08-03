import React, { useState, useEffect, useRef } from 'react';
import styles from '../assets/css/ExternalFeedback.module.css';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Loader from './Loader.jsx';
import DropdownPortal from './DropdownPortal.jsx';
import StepTracker from './StepTracker.jsx'; // ✅ Import the new tracker

const departments = [
  { value: 'General Feedback', label: 'General Feedback' },
  { value: 'Anesthesiology', label: 'Anesthesiology' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'Internal Medicine', label: 'Internal Medicine' },
  { value: 'Obstetrics and Gynecology (OB-GYNE)', label: 'Obstetrics and Gynecology (OB-GYNE)' },
  { value: 'Pediatrics', label: 'Pediatrics' },
  { value: 'Radiology', label: 'Radiology' },
  { value: 'Rehabilitation Medicine', label: 'Rehabilitation Medicine' },
  { value: 'Surgery', label: 'Surgery' },
  { value: 'Pathology', label: 'Pathology' },
  { value: 'Urology', label: 'Urology' },
  { value: 'Nephrology', label: 'Nephrology' },
  { value: 'Orthopedics', label: 'Orthopedics' },
  { value: 'Ophthalmology', label: 'Ophthalmology' },
  { value: 'ENT (Ear, Nose, Throat)', label: 'ENT (Ear, Nose, Throat)' },
  { value: 'Family Medicine', label: 'Family Medicine' },
  { value: 'BESTHEALTH', label: 'BESTHEALTH' },
  { value: 'Dental Clinic', label: 'Dental Clinic' },
  { value: 'Diagnostics', label: 'Diagnostics' },
  { value: 'Dietary', label: 'Dietary' },
  { value: 'Emergency Room (ER)', label: 'Emergency Room (ER)' },
  { value: 'Hemodialysis', label: 'Hemodialysis' },
  { value: 'Intensive Care Unit (ICU)', label: 'Intensive Care Unit (ICU)' },
  { value: 'Inpatient Department', label: 'Inpatient Department' },
  { value: 'Neonatal ICU (NICU)', label: 'Neonatal ICU (NICU)' },
  { value: 'Nursing Service', label: 'Nursing Service' },
  { value: 'Operating Room', label: 'Operating Room' },
  { value: 'Outpatient Department', label: 'Outpatient Department' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Physical Therapy', label: 'Physical Therapy' },
  { value: 'custom', label: "Other (My department isn't listed)" }
];


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
  });

  const [hoveredStar, setHoveredStar] = useState(0);
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

  const stepLabels = [
    'Role',
    'Feedback Type',
    'Department',
    'Rating',
    'Details',
    'Submit As',
    ...(formData.isAnonymous ? [] : ['Email', 'Phone']),
    'Consent',
  ];

  const roleOptions = [
    { value: '', label: 'Select your role...' },
    { value: 'patient', label: 'Patient' },
    { value: 'visitor', label: 'Visitor' },
  ];

  const feedbackTypes = [
    { value: 'complaint', label: 'Complaint', icon: '🤬', description: 'e.g., long wait times, staff behavior', color: '#ef4444' },
    { value: 'suggestion', label: 'Suggestion', icon: '🤔', description: 'e.g., process improvements', color: '#8b5cf6' },
    { value: 'compliment', label: 'Compliment', icon: '🤗', description: 'e.g., exceptional care', color: '#10b981' },
    { value: 'other', icon: '❓', label: 'Other', description: 'Something not covered above', color: '#6b7280' }
  ];

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Average',
    4: 'Good',
    5: 'Excellent'
  };

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

  useEffect(() => {
    const stepsDone = [];

    // Step 1: Role
    if (formData.role === 'patient' || formData.role === 'visitor') stepsDone.push(1);

    // Step 2: Feedback type
    const hasValidFeedbackType = formData.feedbackType &&
      (formData.feedbackType !== 'other' || formData.otherSpecify.trim());
    if (hasValidFeedbackType) stepsDone.push(2);

    // Step 3: Department
    const selectedDepartmentExists =
      formData.department === 'General Feedback' ||
      departments.some((dept) => dept.value === formData.department);

    const hasValidDepartment = formData.department &&
      (selectedDepartmentExists || (formData.department === 'custom' && formData.customDepartment.trim()));

    if (hasValidDepartment) stepsDone.push(3);


    // Step 4: Rating
    if (formData.rating > 0) stepsDone.push(4);

    // Step 5: Description
    if (formData.description.trim()) stepsDone.push(5);

    // Step 6: Submit as anonymous / not
    if (formData.isAnonymous !== undefined) stepsDone.push(6);

    let nextStep = 7;

    // Step 7–8: Email & Phone if NOT anonymous
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
          consentAgreed: formData.consentAgreed
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

  const isSubmitDisabled = !formData.consentAgreed || isSubmitting;

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

          <section className={`${styles.section} ${styles.fadeInUp}`}>
            <div className={styles.sectionHeader}>
              <label htmlFor="feedbackType" className={styles.sectionLabel}>
                <span className={styles.stepNumber}>2</span> What type of feedback do you have?
                <span className={styles.required}>*</span>
              </label>
              <p className={styles.sectionDescription}>Select the category that best describes your concern or suggestion.</p>
            </div>
            <div className={styles.radioGrid}>
              {feedbackTypes.map((type) => (
                <label key={type.value} className={styles.radioCard}>
                  <input
                    type="radio"
                    name="feedbackType"
                    value={type.value}
                    checked={formData.feedbackType === type.value}
                    onChange={(e) => handleInputChange('feedbackType', e.target.value)}
                    className={styles.radioInput}
                    required
                  />
                  <div className={styles.radioCardContent}>
                    <span className={styles.radioCardIcon} style={{ color: type.color }}>{type.icon}</span>
                    <div className={styles.radioCardText}>
                      <span className={styles.radioCardTitle}>{type.label}</span>
                      <br />
                      <small className={styles.radioCardDesc}>{type.description}</small>
                    </div>
                    <span className={styles.radioCardCheck}>✓</span>
                  </div>
                </label>
              ))}
            </div>
            {formData.feedbackType === 'other' && (
              <div className={styles.conditionalField}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Please specify:</label>
                  <input
                    type="text"
                    maxLength="40"
                    value={formData.otherSpecify}
                    onChange={(e) => handleInputChange('otherSpecify', e.target.value)}
                    className={styles.textInput}
                    placeholder="Briefly describe the nature of your feedback..."
                    required
                    aria-required="true"
                  />
                </div>
              </div>
            )}
          </section>
          
          <section className={`${styles.section} ${styles.fadeInUp}`}>
             <div className={styles.sectionHeader}>
                <h2 className={styles.sectionLabel}>
                <span className={styles.stepNumber}>3</span>
                Which department is this about?
                <span className={styles.required}>*</span>
                </h2>
                <p className={styles.sectionDescription}>
                Select the department or service your feedback relates to.
                </p>
            </div>

            <div className={styles.dropdownContainer} ref={dropdownRef}>
                <div className={styles.searchInputContainer}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                        if (formData.department) {
                            handleInputChange('department', '');
                        }
                    }}
                    onFocus={() => {
                        const rect = inputRef.current.getBoundingClientRect();
                        setDropdownCoords({
                            top: rect.bottom + window.scrollY,
                            left: rect.left,
                            width: rect.width,
                        });
                        setShowDropdown(true);
                    }}
                    placeholder="Search departments or select from list..."
                    className={styles.searchInput}
                    required={formData.department !== 'custom'}
                    aria-controls="department-dropdown"
                    aria-autocomplete="list"
                />
                </div>

                {showDropdown && (
                <DropdownPortal>
                    <div
                    className={styles.dropdown}
                    style={{
                        position: 'absolute',
                        top: dropdownCoords.top,
                        left: dropdownCoords.left,
                        width: dropdownCoords.width,
                        zIndex: 9999
                    }}
                    ref={dropdownRef}
                    id="department-dropdown"
                    role="listbox"
                    >
                    <div
                        className={styles.dropdownOption}
                        onClick={() => handleDepartmentSelect('General Feedback', 'General Feedback')}
                        role="option"
                        aria-selected={formData.department === 'General Feedback'}
                    >
                        <span className={styles.optionIcon}>🏥</span>
                        <div className={styles.optionContent}>
                        <strong>General Feedback</strong>
                        <small>General facility or multi-department feedback</small>
                        </div>
                    </div>

                    {filteredDepartments.map(dept => (
                        <div
                        key={dept.value}
                        className={styles.dropdownOption}
                        onClick={() => handleDepartmentSelect(dept.value, dept.label)}
                        role="option"
                        aria-selected={formData.department === dept.value}
                        >
                        <span className={styles.optionIcon}>•</span>
                        <div className={styles.optionContent}>{dept.label}</div>
                        </div>
                    ))}

                    <div
                        className={`${styles.dropdownOption} ${styles.customOption}`}
                        onClick={() => handleDepartmentSelect('custom', 'Other (My department isn’t listed)')}
                        role="option"
                        aria-selected={formData.department === 'custom'}
                    >
                        <span className={styles.optionIcon}>✏️</span>
                        <div className={styles.optionContent}>
                        <strong>My department isn't listed</strong>
                        <small>Specify a custom department or unit</small>
                        </div>
                    </div>
                    </div>
                </DropdownPortal>
                )}
            </div>

            {formData.department === 'custom' && (
                <div className={styles.conditionalField}>
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Department/Unit Name:</label>
                    <input
                    type="text"
                    value={formData.customDepartment}
                    onChange={(e) => handleInputChange('customDepartment', e.target.value)}
                    placeholder="Please specify your unit or department..."
                    className={styles.textInput}
                    required
                    />
                </div>
                </div>
            )}
          </section>

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

          <section className={`${styles.section} ${styles.fadeInUp}`}>
            <div className={styles.sectionHeader}>
              <label className={styles.sectionLabel}>
                <span className={styles.stepNumber}>6</span> How would you like to submit this?
                <span className={styles.required}>*</span>
              </label>
              <p className={styles.sectionDescription}>
                Choose whether to submit anonymously or allow follow-up.
              </p>
            </div>
            <div className={styles.radioGrid}>
              <label className={styles.radioCard}>
                <input
                  type="radio"
                  name="isAnonymous"
                  value="true"
                  checked={formData.isAnonymous === true}
                  onChange={() => handleInputChange('isAnonymous', true)}
                  className={styles.radioInput}
                />
                <div className={styles.radioCardContent}>
                  <span className={styles.radioCardIcon}>👻</span>
                  <div className={styles.radioCardText}>
                    <span className={styles.radioCardTitle}>Submit Anonymously</span>
                    <br />
                    <small className={styles.radioCardDesc}>No identifying information stored</small>
                  </div>
                  <span className={styles.radioCardCheck}>✓</span>
                </div>
              </label>
              <label className={styles.radioCard}>
                <input
                  type="radio"
                  name="isAnonymous"
                  value="false"
                  checked={formData.isAnonymous === false}
                  onChange={() => handleInputChange('isAnonymous', false)}
                  className={styles.radioInput}
                />
                <div className={styles.radioCardContent}>
                  <span className={styles.radioCardIcon}>👤</span>
                  <div className={styles.radioCardText}>
                    <span className={styles.radioCardTitle}>Provide Contact Info</span>
                    <br />
                    <small className={styles.radioCardDesc}>We may contact you for follow-up.</small>
                  </div>
                  <span className={styles.radioCardCheck}>✓</span>
                </div>
              </label>
            </div>
            {!formData.isAnonymous && (
              <div className={`${styles.conditionalField} ${formData.isAnonymous ? '' : styles.visible}`}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email" className={styles.inputLabel}>Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={styles.textInput}
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                  <label htmlFor="phone" className={styles.inputLabel}>Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className={styles.textInput}
                    placeholder="Phone (optional, SMS updates)"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
          </section>

          <section className={`${styles.section} ${styles.fadeInUp}`}>
            <div className={styles.sectionHeader}>
              <label htmlFor="consent" className={styles.sectionLabel}>
                <span className={styles.stepNumber}>7</span> Consent
                <span className={styles.required}>*</span>
              </label>
              <p className={styles.sectionDescription}>Please confirm your agreement.</p>
            </div>
            <div className={styles.confirmationGroup}>
                <label className={styles.confirmationItem}>
                    <input
                    type="checkbox"
                    id="consent"
                    className={styles.checkbox}
                    checked={formData.consentAgreed}
                    onChange={(e) => handleInputChange('consentAgreed', e.target.checked)}
                    required
                    />
                    <span className={styles.checkboxCustom} />
                    <div className={styles.confirmationText}>
                    <strong>I agree to have my feedback used to improve hospital services.</strong>
                    <span className={styles.required}>*</span>
                     <div className={styles.confirmationLinks}>
                        <a href="#privacy" className={styles.link}>Privacy Policy</a>
                    </div>
                    </div>
              </label>
            </div>
          </section>

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