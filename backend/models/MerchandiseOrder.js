const mongoose = require('mongoose');

const merchandiseOrderSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  participantType: { type: String, enum: ['IIIT', 'EXTERNAL'] },
  variantsSelected: [{ variantId: mongoose.Schema.Types.ObjectId, size: String, color: String }],
  quantity: { type: Number, default: 1 },
  revenueAmount: { type: Number, default: 0 },
  paymentProofUrl: { type: String },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  ticketId: { type: String },
  qrCodeUrl: { type: String },
  attendanceMarked: { type: Boolean, default: false },
  attendanceTimestamp: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('MerchandiseOrder', merchandiseOrderSchema);
