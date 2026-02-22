const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true },
  actionType: { type: String, enum: ['captcha_fail', 'blocked', 'unblocked', 'login_attempt', 'rate_limit_block'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SecurityLog', securityLogSchema);
