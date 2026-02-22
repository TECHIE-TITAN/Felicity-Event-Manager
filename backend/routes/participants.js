const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const Participant = require('../models/Participant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/participants/me
router.get('/me', protect, requireRole('participant'), async (req, res) => {
  try {
    const participant = await Participant.findOne({ userId: req.user._id })
      .populate('followedOrganizers', 'name category description')
      .populate('registeredEvents', 'name type status startDate');
    if (!participant) return res.status(404).json({ message: 'Participant not found' });
    res.json({ user: req.user, participant });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/participants/me
router.put('/me', protect, requireRole('participant'), async (req, res) => {
  const { firstName, lastName, collegeName, contactNumber, interests } = req.body;
  try {
    const participant = await Participant.findOneAndUpdate(
      { userId: req.user._id },
      { firstName, lastName, collegeName, contactNumber, interests },
      { new: true, runValidators: true }
    );
    res.json({ message: 'Profile updated', participant });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/participants/me/password
router.put('/me/password', protect, requireRole('participant'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password incorrect' });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/participants/me/onboarding - save interests + followed organizers, mark onboarding complete
router.put('/me/onboarding', protect, requireRole('participant'), async (req, res) => {
  const { interests, followedOrganizers } = req.body;
  try {
    const participant = await Participant.findOneAndUpdate(
      { userId: req.user._id },
      { interests: interests || [], followedOrganizers: followedOrganizers || [], onboardingComplete: true },
      { new: true, upsert: false }
    ).populate('followedOrganizers', 'name category organizerType');
    if (!participant) return res.status(404).json({ message: 'Participant profile not found. Please contact support.' });
    res.json({ message: 'Onboarding complete', participant });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/participants/me/follow/:organizerId
router.post('/me/follow/:organizerId', protect, requireRole('participant'), async (req, res) => {  try {
    const participant = await Participant.findOne({ userId: req.user._id });
    const alreadyFollowing = participant.followedOrganizers.includes(req.params.organizerId);
    if (alreadyFollowing) {
      participant.followedOrganizers.pull(req.params.organizerId);
    } else {
      participant.followedOrganizers.push(req.params.organizerId);
    }
    await participant.save();
    res.json({ message: alreadyFollowing ? 'Unfollowed' : 'Followed', followed: !alreadyFollowing });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
