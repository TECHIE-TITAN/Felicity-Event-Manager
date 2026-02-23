const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { protect, requireRole } = require('../middleware/auth');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const MerchandiseOrder = require('../models/MerchandiseOrder');
const Organizer = require('../models/Organizer');
const generateQRCode = require('../utils/generateQR');
const sendEmail = require('../utils/sendEmail');
const { uploadPaymentProof } = require('../config/cloudinary');

// POST /api/registrations/event/:eventId - register for normal event
router.post('/event/:eventId', protect, requireRole('participant'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status !== 'published') return res.status(400).json({ message: 'Event is not open for registration' });
    if (event.type !== 'normal') return res.status(400).json({ message: 'Use merchandise order endpoint' });
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    const participant = await Participant.findOne({ userId: req.user._id });
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    // Eligibility check
    if (event.eligibility !== 'ALL' && event.eligibility !== participant.participantType) {
      return res.status(403).json({ message: `This event is only for ${event.eligibility} participants` });
    }

    // Check limit
    if (event.registrationLimit > 0 && event.analytics.totalRegistrations >= event.registrationLimit) {
      return res.status(400).json({ message: 'Registration limit reached' });
    }

    // Check duplicate
    const existing = await Registration.findOne({ eventId: event._id, participantId: participant._id });
    if (existing) return res.status(400).json({ message: 'Already registered for this event' });

    // Lock form after first registration
    if (!event.formLocked) {
      await Event.findByIdAndUpdate(event._id, { formLocked: true });
    }

    const ticketId = `FEL-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
    const qrData = JSON.stringify({ ticketId, eventId: event._id, participantId: participant._id });
    const qrCodeUrl = await generateQRCode(qrData);

    const registration = await Registration.create({
      eventId: event._id,
      participantId: participant._id,
      participantType: participant.participantType,
      formResponses: req.body.formResponses || {},
      status: 'registered',
      paymentStatus: 'success',
      ticketId,
      qrCodeUrl
    });

    try {
      const isIIIT = participant.participantType === 'IIIT';

      await Participant.findByIdAndUpdate(participant._id, { $addToSet: { registeredEvents: event._id } });

      await Event.findByIdAndUpdate(event._id, {
        $inc: {
          'analytics.totalRegistrations': 1,
          [`analytics.${isIIIT ? 'iiitRegistrations' : 'externalRegistrations'}`]: 1,
          'analytics.revenue': event.registrationFee || 0
        }
      });

      const user = req.user;
      await sendEmail({
        to: user.email,
        subject: `Felicity – Registration Confirmed: ${event.name}`,
        html: `<div style="font-family:Arial;background:#0a0a0a;color:#fff;padding:30px;border:2px solid #cc0000">
          <h2 style="color:#cc0000">Felicity</h2>
          <h3>You're registered for <span style="color:#cc0000">${event.name}</span></h3>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p>Show your QR code at the event entrance.</p>
          <img src="${qrCodeUrl}" style="max-width:200px" alt="QR Code"/>
        </div>`,
        type: 'ticket',
        metadata: { ticketId, eventId: event._id.toString() }
      });

      res.status(201).json({ message: 'Registered successfully', registration });
    } catch (innerErr) {
      // Roll back all DB writes made after Registration.create
      await Registration.findByIdAndDelete(registration._id);
      await Participant.findByIdAndUpdate(participant._id, { $pull: { registeredEvents: event._id } });
      await Event.findByIdAndUpdate(event._id, {
        $inc: {
          'analytics.totalRegistrations': -1,
          [`analytics.${participant.participantType === 'IIIT' ? 'iiitRegistrations' : 'externalRegistrations'}`]: -1,
          'analytics.revenue': -(event.registrationFee || 0)
        }
      });
      console.error('Event registration rolled back:', innerErr.message);
      throw innerErr;
    }
  } catch (err) {
    res.status(500).json({ message: 'Registration failed. Please try again.', error: err.message });
  }
});

// POST /api/registrations/merchandise/:eventId - merchandise order
router.post('/merchandise/:eventId', protect, requireRole('participant'), uploadPaymentProof.single('paymentProof'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.type !== 'merchandise') return res.status(400).json({ message: 'Not a merchandise event' });
    if (event.status !== 'published') return res.status(400).json({ message: 'Event is not active' });

    const participant = await Participant.findOne({ userId: req.user._id });
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const { variantsSelected, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    const variantsParsed = typeof variantsSelected === 'string' ? JSON.parse(variantsSelected) : (variantsSelected || []);

    // Calculate revenue: use per-variant qty (sel.qty) if provided, else fall back to top-level qty
    let revenueAmount = 0;
    for (const sel of variantsParsed) {
      const variant = event.merchandiseVariants.find(v => v._id.toString() === sel.variantId?.toString());
      const lineQty = parseInt(sel.qty) || qty;
      if (variant) revenueAmount += (variant.price || 0) * lineQty;
    }
    // Fallback if no variant prices found
    if (revenueAmount === 0 && event.registrationFee) revenueAmount = event.registrationFee * qty;

    const isFree = revenueAmount === 0;

    // Payment proof required only for paid events
    if (!isFree && !req.file) {
      return res.status(400).json({ message: 'Payment proof is required for paid orders' });
    }

    // Check purchase limit
    const existingOrders = await MerchandiseOrder.countDocuments({ eventId: event._id, participantId: participant._id });
    if (existingOrders >= (event.purchaseLimit || 1)) {
      return res.status(400).json({ message: 'Purchase limit reached' });
    }

    // Cloudinary returns secure_url on req.file.path
    const paymentProofUrl = req.file ? req.file.path : null;

    const order = await MerchandiseOrder.create({
      eventId: event._id,
      participantId: participant._id,
      participantType: participant.participantType,
      variantsSelected: variantsParsed,
      quantity: qty,
      revenueAmount,
      paymentProofUrl,
      // Free orders are auto-approved; paid orders await organizer review
      approvalStatus: isFree ? 'approved' : 'pending'
    });

    // For free orders: auto-generate ticket + QR immediately
    if (isFree) {
      const ticketId = `MERCH-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
      const qrData = JSON.stringify({ ticketId, orderId: order._id, eventId: event._id, participantId: participant._id });
      const qrCodeUrl = await generateQRCode(qrData);
      order.ticketId = ticketId;
      order.qrCodeUrl = qrCodeUrl;
      await order.save();

      // Decrement stock and update analytics for free auto-approved order
      for (const v of variantsParsed) {
        const lineQty = parseInt(v.qty) || qty;
        await Event.updateOne(
          { _id: event._id, 'merchandiseVariants._id': v.variantId },
          { $inc: { 'merchandiseVariants.$.stock': -lineQty, 'merchandiseVariants.$.sold': lineQty } }
        );
      }
      const isIIIT = participant.participantType === 'IIIT';
      await Event.findByIdAndUpdate(event._id, {
        $inc: {
          'analytics.totalRegistrations': 1,
          [`analytics.${isIIIT ? 'iiitRegistrations' : 'externalRegistrations'}`]: 1,
          'analytics.merchandiseSales': 1,
          'analytics.revenue': revenueAmount,
        }
      });
    }

    res.status(201).json({
      message: isFree ? 'Free order placed and confirmed!' : 'Order placed, awaiting approval',
      order
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrations/my - participant's registrations
router.get('/my', protect, requireRole('participant'), async (req, res) => {
  try {
    const participant = await Participant.findOne({ userId: req.user._id });
    const registrations = await Registration.find({ participantId: participant._id }).populate('eventId', 'name type status startDate endDate');
    const merchandiseOrders = await MerchandiseOrder.find({ participantId: participant._id }).populate('eventId', 'name type status');
    res.json({ registrations, merchandiseOrders });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrations/event/:eventId - organizer gets registrations for event
router.get('/event/:eventId', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.eventId);
    if (!event || event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { search, participantType } = req.query;
    let query = { eventId: event._id };
    if (participantType) query.participantType = participantType;

    const registrations = await Registration.find(query)
      .populate({ path: 'participantId', populate: { path: 'userId', select: 'email' } });

    res.json(registrations);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrations/merchandise/event/:eventId - organizer gets merchandise orders
router.get('/merchandise/event/:eventId', protect, requireRole('organizer'), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });
    const event = await Event.findById(req.params.eventId);
    if (!event || event.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const orders = await MerchandiseOrder.find({ eventId: event._id })
      .populate({ path: 'participantId', populate: { path: 'userId', select: 'email' } });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/registrations/merchandise/:orderId/approve
router.put('/merchandise/:orderId/approve', protect, requireRole('organizer'), async (req, res) => {
  try {
    const order = await MerchandiseOrder.findById(req.params.orderId).populate('eventId');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (order.eventId.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const ticketId = `MERCH-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
    const qrData = JSON.stringify({ ticketId, orderId: order._id, eventId: order.eventId._id, participantId: order.participantId });
    const qrCodeUrl = await generateQRCode(qrData);

    order.approvalStatus = 'approved';
    order.ticketId = ticketId;
    order.qrCodeUrl = qrCodeUrl;
    await order.save();

    // Decrement stock for each variant
    for (const v of order.variantsSelected) {
      const lineQty = parseInt(v.qty) || order.quantity;
      await Event.updateOne(
        { _id: order.eventId._id, 'merchandiseVariants._id': v.variantId },
        { $inc: { 'merchandiseVariants.$.stock': -lineQty, 'merchandiseVariants.$.sold': lineQty } }
      );
    }

    // Update analytics: revenue, sales count, and iiit/external breakdown
    const participant = await require('../models/Participant').findById(order.participantId).populate('userId', 'email');
    const isIIIT = order.participantType === 'IIIT';
    await Event.findByIdAndUpdate(order.eventId._id, {
      $inc: {
        'analytics.merchandiseSales': 1,
        'analytics.revenue': order.revenueAmount,
        'analytics.totalRegistrations': 1,
        [`analytics.${isIIIT ? 'iiitRegistrations' : 'externalRegistrations'}`]: 1,
      }
    });
    if (participant?.userId?.email) {
      await sendEmail({
        to: participant.userId.email,
        subject: `Felicity – Merchandise Order Approved: ${order.eventId.name}`,
        html: `<div style="font-family:Arial;background:#0a0a0a;color:#fff;padding:30px;border:2px solid #cc0000">
          <h2 style="color:#cc0000">Felicity</h2>
          <h3>Your merchandise order for <span style="color:#cc0000">${order.eventId.name}</span> is approved!</h3>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <img src="${qrCodeUrl}" style="max-width:200px" alt="QR Code"/>
        </div>`,
        type: 'merchandise_confirmation',
        metadata: { orderId: order._id.toString() }
      });
    }

    res.json({ message: 'Order approved', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/registrations/merchandise/:orderId/reject
router.put('/merchandise/:orderId/reject', protect, requireRole('organizer'), async (req, res) => {
  try {
    const order = await MerchandiseOrder.findById(req.params.orderId).populate('eventId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const organizer = await Organizer.findOne({ userId: req.user._id });
    if (order.eventId.organizerId.toString() !== organizer._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    order.approvalStatus = 'rejected';
    await order.save();
    await Event.findByIdAndUpdate(order.eventId._id, { $inc: { 'analytics.rejectionCount': 1 } });
    res.json({ message: 'Order rejected', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
