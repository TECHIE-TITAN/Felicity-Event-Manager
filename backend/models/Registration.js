const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  participantType: { type: String, enum: ['IIIT', 'EXTERNAL'] },
  ticketId: { type: String, unique: true },
  qrCodeUrl: { type: String },
  formResponses: { type: Map, of: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['registered', 'cancelled', 'rejected', 'completed'], default: 'registered' },
  paymentStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
  attendanceMarked: { type: Boolean, default: false },
  attendanceTimestamp: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
