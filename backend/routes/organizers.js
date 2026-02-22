const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const OrganizerPasswordResetRequest = require('../models/OrganizerPasswordResetRequest');

// ─── SPECIFIC / AUTHENTICATED ROUTES FIRST (must come before /:id wildcard) ───

// GET /api/organizers - list all organizers (public)
router.get('/', async (req, res) => {
  try {
    const organizers = await Organizer.find({ isActive: true }).select('-discordWebhook');
    res.json(organizers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/organizers/me/profile - organizer's own profile
router.get('/me/profile', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    res.json({ user: req.user, organizer });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/organizers/me/profile
router.put('/me/profile', protect, requireRole('organizer'), async (req, res) => {
  const { name, category, description, contactEmail, contactNumber } = req.body;
  try {
    const organizer = await Organizer.findOneAndUpdate(
      { userId: req.user._id },
      { name, category, description, contactEmail, contactNumber },
      { new: true }
    );
    res.json({ message: 'Profile updated', organizer });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/organizers/me/request-password-reset
// Organizer submits a password reset request for admin to approve. No email sent.
router.post('/me/request-password-reset', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const existing = await OrganizerPasswordResetRequest.findOne({ organizerId: organizer._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending password reset request. Please wait for admin to review it.' });
    }

    const { reason } = req.body;
    await OrganizerPasswordResetRequest.create({
      organizerId: organizer._id,
      userId: req.user._id,
      reason: reason || '',
    });

    res.status(201).json({ message: 'Password reset request submitted. Admin will review it shortly.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/organizers/me/password-reset-history
router.get('/me/password-reset-history', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const history = await OrganizerPasswordResetRequest.find({ organizerId: organizer._id })
      .sort({ requestedAt: -1 })
      .select('reason status adminComment requestedAt resolvedAt');

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/organizers/request-password-reset-public
// Unauthenticated endpoint for organizers who forgot their password (from login page)
router.post('/request-password-reset-public', async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const User = require('../models/User');
    const user = await User.findOne({ email, role: 'organizer' });
    if (!user) return res.status(404).json({ message: 'No organiser account found with this email' });

    const organizer = await Organizer.findOne({ userId: user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const existing = await OrganizerPasswordResetRequest.findOne({ organizerId: organizer._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'A pending reset request already exists for this account. Please wait for admin to review it.' });
    }

    await OrganizerPasswordResetRequest.create({
      organizerId: organizer._id,
      userId: user._id,
      reason: reason || '',
    });

    res.status(201).json({ message: 'Password reset request submitted. The admin will review it and provide you with a new password.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── WILDCARD ROUTE LAST ────────────────────────────────────────────────────

// GET /api/organizers/:id  (public)
router.get('/:id', async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).select('-discordWebhook');
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const now = new Date();
    const upcoming = await Event.find({ organizerId: organizer._id, status: 'published', startDate: { $gte: now } });
    const past = await Event.find({ organizerId: organizer._id, status: { $in: ['completed', 'closed'] } });

    res.json({ organizer, upcoming, past });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

