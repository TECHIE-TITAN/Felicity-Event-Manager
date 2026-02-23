const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Participant = require('../models/Participant');
const OTP = require('../models/OTP');
const SecurityLog = require('../models/SecurityLog');
const sendEmail = require('../utils/sendEmail');
const verifyCaptcha = require('../middleware/captcha');

// Helper: generate JWT
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/register
// No server-side captcha check here — Render cold-start (~50s) causes reCAPTCHA tokens to
// expire before the request reaches Google's verify API. Email OTP is the anti-abuse gate
// for registration. Captcha is still enforced on /login (brute-force risk).
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, participantType, collegeName, contactNumber, interests } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    if (participantType === 'IIIT') {
      const iiitDomains = ['iiit.ac.in', 'students.iiit.ac.in', 'research.iiit.ac.in'];
      const domain = email.split('@')[1];
      if (!iiitDomains.some(d => domain && domain.endsWith(d))) {
        return res.status(400).json({ message: 'IIIT participants must use an IIIT email domain' });
      }
    }

    const hashed = await bcrypt.hash(password, 12);

    // Create user first — we may need to roll it back if anything below fails
    const user = await User.create({ role: 'participant', email, password: hashed, isEmailVerified: false });

    try {
      await Participant.create({ userId: user._id, firstName, lastName, participantType, collegeName, contactNumber, interests: interests || [] });

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await OTP.deleteMany({ email });
      await OTP.create({ email, otp, expiresAt });

      await sendEmail({
        to: email,
        subject: 'Felicity – Verify Your Email',
        html: `<div style="font-family:Arial;background:#000;color:#fff;padding:30px;border-radius:0;border:2px solid #cc0000"><h2 style="color:#cc0000">Felicity</h2><p>Your OTP for email verification is:</p><h1 style="color:#cc0000;letter-spacing:8px">${otp}</h1><p>Valid for 10 minutes.</p></div>`,
        type: 'otp',
        metadata: { email }
      });

      res.status(201).json({ message: 'Registration successful. Check your email for OTP.' });
    } catch (innerErr) {
      // Roll back: delete the user (and participant if it was created) so the email stays free to register again
      await User.findByIdAndDelete(user._id);
      await Participant.findOneAndDelete({ userId: user._id });
      await OTP.deleteMany({ email });
      console.error('Registration rolled back due to error:', innerErr.message);
      throw innerErr; // bubble up to outer catch for the 500 response
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed. Please try again.', error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyCaptcha, async (req, res) => {
  const { email, otp } = req.body;
  try {
    const record = await OTP.findOne({ email, otp });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    await User.findOneAndUpdate({ email }, { isEmailVerified: true });
    await OTP.deleteMany({ email });
    res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/login-after-verify
// No captcha — user already passed captcha during registration.
// Requires the account to be freshly verified (isEmailVerified: true).
router.post('/login-after-verify', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Email not verified' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, role: user.role, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'Email already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.deleteMany({ email });
    await OTP.create({ email, otp, expiresAt });

    await sendEmail({
      to: email,
      subject: 'Felicity – New OTP',
      html: `<div style="font-family:Arial;background:#000;color:#fff;padding:30px;border:2px solid #cc0000"><h2 style="color:#cc0000">Felicity</h2><p>New OTP:</p><h1 style="color:#cc0000;letter-spacing:8px">${otp}</h1><p>Valid for 10 minutes.</p></div>`,
      type: 'otp',
      metadata: { email }
    });
    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', verifyCaptcha, async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      await SecurityLog.create({ ipAddress: ip, actionType: 'login_attempt' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await SecurityLog.create({ ipAddress: ip, actionType: 'login_attempt', userId: user._id });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email first', requiresVerification: true, email });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, role: user.role, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/forgot-password (participants only)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email, role: 'participant' });
    if (!user) return res.status(404).json({ message: 'No participant account with this email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.deleteMany({ email });
    await OTP.create({ email, otp, expiresAt });

    await sendEmail({
      to: email,
      subject: 'Felicity – Password Reset OTP',
      html: `<div style="font-family:Arial;background:#000;color:#fff;padding:30px;border:2px solid #cc0000"><h2 style="color:#cc0000">Felicity</h2><p>Your password reset OTP:</p><h1 style="color:#cc0000;letter-spacing:8px">${otp}</h1><p>Valid for 10 minutes.</p></div>`,
      type: 'password_reset',
      metadata: { email }
    });
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const record = await OTP.findOne({ email, otp });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findOneAndUpdate({ email }, { password: hashed });
    await OTP.deleteMany({ email });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
