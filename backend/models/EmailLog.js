const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: { type: String, required: true },
  subject: { type: String },
  type: { type: String, enum: ['ticket', 'registration', 'password_reset', 'merchandise_confirmation', 'otp', 'organizer_credentials'] },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  provider: { type: String, default: 'gmail' },
  metadata: { type: Map, of: String },
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmailLog', emailLogSchema);
