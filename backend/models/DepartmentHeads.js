const mongoose = require('mongoose');

const departmentHeadSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true }
}, { collection: 'department_heads' }); // 👈 Force correct collection name

module.exports = mongoose.model('DepartmentHead', departmentHeadSchema);
