const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['participant', 'organizer', 'admin'], required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
