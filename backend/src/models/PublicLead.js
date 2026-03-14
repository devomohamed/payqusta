const mongoose = require('mongoose');

const publicLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    requestType: {
      type: String,
      enum: ['demo', 'pricing', 'migration', 'partnership', 'general'],
      default: 'general',
      index: true,
    },
    teamSize: {
      type: String,
      enum: ['solo', 'small', 'medium', 'large', 'enterprise', 'unknown'],
      default: 'unknown',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    sourcePage: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '/contact',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'closed', 'spam'],
      default: 'new',
      index: true,
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastContactedAt: {
      type: Date,
    },
    meta: {
      ipAddress: String,
      userAgent: String,
      referrer: String,
    },
  },
  { timestamps: true }
);

publicLeadSchema.index({ status: 1, submittedAt: -1 });
publicLeadSchema.index({ requestType: 1, submittedAt: -1 });

module.exports = mongoose.model('PublicLead', publicLeadSchema);
