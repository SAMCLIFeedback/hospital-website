// models/PatientToken.js
const mongoose = require('mongoose');

const PatientTokenSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  type: {
    type: String,
    enum: ['patient', 'visitor', 'admin'],
    required: true
  },
  used: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date,
    default: Date.now 
  },
  usedAt: { 
    type: Date,
    default: null 
  },
  feedbackId: { 
    type: mongoose.Schema.Types.ObjectId, 
    default: null 
  }
}, { versionKey: false });

module.exports = mongoose.model('PatientToken', PatientTokenSchema);