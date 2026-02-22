const mongoose = require('mongoose');

const discussionMessageSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['participant', 'organizer'], required: true },
  messageText: { type: String, required: true },
  parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionMessage', default: null },
  reactions: [{ emoji: String, userId: mongoose.Schema.Types.ObjectId }],
  isPinned: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiscussionMessage', discussionMessageSchema);
