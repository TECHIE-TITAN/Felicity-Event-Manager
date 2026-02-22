const mongoose = require('mongoose');

const eventAnalyticsHistorySchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  date: { type: Date, required: true },
  registrations: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  attendance: { type: Number, default: 0 },
  cancellations: { type: Number, default: 0 }
});

module.exports = mongoose.model('EventAnalyticsHistory', eventAnalyticsHistorySchema);
