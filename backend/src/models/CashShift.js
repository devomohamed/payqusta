const mongoose = require('mongoose');

const cashShiftSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    user: { // The user who opened the shift
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCashSales: { // System calculated
      type: Number,
      default: 0,
    },
    expectedCash: { // opening + sales
      type: Number,
      default: 0,
    },
    actualCash: { // Counted by user
      type: Number,
    },
    variance: { // actual - expected
      type: Number,
    },
    notes: {
      type: String,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    autoCloseAt: { // Automatically calculate based on start time + tenant shift duration
      type: Date,
    },
    closedBySystem: { // Flag if closed automatically by system
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CashShift', cashShiftSchema);
