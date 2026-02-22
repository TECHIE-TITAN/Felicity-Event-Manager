const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
  fieldType: { type: String, enum: ['text', 'email', 'number', 'select', 'radio', 'checkbox', 'textarea'], required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }]
}, { _id: false });

const merchandiseVariantSchema = new mongoose.Schema({
  product: { type: String, trim: true },
  size:    { type: String },
  color:   { type: String },
  price:   { type: Number, default: 0 },
  stock:   { type: Number, default: 0 },
  sold:    { type: Number, default: 0 },
}, { _id: true });

const analyticsSchema = new mongoose.Schema({
  totalRegistrations: { type: Number, default: 0 },
  iiitRegistrations: { type: Number, default: 0 },
  externalRegistrations: { type: Number, default: 0 },
  merchandiseSales: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  attendanceCount: { type: Number, default: 0 },
  cancellationCount: { type: Number, default: 0 },
  rejectionCount: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['normal', 'merchandise'], required: true },
  eligibility: { type: String, enum: ['ALL', 'IIIT', 'EXTERNAL'], default: 'ALL' },
  registrationDeadline: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },
  registrationLimit: { type: Number, default: 0 },
  registrationFee: { type: Number, default: 0 },
  tags: [{ type: String }],
  status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'closed'], default: 'draft' },
  formSchema: [formFieldSchema],
  formLocked: { type: Boolean, default: false },
  merchandiseVariants: [merchandiseVariantSchema],
  purchaseLimit: { type: Number, default: 1 },
  analytics: { type: analyticsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

eventSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);
