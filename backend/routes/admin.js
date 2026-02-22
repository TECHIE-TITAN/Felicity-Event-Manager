const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { protect, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const SecurityLog = require('../models/SecurityLog');
const OTP = require('../models/OTP');
const OrganizerPasswordResetRequest = require('../models/OrganizerPasswordResetRequest');
const sendEmail = require('../utils/sendEmail');

// POST /api/admin/organizers - create organizer
router.post('/organizers', protect, requireRole('admin'), async (req, res) => {
  const { name, organizerType, category, description, contactNumber } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Organization name is required' });
  }
  if (!organizerType || !['club', 'council', 'fest_team'].includes(organizerType)) {
    return res.status(400).json({ message: 'organizerType must be club, council, or fest_team' });
  }
  try {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${uuidv4().split('-')[0]}@felicity.ac.in`;
    const rawPassword = uuidv4().split('-')[0] + 'Fel!';
    const hashed = await bcrypt.hash(rawPassword, 12);

    const user = await User.create({ role: 'organizer', email, password: hashed, isEmailVerified: true });
    const organizer = await Organizer.create({ userId: user._id, name, organizerType, category, description, contactNumber, isActive: true });

    // No email is sent — credentials are displayed to admin on screen only
    res.status(201).json({ message: 'Organizer created', organizer, loginEmail: email, password: rawPassword });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/organizers
router.get('/organizers', protect, requireRole('admin'), async (req, res) => {
  try {
    const organizers = await Organizer.find().populate('userId', 'email isEmailVerified lastLogin createdAt');
    res.json(organizers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/organizers/:id/reset-password
router.put('/organizers/:id/reset-password', protect, requireRole('admin'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
    const rawPassword = uuidv4().split('-')[0] + 'Fel!';
    const hashed = await bcrypt.hash(rawPassword, 12);
    await User.findByIdAndUpdate(organizer.userId, { password: hashed });
    // No email sent — new password returned to admin on screen only
    res.json({ message: 'Password reset', newPassword: rawPassword });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/organizers/:id/toggle-active
router.put('/organizers/:id/toggle-active', protect, requireRole('admin'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
    organizer.isActive = !organizer.isActive;
    await organizer.save();
    await User.findByIdAndUpdate(organizer.userId, { isEmailVerified: organizer.isActive });
    res.json({ message: `Organizer ${organizer.isActive ? 'activated' : 'disabled'}`, organizer });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/organizers/:id
router.delete('/organizers/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
    await User.findByIdAndDelete(organizer.userId);
    await Organizer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Organizer permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/security-logs
router.get('/security-logs', protect, requireRole('admin'), async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    let query = {};
    if (type) query.actionType = type;
    const logs = await SecurityLog.find(query)
      .populate('userId', 'email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/admin/security-logs/block
router.post('/security-logs/block', protect, requireRole('admin'), async (req, res) => {
  const { ipAddress, reason } = req.body;
  try {
    await SecurityLog.create({ ipAddress, actionType: 'blocked', userId: null, reason: reason || '' });
    res.json({ message: `IP ${ipAddress} blocked` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/security-logs/block/:ip - unblock an IP
router.delete('/security-logs/block/:ip', protect, requireRole('admin'), async (req, res) => {
  const ipAddress = decodeURIComponent(req.params.ip);
  try {
    await SecurityLog.deleteMany({ ipAddress, actionType: 'blocked' });
    await SecurityLog.create({ ipAddress, actionType: 'unblocked', userId: null, reason: 'Manually unblocked by admin' });
    res.json({ message: `IP ${ipAddress} unblocked` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/admin/captcha-fail (called from login middleware)
router.post('/captcha-fail', async (req, res) => {
  const { ipAddress } = req.body;
  try {
    await SecurityLog.create({ ipAddress, actionType: 'captcha_fail' });
    res.json({ message: 'Logged' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/password-reset-requests - list organizer password reset requests
router.get('/password-reset-requests', protect, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query; // optional filter: pending, approved, rejected, all
    const filter = status && status !== 'all' ? { status } : {};
    const requests = await OrganizerPasswordResetRequest.find(filter)
      .populate({ path: 'organizerId', select: 'name organizerType category' })
      .populate({ path: 'userId', select: 'email role' })
      .sort({ requestedAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/admin/password-reset-requests/:id/approve
router.post('/password-reset-requests/:id/approve', protect, requireRole('admin'), async (req, res) => {
  try {
    const request = await OrganizerPasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already resolved' });

    const rawPassword = uuidv4().split('-')[0] + 'Fel!';
    const hashed = await bcrypt.hash(rawPassword, 12);
    await User.findByIdAndUpdate(request.userId, { password: hashed });

    request.status = 'approved';
    request.resolvedAt = new Date();
    request.adminComment = req.body.adminComment || '';
    await request.save();

    // No email sent — new password returned to admin on screen only
    res.json({ message: 'Password reset approved', newPassword: rawPassword });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/admin/password-reset-requests/:id/reject
router.post('/password-reset-requests/:id/reject', protect, requireRole('admin'), async (req, res) => {
  try {
    const request = await OrganizerPasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already resolved' });

    request.status = 'rejected';
    request.resolvedAt = new Date();
    request.adminComment = req.body.adminComment || '';
    await request.save();

    res.json({ message: 'Password reset request rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/password-reset-requests/:id - manually clear a request
router.delete('/password-reset-requests/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await OrganizerPasswordResetRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
