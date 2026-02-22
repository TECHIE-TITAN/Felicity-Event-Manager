const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  participantType: { type: String, enum: ['IIIT', 'EXTERNAL'], required: true },
  collegeName: { type: String, trim: true },
  contactNumber: { type: String, trim: true },
  interests: [{ type: String }],
  followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }],
  registeredEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  onboardingComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Participant', participantSchema);
