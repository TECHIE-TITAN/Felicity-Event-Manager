const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const DiscussionMessage = require('../models/DiscussionMessage');
const Registration = require('../models/Registration');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');

// POST /api/discussion/unread-counts - get latest message time for list of events
// Body: { eventIds: [...], lastReadTimes: { eventId: isoString } }
router.post('/unread-counts', protect, async (req, res) => {
  try {
    const { eventIds } = req.body;
    if (!Array.isArray(eventIds) || !eventIds.length) return res.json({});

    // For each eventId, find the latest non-deleted message createdAt
    const results = await DiscussionMessage.aggregate([
      { $match: { eventId: { $in: eventIds.map(id => new (require('mongoose').Types.ObjectId)(id)) }, isDeleted: false } },
      { $group: { _id: '$eventId', latestAt: { $max: '$createdAt' }, count: { $sum: 1 } } }
    ]);

    const map = {};
    results.forEach(r => { map[r._id.toString()] = { latestAt: r.latestAt, count: r.count }; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/discussion/:eventId
router.get('/:eventId', protect, async (req, res) => {
  try {
    const messages = await DiscussionMessage.find({ eventId: req.params.eventId, isDeleted: false })
      .populate('userId', 'email role')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/discussion/:eventId - post message (participant must be registered)
router.post('/:eventId', protect, async (req, res) => {
  try {
    const { messageText, parentMessageId } = req.body;
    const role = req.user.role;

    if (role === 'participant') {
      const participant = await Participant.findOne({ userId: req.user._id });
      const registered = await Registration.findOne({
        eventId: req.params.eventId,
        participantId: participant._id,
        status: 'registered'
      });
      if (!registered) {
        return res.status(403).json({ message: 'Only registered participants can post in the discussion forum' });
      }
    } else if (role !== 'organizer') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const msg = await DiscussionMessage.create({
      eventId: req.params.eventId,
      userId: req.user._id,
      role: role === 'organizer' ? 'organizer' : 'participant',
      messageText,
      parentMessageId: parentMessageId || null
    });

    const populated = await DiscussionMessage.findById(msg._id).populate('userId', 'email role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/discussion/:messageId/pin - organizer pins
router.put('/:messageId/pin', protect, requireRole('organizer'), async (req, res) => {
  try {
    const msg = await DiscussionMessage.findByIdAndUpdate(
      req.params.messageId,
      { isPinned: true },
      { new: true }
    );
    res.json({ message: 'Message pinned', msg });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/discussion/:messageId - organizer deletes
router.delete('/:messageId', protect, requireRole('organizer'), async (req, res) => {
  try {
    await DiscussionMessage.findByIdAndUpdate(req.params.messageId, { isDeleted: true });
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/discussion/:messageId/react - add reaction
router.post('/:messageId/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await DiscussionMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const existing = msg.reactions.find(r => r.userId.toString() === req.user._id.toString() && r.emoji === emoji);
    if (existing) {
      msg.reactions = msg.reactions.filter(r => !(r.userId.toString() === req.user._id.toString() && r.emoji === emoji));
    } else {
      msg.reactions.push({ emoji, userId: req.user._id });
    }
    await msg.save();
    res.json({ message: 'Reaction updated', reactions: msg.reactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
