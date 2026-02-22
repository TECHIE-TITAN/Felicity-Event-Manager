const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  ticketId: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
  manualOverride: { type: Boolean, default: false },
  overrideReason: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);
