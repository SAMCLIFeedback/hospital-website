// models/Staff.js
const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true  
  },
  department: { 
    type: String, 
    required: true 
  },
  hasSubmittedThisMonth: { 
    type: Boolean, 
    default: false 
  }
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('Staff', StaffSchema);