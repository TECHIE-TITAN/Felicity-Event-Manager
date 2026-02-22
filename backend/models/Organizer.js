const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, trim: true },
  organizerType: {
    type: String,
    enum: ['club', 'council', 'fest_team'],
    required: true,
    default: 'club'
  },
  category: { type: String, trim: true },
  description: { type: String, trim: true },
  contactEmail: { type: String, trim: true },
  contactNumber: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Organizer', organizerSchema);
