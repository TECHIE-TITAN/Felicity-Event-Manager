const mongoose = require('mongoose');

const orgPasswordResetSchema = new mongoose.Schema({
  organizerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:       { type: String, trim: true, default: '' },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminComment: { type: String, trim: true, default: '' },
  requestedAt:  { type: Date, default: Date.now },
  resolvedAt:   { type: Date },
});

module.exports = mongoose.model('OrganizerPasswordResetRequest', orgPasswordResetSchema);
