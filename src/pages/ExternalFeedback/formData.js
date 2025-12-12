export const departments = [
  { value: 'General Feedback', label: 'General Feedback' },
  // Official Medical Departments
  { value: 'Anesthesiology', label: 'Anesthesiology' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'Internal Medicine', label: 'Internal Medicine' },
  { value: 'Obstetrics and Gynecology (OB-GYNE)', label: 'Obstetrics and Gynecology (OB-GYNE)' },
  { value: 'Pathology', label: 'Pathology' },
  { value: 'Pediatrics', label: 'Pediatrics' },
  { value: 'Radiology', label: 'Radiology' },
  { value: 'Rehabilitation Medicine', label: 'Rehabilitation Medicine' },
  { value: 'Surgery', label: 'Surgery' },
  // Official Diagnostics & Key Service Units
  { value: 'Dental Clinic', label: 'Dental Clinic' },
  { value: 'Dietary', label: 'Dietary' },
  { value: 'Emergency Room (ER)', label: 'Emergency Room (ER)' },
  { value: 'HeartStation', label: 'HeartStation' },
  { value: 'Hemodialysis', label: 'Hemodialysis' },
  { value: 'Intensive Care Unit (ICU)', label: 'Intensive Care Unit (ICU)' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Neonatal ICU (NICU)', label: 'Neonatal ICU (NICU)' },
  { value: 'Nursing Service', label: 'Nursing Service' },
  { value: 'Operating Room', label: 'Operating Room' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Ultrasound', label: 'Ultrasound' }
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