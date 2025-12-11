const mongoose = require('mongoose');

const InternalFeedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  source: { type: String, required: true },
  feedbackType: { type: String, required: true },
  impactSeverity: { type: String, default: null },
  description: { type: String, required: true },
  isAnonymous: { type: Boolean, default: true },
  email: { type: String, default: null },
  // Target Department: "Which department is this about?"
  department: { type: String, required: true },
  // <--- NEW FIELD ADDED HERE --->
  // Source Department: "This feedback is coming from:"
  sourceDepartment: { type: String, required: true }, 
  sentiment: { type: String, default: null },
  sentiment_status: { type: String, default: 'pending' },
  sentiment_attempts: { type: Number, default: 0 },
  sentiment_error: { type: String, default: null },
  date: { type: String, required: true },
  urgent: { type: Boolean, default: false },
  status: { type: String, default: 'pending' },
  reportDetails: { type: String, default: null },
  reportCreatedAt: { type: Date, default: null },
  dept_status: { type: String, default: null },
  finalActionDescription: { type: String, default: null },
  revisionNotes: { type: String, default: null },
  adminNotes: { type: String, default: null },
  actionHistory: [{
    action: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: Date, required: true },
    details: { type: String, default: '' },
  }],
}, { versionKey: false });

module.exports = mongoose.model('InternalFeedback', InternalFeedbackSchema);