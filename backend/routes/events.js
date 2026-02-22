const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const MerchandiseOrder = require('../models/MerchandiseOrder');
const AttendanceLog = require('../models/AttendanceLog');
const DiscussionMessage = require('../models/DiscussionMessage');
const sendDiscordWebhook = require('../utils/discordWebhook');

// GET /api/events - browse/filter (public)
router.get('/', async (req, res) => {
  try {
    const { search, type, eligibility, startDate, endDate, tags, organizerId, status } = req.query;
    let query = { status: { $in: ['published', 'ongoing', 'completed', 'closed'] } };

    if (status && ['published', 'ongoing', 'completed', 'closed', 'draft'].includes(status)) {
      query.status = status;
    }
    if (type) query.type = type;
    if (eligibility) query.eligibility = { $in: [eligibility, 'ALL'] };
    if (organizerId) query.organizerId = organizerId;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    if (tags) {
      const tagArr = tags.split(',');
      query.tags = { $in: tagArr };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .populate('organizerId', 'name category')
      .sort({ createdAt: -1 });

    // Increment page views tracked on individual fetch
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/events/trending
router.get('/trending', async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await Event.find({ status: 'published', createdAt: { $gte: since } })
      .sort({ 'analytics.totalRegistrations': -1 })
      .limit(5)
      .populate('organizerId', 'name category');
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizerId', 'name category description contactEmail');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    // Increment page views
    await Event.findByIdAndUpdate(req.params.id, { $inc: { 'analytics.pageViews': 1 } });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/events - organizer creates event (draft)
router.post('/', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

    const { name, description, type, eligibility, registrationDeadline, startDate, endDate,
            registrationLimit, registrationFee, tags, formSchema, merchandiseVariants, purchaseLimit } = req.body;

    const event = await Event.create({
      organizerId: organizer._id,
      name, description, type, eligibility, registrationDeadline, startDate, endDate,
      registrationLimit, registrationFee, tags, formSchema: formSchema || [],
      merchandiseVariants: merchandiseVariants || [], purchaseLimit,
      status: 'draft'
    });

    res.status(201).json({ message: 'Event created as draft', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/events/:id - organizer updates event
router.put('/:id', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Not your event' });
    }

    if (event.status === 'draft') {
      // Draft: free edit on all fields
      const { name, description, eligibility, registrationDeadline, startDate, endDate,
              registrationLimit, registrationFee, tags, formSchema, merchandiseVariants, purchaseLimit } = req.body;
      if (name !== undefined) event.name = name;
      if (description !== undefined) event.description = description;
      if (eligibility !== undefined) event.eligibility = eligibility;
      if (registrationDeadline !== undefined) event.registrationDeadline = registrationDeadline;
      if (startDate !== undefined) event.startDate = startDate;
      if (endDate !== undefined) event.endDate = endDate;
      if (registrationLimit !== undefined) event.registrationLimit = parseInt(registrationLimit) || 0;
      if (registrationFee !== undefined) event.registrationFee = parseFloat(registrationFee) || 0;
      if (tags !== undefined) event.tags = tags;
      if (formSchema !== undefined) event.formSchema = formSchema;
      if (merchandiseVariants !== undefined) event.merchandiseVariants = merchandiseVariants;
      if (purchaseLimit !== undefined) event.purchaseLimit = parseInt(purchaseLimit) || 1;

    } else if (event.status === 'published') {
      // Published: description, extend deadline, increase limit, update tags; plus variant changes for merch
      const { description, registrationDeadline, registrationLimit, tags, merchandiseVariants } = req.body;
      if (description !== undefined) event.description = description;
      if (tags !== undefined) event.tags = tags;
      if (registrationDeadline) {
        const newDeadline = new Date(registrationDeadline);
        if (!event.registrationDeadline || newDeadline > new Date(event.registrationDeadline)) {
          event.registrationDeadline = newDeadline;
        } else {
          return res.status(400).json({ message: 'Can only extend the registration deadline, not shorten it' });
        }
      }
      if (registrationLimit !== undefined) {
        const newLimit = parseInt(registrationLimit) || 0;
        if (newLimit < (event.analytics?.totalRegistrations || 0)) {
          return res.status(400).json({ message: 'Cannot set limit below current registration count' });
        }
        if (event.registrationLimit > 0 && newLimit < event.registrationLimit) {
          return res.status(400).json({ message: 'Can only increase the registration limit' });
        }
        event.registrationLimit = newLimit;
      }
      if (event.type === 'merchandise' && merchandiseVariants !== undefined) {
        event.merchandiseVariants = merchandiseVariants;
      }

    } else {
      // ongoing / completed / closed — no content edits allowed
      return res.status(400).json({ message: `Events in "${event.status}" status cannot be edited. Only status transitions are allowed.` });
    }

    await event.save();
    res.json({ message: 'Event updated', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/events/:id/publish
router.put('/:id/publish', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Not your event' });
    }
    if (event.status !== 'draft') return res.status(400).json({ message: 'Only draft events can be published' });
    event.status = 'published';
    await event.save();

    // Fire global Discord webhook (non-blocking)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    sendDiscordWebhook({
      title: `🎉 New Event Published: ${event.name}`,
      description: event.description ? event.description.slice(0, 200) + (event.description.length > 200 ? '…' : '') : '',
      color: 0xcc0000,
      fields: [
        { name: 'Organiser', value: organizer.name || 'Unknown', inline: true },
        { name: 'Type', value: event.type || 'normal', inline: true },
        { name: 'Eligibility', value: event.eligibility || 'ALL', inline: true },
        { name: 'Fee', value: event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free', inline: true },
        { name: 'Start Date', value: event.startDate ? new Date(event.startDate).toLocaleDateString('en-IN') : 'TBD', inline: true },
        { name: 'Reg. Deadline', value: event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleDateString('en-IN') : 'TBD', inline: true },
      ],
      url: `${frontendUrl}/events/${event._id}`,
      footer: { text: 'Felicity – Fest Management' },
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Event published', event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/events/:id/status - organizer changes event status
router.put('/:id/status', protect, requireRole('organizer'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['ongoing', 'completed', 'closed'];
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Not your event' });
    }
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    event.status = status;
    await event.save();
    res.json({ message: `Event marked as ${status}`, event });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/events/organizer/mine - organizer's events
router.get('/organizer/mine', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const events = await Event.find({ organizerId: organizer._id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/events/:id - organizer deletes event (cascades all related data)
router.delete('/:id', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Not your event' });
    }

    const eventId = event._id;

    // Remove event from participants' registeredEvents arrays
    await Participant.updateMany(
      { registeredEvents: eventId },
      { $pull: { registeredEvents: eventId } }
    );

    // Cascade delete all related collections
    await Promise.all([
      Registration.deleteMany({ eventId }),
      MerchandiseOrder.deleteMany({ eventId }),
      AttendanceLog.deleteMany({ eventId }),
      DiscussionMessage.deleteMany({ eventId }),
    ]);

    // Delete the event itself
    await Event.findByIdAndDelete(eventId);

    res.json({ message: 'Event and all related data deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
