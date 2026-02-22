const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const Registration = require('../models/Registration');
const MerchandiseOrder = require('../models/MerchandiseOrder');
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const AttendanceLog = require('../models/AttendanceLog');

// POST /api/attendance/scan - QR scan (handles both normal registrations and merchandise orders)
router.post('/scan', protect, requireRole('organizer'), async (req, res) => {
  try {
    const { ticketData } = req.body;
    let ticketId;
    try {
      const parsed = JSON.parse(ticketData);
      ticketId = parsed.ticketId;
    } catch {
      ticketId = ticketData;
    }

    const organizer = await Organizer.findOne({ userId: req.user._id });

    // Try normal registration first
    const registration = await Registration.findOne({ ticketId });
    if (registration) {
      if (registration.attendanceMarked) {
        return res.status(400).json({ message: 'Attendance already marked for this ticket', duplicate: true });
      }
      const event = await Event.findById(registration.eventId);
      if (event.organizerId.toString() !== organizer._id.toString()) {
        return res.status(403).json({ message: 'This ticket is not for your event' });
      }
      registration.attendanceMarked = true;
      registration.attendanceTimestamp = new Date();
      await registration.save();
      await AttendanceLog.create({
        eventId: registration.eventId,
        participantId: registration.participantId,
        ticketId,
        scannedAt: new Date(),
        scannedBy: organizer._id,
        manualOverride: false
      });
      await Event.findByIdAndUpdate(registration.eventId, { $inc: { 'analytics.attendanceCount': 1 } });
      return res.json({ message: 'Attendance marked successfully', registration });
    }

    // Try merchandise order
    const order = await MerchandiseOrder.findOne({ ticketId });
    if (order) {
      if (order.approvalStatus !== 'approved') {
        return res.status(400).json({ message: 'Order is not approved — cannot mark attendance' });
      }
      if (order.attendanceMarked) {
        return res.status(400).json({ message: 'Attendance already marked for this ticket', duplicate: true });
      }
      const event = await Event.findById(order.eventId);
      if (event.organizerId.toString() !== organizer._id.toString()) {
        return res.status(403).json({ message: 'This ticket is not for your event' });
      }
      order.attendanceMarked = true;
      order.attendanceTimestamp = new Date();
      await order.save();
      await AttendanceLog.create({
        eventId: order.eventId,
        participantId: order.participantId,
        ticketId,
        scannedAt: new Date(),
        scannedBy: organizer._id,
        manualOverride: false
      });
      await Event.findByIdAndUpdate(order.eventId, { $inc: { 'analytics.attendanceCount': 1 } });
      return res.json({ message: 'Merchandise attendance marked successfully', order });
    }

    return res.status(404).json({ message: 'Invalid ticket — not found in registrations or merchandise orders' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/attendance/manual - manual override (handles both types)
router.post('/manual', protect, requireRole('organizer'), async (req, res) => {
  try {
    const { ticketId, overrideReason } = req.body;
    const organizer = await Organizer.findOne({ userId: req.user._id });

    // Try normal registration first
    const registration = await Registration.findOne({ ticketId });
    if (registration) {
      const event = await Event.findById(registration.eventId);
      if (event.organizerId.toString() !== organizer._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const wasAlreadyMarked = registration.attendanceMarked;
      registration.attendanceMarked = true;
      registration.attendanceTimestamp = new Date();
      await registration.save();
      await AttendanceLog.create({
        eventId: registration.eventId,
        participantId: registration.participantId,
        ticketId,
        scannedAt: new Date(),
        scannedBy: organizer._id,
        manualOverride: true,
        overrideReason: overrideReason || 'Manual override by organizer'
      });
      if (!wasAlreadyMarked) {
        await Event.findByIdAndUpdate(registration.eventId, { $inc: { 'analytics.attendanceCount': 1 } });
      }
      return res.json({ message: 'Manual attendance marked', registration });
    }

    // Try merchandise order
    const order = await MerchandiseOrder.findOne({ ticketId });
    if (order) {
      const event = await Event.findById(order.eventId);
      if (event.organizerId.toString() !== organizer._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const wasAlreadyMarked = order.attendanceMarked;
      order.attendanceMarked = true;
      order.attendanceTimestamp = new Date();
      await order.save();
      await AttendanceLog.create({
        eventId: order.eventId,
        participantId: order.participantId,
        ticketId,
        scannedAt: new Date(),
        scannedBy: organizer._id,
        manualOverride: true,
        overrideReason: overrideReason || 'Manual override by organizer'
      });
      if (!wasAlreadyMarked) {
        await Event.findByIdAndUpdate(order.eventId, { $inc: { 'analytics.attendanceCount': 1 } });
      }
      return res.json({ message: 'Manual attendance marked', order });
    }

    return res.status(404).json({ message: 'Ticket not found' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/attendance/event/:eventId - get attendance logs for event
router.get('/event/:eventId', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.eventId);
    if (!event || event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const logs = await AttendanceLog.find({ eventId: event._id })
      .populate({ path: 'participantId', populate: { path: 'userId', select: 'email' } })
      .sort({ scannedAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/attendance/event/:eventId/all - all participants with their attendance status (dashboard)
router.get('/event/:eventId/all', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.eventId);
    if (!event || event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const Participant = require('../models/Participant');
    const Registration = require('../models/Registration');
    const MerchandiseOrder = require('../models/MerchandiseOrder');

    let rows = [];

    if (event.type === 'merchandise') {
      const orders = await MerchandiseOrder.find({ eventId: event._id, approvalStatus: 'approved' })
        .populate({ path: 'participantId', populate: { path: 'userId', select: 'email' } });
      rows = orders.map(o => ({
        _id: o._id,
        ticketId: o.ticketId,
        name: `${o.participantId?.firstName || ''} ${o.participantId?.lastName || ''}`.trim(),
        email: o.participantId?.userId?.email || '',
        participantType: o.participantType,
        attendanceMarked: o.attendanceMarked,
        attendanceTimestamp: o.attendanceTimestamp || null,
      }));
    } else {
      const regs = await Registration.find({ eventId: event._id })
        .populate({ path: 'participantId', populate: { path: 'userId', select: 'email' } });
      rows = regs.map(r => ({
        _id: r._id,
        ticketId: r.ticketId,
        name: `${r.participantId?.firstName || ''} ${r.participantId?.lastName || ''}`.trim(),
        email: r.participantId?.userId?.email || '',
        participantType: r.participantType,
        attendanceMarked: r.attendanceMarked,
        attendanceTimestamp: r.attendanceTimestamp || null,
      }));
    }

    const scanned = rows.filter(r => r.attendanceMarked).length;
    res.json({ total: rows.length, scanned, notScanned: rows.length - scanned, participants: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/attendance/event/:eventId/export-csv - export attendance as CSV
router.get('/event/:eventId/export-csv', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.eventId);
    if (!event || event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const Registration = require('../models/Registration');
    const MerchandiseOrder = require('../models/MerchandiseOrder');

    let rows = [];
    if (event.type === 'merchandise') {
      const orders = await MerchandiseOrder.find({ eventId: event._id, approvalStatus: 'approved' })
        .populate({ path: 'participantId', populate: { path: 'userId', select: 'email' } });
      rows = orders.map(o => ({
        ticketId: o.ticketId || '',
        name: `${o.participantId?.firstName || ''} ${o.participantId?.lastName || ''}`.trim(),
        email: o.participantId?.userId?.email || '',
        participantType: o.participantType || '',
        attended: o.attendanceMarked ? 'Yes' : 'No',
        timestamp: o.attendanceTimestamp ? new Date(o.attendanceTimestamp).toLocaleString() : '',
      }));
    } else {
      const regs = await Registration.find({ eventId: event._id })
        .populate({ path: 'participantId', populate: { path: 'userId', select: 'email' } });
      rows = regs.map(r => ({
        ticketId: r.ticketId || '',
        name: `${r.participantId?.firstName || ''} ${r.participantId?.lastName || ''}`.trim(),
        email: r.participantId?.userId?.email || '',
        participantType: r.participantType || '',
        attended: r.attendanceMarked ? 'Yes' : 'No',
        timestamp: r.attendanceTimestamp ? new Date(r.attendanceTimestamp).toLocaleString() : '',
      }));
    }

    const header = ['Ticket ID', 'Name', 'Email', 'Participant Type', 'Attended', 'Timestamp'];
    const csvRows = rows.map(r =>
      [r.ticketId, r.name, r.email, r.participantType, r.attended, r.timestamp]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...csvRows].join('\n');

    const safeName = event.name.replace(/[^a-z0-9]/gi, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${safeName}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
