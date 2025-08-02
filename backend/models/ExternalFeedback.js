const mongoose = require('mongoose');

const ExternalFeedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  source: { type: String, required: true },
  feedbackType: { type: String, required: true },
  department: { type: String, required: true },
  rating: { type: Number, required: true },
  description: { type: String, required: true },
  isAnonymous: { type: Boolean, default: true },
  email: { type: String, default: null },
  phone: { type: String, default: null },
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
    action: { type: String, required: true }, // e.g., 'Feedback Submitted', 'Report Assigned', 'Tagged as Spam', 'Restored', 'Escalated'
    user: { type: String, required: true }, // QA user's name
    timestamp: { type: Date, required: true },
    details: { type: String, default: '' }, // Additional details, e.g., 'Assigned to: Cardiology'
  }],
}, { versionKey: false });

module.exports = mongoose.model('ExternalFeedback', ExternalFeedbackSchema);