const mongoose = require('mongoose');

const affiliateConversionSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    affiliate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AffiliateProfile',
      required: true,
      index: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    source: {
      type: String,
      enum: ['online_store', 'portal'],
      default: 'online_store',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'reversed', 'paid'],
      default: 'pending',
      index: true,
    },
    orderSubtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionBase: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    commissionValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    attributedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    reversedAt: { type: Date },
    reversalReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

affiliateConversionSchema.index({ tenant: 1, affiliate: 1, createdAt: -1 });
affiliateConversionSchema.index({ tenant: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AffiliateConversion', affiliateConversionSchema);