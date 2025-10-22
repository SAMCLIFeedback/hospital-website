export const departments = [
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

export const getStepLabels = (isAnonymous) => [
  'Role',
  'Feedback Type',
  'Department',
  'Rating',
  'Details',
  'Submit As',
  ...(isAnonymous ? [] : ['Email', 'Phone']),
  'Consent',
];

export const roleOptions = [
    { value: '', label: 'Select your role...' },
    { value: 'patient', label: 'Patient' },
    { value: 'visitor', label: 'Visitor' },
  ];

export const feedbackTypes = [
    { value: 'complaint', label: 'Complaint', icon: '🤬', description: 'e.g., long wait times, staff behavior', color: '#ef4444' },
    { value: 'suggestion', label: 'Suggestion', icon: '🤔', description: 'e.g., process improvements', color: '#8b5cf6' },
    { value: 'compliment', label: 'Compliment', icon: '🤗', description: 'e.g., exceptional care', color: '#10b981' },
    { value: 'other', icon: '❓', label: 'Other', description: 'Something not covered above', color: '#6b7280' }
  ];

export const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Average',
    4: 'Good',
    5: 'Excellent'
  };