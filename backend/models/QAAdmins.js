const mongoose = require('mongoose');

const qaAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
}, { collection: 'qa_admins' });

module.exports = mongoose.model('QAAdmin', qaAdminSchema);