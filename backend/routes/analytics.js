const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const EventAnalyticsHistory = require('../models/EventAnalyticsHistory');

// GET /api/analytics/event/:eventId
router.get('/event/:eventId', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.eventId);
    if (!event || event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const history = await EventAnalyticsHistory.find({ eventId: event._id }).sort({ date: 1 });
    res.json({ analytics: event.analytics, history });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
