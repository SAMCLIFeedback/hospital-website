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
  }
];

export default roleCards;