// backend/models/BypassLock.js
const mongoose = require('mongoose');

const BypassLockSchema = new mongoose.Schema({
  bypassCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Get the single bypass document (throws clear error if missing)
BypassLockSchema.statics.getInstance = async function () {
  const lock = await this.findOne();
  if (!lock) {
    throw new Error('BypassLock document missing! Run: node insertBypass.js');
  }
  return lock;
};

module.exports = mongoose.model('BypassLock', BypassLockSchema);