import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../assets/css/internalFeedback.module.css';
import DOMPurify from 'dompurify';
import Loader from './Loader.jsx';
import DropdownPortal from './DropdownPortal.jsx';

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

  const departments = {
    'Clinical Services': [
      'Emergency Room (ER)',
      'Anesthesiology',
      'Internal Medicine',
      'Surgery',
      'Pediatrics',
      'Obstetrics and Gynecology (OB-GYNE)',
      'Nursing Service',
      'Intensive Care Unit (ICU)',
      'Neonatal ICU (NICU)',
      'Family Medicine',
    ],
    'Specialty Clinics & Diagnostics': [
      'Cardiology',
      'Nephrology',
      'Dermatology',
      'ENT (Ear, Nose, Throat)',
      'Ophthalmology',
      'Orthopedics',
      'Urology',
      'Rehabilitation Medicine',
      'Hemodialysis',
      'Dental Clinic',
      'Radiology',
      'Pathology',
      'Diagnostics',
      'Physical Therapy',
    ],
    'Support Services': [
      'Pharmacy',
      'Dietary',
      'Inpatient Department',
      'Outpatient Department',
      'Operating Room',
      'BESTHEALTH',
    ]
  };
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
    setErrorMessage(''); // Clear error on input change
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

  const isSubmitDisabled = !formData.confirmTruthful || !formData.consentData;

  const feedbackOptions = [
    {
      value: 'operational',
      icon: '🛠️',
      label: 'Operational Issue',
      desc: 'Equipment malfunctions, workflow inefficiencies',
      color: '#3b82f6'
    },
    {
      value: 'safety',
      icon: '⚠️',
      label: 'Safety Concern',
      desc: 'Protocol violations, potential risks',
      color: '#ef4444'
    },
    {
      value: 'improvement',
      icon: '💡',
      label: 'Improvement Suggestion',
      desc: 'Ideas to enhance processes or care',
      color: '#8b5cf6'
    },
    {
      value: 'recognition',
      icon: '👏',
      label: 'Recognition',
      desc: 'Acknowledge outstanding work',
      color: '#10b981'
    },
    {
      value: 'complaint',
      icon: '😣',
      label: 'Complaint',
      desc: 'A dissatisfaction or issue',
      color: '#dc2626'
    },
    {
      value: 'other',
      icon: '❓',
      label: 'Other',
      desc: 'Something not covered above',
      color: '#6b7280'
    }
  ];

  const impactOptions = [
    { value: 'minor', icon: '😐', label: 'Minor', desc: 'Small inconvenience' },
    { value: 'moderate', icon: '😤', label: 'Moderate', desc: 'Affects workflow' },
    { value: 'critical', icon: '🚨', label: 'Critical', desc: 'Impacts patient care' },
  ];

  const getProgressPercentage = () => {
    let completed = 0;
    const isRecognition = formData.feedbackNature === 'recognition';
    const isAnonymous = formData.isAnonymous;
    const total = isRecognition ? (isAnonymous ? 4 : 5) : (isAnonymous ? 5 : 6);

    if (formData.feedbackNature) completed++;
    if (formData.department && (formData.department !== 'custom' || formData.customDepartment)) completed++;
    if (!isRecognition && formData.impactSeverity) completed++;
    if (formData.description.length >= 50) completed++;
    if (formData.confirmTruthful && formData.consentData) completed++;
    if (!isAnonymous && formData.email) completed++;

    return (completed / total) * 100;
  };

  const isPotentialName = (text) => {
    // Simple check for common department names to avoid false positives
    const departmentNames = Object.values(departments).flat().map(d => d.toLowerCase());
    const words = text.split(/\s+/);
    return words.some(word => 
      /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(word) && 
      !departmentNames.includes(word.toLowerCase())
    );
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
            <span className={styles.securityIcon}>🛡️</span>
            Protected by Hospital Policy | End-to-End Encrypted
          </div>
        </div>
      </div>
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <div className={styles.textContainer}>
          <div className={styles.progressText}>
            {Math.round(getProgressPercentage())}% Complete
          </div>
        </div>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>
              <span className={styles.stepNumber}>1</span>
              What type of feedback do you have?
              <span className={styles.required}>*</span>
            </h2>
            <p className={styles.sectionDescription}>
              Select the category that best describes your concern or suggestion.
            </p>
          </div>

          <div className={styles.radioGrid}>
            {feedbackOptions.map(option => (
              <label key={option.value} className={`${styles.radioCard} ${styles[option.value]}`}>
                <input
                  type="radio"
                  name="feedbackNature"
                  value={option.value}
                  checked={formData.feedbackNature === option.value}
                  onChange={(e) => {
                    handleInputChange('feedbackNature', e.target.value);
                    if (e.target.value === 'recognition') {
                      handleInputChange('impactSeverity', '');
                    }
                  }}
                  className={styles.radioInput}
                  required
                  aria-label={option.label}
                />
                <div className={styles.radioCardContent}>
                  <div className={styles.radioCardIcon} style={{ color: option.color }}>
                    {option.icon}
                  </div>
                  <div className={styles.radioCardText}>
                    <div className={styles.radioCardTitle}>{option.label}</div>
                    {option.desc && <div className={styles.radioCardDesc}>{option.desc}</div>}
                  </div>
                  <div className={styles.radioCardCheck}>✓</div>
                </div>
              </label>
            ))}
          </div>

          {formData.feedbackNature && formData.feedbackNature !== 'recognition' && (
            <div className={styles.conditionalField}>
              <label className={styles.urgentCheckbox}>
                <input
                  type="checkbox"
                  checked={formData.immediateAttention}
                  onChange={(e) => handleInputChange('immediateAttention', e.target.checked)}
                  className={styles.checkbox}
                  aria-label="Requires immediate attention"
                />
                <span className={styles.checkboxCustom} />
                <div className={styles.urgentContent}>
                  <span className={styles.urgentIcon}>🚨</span>
                  <span className={styles.urgentText}>This requires immediate attention</span>
                </div>
              </label>
            </div>
          )}

          {formData.feedbackNature === 'other' && (
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

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>
              <span className={styles.stepNumber}>2</span>
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
                    onClick={() => handleDepartmentSelect('General Feedback')}
                    role="option"
                    aria-selected={formData.department === 'General Feedback'}
                  >
                    <span className={styles.optionIcon}>🏥</span>
                    <div className={styles.optionContent}>
                      <strong>General Feedback</strong>
                      <small>General facility or multi-department feedback</small>
                    </div>
                  </div>

                  {Object.entries(departments).map(([category, depts]) => {
                    const filteredDepts = depts.filter(dept =>
                      dept.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    return filteredDepts.length > 0 && (
                      <div key={category} className={styles.categoryGroup}>
                        <div className={styles.categoryHeader}>
                          <span className={styles.categoryIcon}>📋</span>
                          {category}
                        </div>
                        {filteredDepts.map(dept => (
                          <div
                            key={dept}
                            className={styles.dropdownOption}
                            onClick={() => handleDepartmentSelect(dept)}
                            role="option"
                            aria-selected={formData.department === dept}
                          >
                            <span className={styles.optionIcon}>•</span>
                            <div className={styles.optionContent}>{dept}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  <div
                    className={`${styles.dropdownOption} ${styles.customOption}`}
                    onClick={() => {
                      handleInputChange('department', 'custom');
                      handleInputChange('customDepartment', '');
                      setSearchTerm('');
                      setShowDropdown(false);
                    }}
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
                  aria-required="true"
                />
              </div>
            </div>
          )}
        </section>

        {formData.feedbackNature && formData.feedbackNature !== 'recognition' && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionLabel}>
                <span className={styles.stepNumber}>3</span>
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
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>
              <span className={styles.stepNumber}>{formData.feedbackNature === 'recognition' ? 3 : 4}</span>
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
              placeholder="Please include:
• Specific location or equipment (if applicable)
• When this occurred or was noticed
• What you observed or experienced
• Any suggestions for improvement

Example: 'The hand sanitizer dispenser near Room 205 has been empty for 3 days.'"
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

            {isPotentialName(formData.description) && (
              <div className={styles.warning}>
                <span className={styles.warningIcon}>⚠️</span>
                <span>Use initials or roles instead of full names to protect privacy.</span>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>
              <span className={styles.stepNumber}>{formData.feedbackNature === 'recognition' ? 4 : 5}</span>
              How would you like to submit this?
              <span className={styles.required}>*</span>
            </h2>
            <p className={styles.sectionDescription}>
              Choose whether to submit anonymously or allow follow-up.
            </p>
          </div>

          <div className={styles.anonymityOptions}>
            <label className={styles.anonymityCard}>
              <input
                type="radio"
                name="anonymity"
                checked={formData.isAnonymous}
                onChange={() => handleInputChange('isAnonymous', true)}
                className={styles.radioInput}
                aria-label="Submit anonymously"
              />
              <div className={styles.anonymityCardContent}>
                <div className={styles.anonymityIcon}>👻</div>
                <div className={styles.anonymityText}>
                  <div className={styles.anonymityTitle}>Submit Anonymously</div>
                  <div className={styles.anonymityDesc}>
                    No identifying information stored
                  </div>
                </div>
              </div>
            </label>

            <label className={styles.anonymityCard}>
              <input
                type="radio"
                name="anonymity"
                checked={!formData.isAnonymous}
                onChange={() => handleInputChange('isAnonymous', false)}
                className={styles.radioInput}
                aria-label="Allow follow-up"
              />
              <div className={styles.anonymityCardContent}>
                <div className={styles.anonymityIcon}>👤</div>
                <div className={styles.anonymityText}>
                  <div className={styles.anonymityTitle}>Provide Contact Info</div>
                  <div className={styles.anonymityDesc}>
                    We may contact you for follow-up.
                  </div>
                </div>
              </div>
            </label>
          </div>

          {!formData.isAnonymous && (
            <div className={styles.conditionalField}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Hospital Email Address:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="yourname@hospital.org"
                  className={styles.textInput}
                  required
                  aria-required="true"
                />
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>
              <span className={styles.stepNumber}>{formData.feedbackNature === 'recognition' ? 5 : 6}</span>
              Consent
              <span className={styles.required}>*</span>
            </h2>
            <p className={styles.sectionDescription}>
              Please confirm your agreement.
            </p>
          </div>

          <div className={styles.confirmationGroup}>
            <label className={styles.confirmationItem}>
              <input
                type="checkbox"
                checked={formData.confirmTruthful}
                onChange={(e) => handleInputChange('confirmTruthful', e.target.checked)}
                className={styles.checkbox}
                aria-label="Confirm truthful feedback"
              />
              <span className={styles.checkboxCustom} />
              <div className={styles.confirmationText}>
                <strong>I confirm this is truthful, work-related feedback</strong>
                <span className={styles.required}>*</span>
              </div>
            </label>

            <label className={styles.confirmationItem}>
              <input
                type="checkbox"
                checked={formData.consentData}
                onChange={(e) => handleInputChange('consentData', e.target.checked)}
                className={styles.checkbox}
                aria-label="Consent to data use"
              />
              <span className={styles.checkboxCustom} />
              <div className={styles.confirmationText}>
                <strong>I consent to the use of my data for quality improvement.</strong>
                <span className={styles.required}>*</span>
                <div className={styles.confirmationLinks}>
                  <a href="#" className={styles.link}>Privacy Policy</a> •
                  <a href="#" className={styles.link}>Staff Handbook Section 4.5</a>
                </div>
              </div>
            </label>
          </div>
        </section>

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