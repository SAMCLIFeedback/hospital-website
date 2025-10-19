const roleCards = [
  {
      icon: '🏥',
      title: 'Patient/Visitor',
      description: 'Share your experience as a patient or visitor receiving care at our facility.',
      authType: 'none',
      type: 'feedback'
  },
  {
      icon: '🧑‍⚕️',
      title: 'Hospital Staff',
      description: 'Internal feedback from medical professionals and healthcare workers.',
      authType: 'email-pin',
      type: 'feedback'
  },
  {
      icon: '📊',
      title: 'QA Team',
      description: 'Quality assurance team members providing systematic feedback and analysis.',
      authType: 'QA',
      type: 'dashboard'
  },
  {
      icon: '👨‍💼',
      title: 'Department Head',
      description: 'Leadership feedback on departmental operations and strategic improvements.',
      authType: 'deptHead',
      type: 'dashboard'
  },
  {
      icon: '👩‍',
      title: 'Hospital Administrator',
      description: 'View performance metrics and provide executive-level oversight on care quality and operations.',
      authType: 'admin',
      type: 'dashboard'
  },
];

export default roleCards;