const mongoose = require('mongoose');

const affiliateProfileSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'active',
      index: true,
    },
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    commissionValue: {
      type: Number,
      default: 10,
      min: 0,
    },
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'wallet', 'cash', 'manual', ''],
      default: '',
    },
    payoutDetails: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

affiliateProfileSchema.index({ tenant: 1, code: 1 }, { unique: true });
affiliateProfileSchema.index({ tenant: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AffiliateProfile', affiliateProfileSchema);