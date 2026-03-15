const mongoose = require('mongoose');

const branchSettlementSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    date: { 
      type: Date, 
      required: true,
      default: Date.now,
      index: true,
    },
    totalSales: { type: Number, default: 0 },
    cashSales: { type: Number, default: 0 },
    cardSales: { type: Number, default: 0 },
    creditSales: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    netCash: { type: Number, default: 0 },
    cashInHand: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    invoicesCount: { type: Number, default: 0 },
    settledBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Indexes
branchSettlementSchema.index({ tenant: 1, branch: 1, date: -1 });

module.exports = mongoose.model('BranchSettlement', branchSettlementSchema);
