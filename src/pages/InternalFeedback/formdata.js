export const departments = {
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

export const feedbackOptions = [
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

export const impactOptions = [
  { value: 'minor', icon: '😐', label: 'Minor', desc: 'Small inconvenience' },
  { value: 'moderate', icon: '😤', label: 'Moderate', desc: 'Affects workflow' },
  { value: 'critical', icon: '🚨', label: 'Critical', desc: 'Impacts patient care' },
];
