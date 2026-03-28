const mongoose = require('mongoose');

const TRANSFER_STATUSES = [
  'requested',
  'approved',
  'rejected',
  'prepared',
  'in_transit',
  'partially_received',
  'fully_received',
  'cancelled',
];

const transferItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    requestedQty: {
      type: Number,
      required: true,
      min: 1,
    },
    shippedQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    receivedQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    issueQty: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const transferTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: TRANSFER_STATUSES,
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false },
);

const stockTransferSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: ['order_transfer', 'branch_replenishment'],
      default: 'order_transfer',
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: false,
      default: null,
      index: true,
    },
    fromBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    toBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: TRANSFER_STATUSES,
      default: 'requested',
      index: true,
    },
    items: {
      type: [transferItemSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    issueType: {
      type: String,
      trim: true,
      default: '',
    },
    issueNotes: {
      type: String,
      trim: true,
      default: '',
    },
    trackingReference: {
      type: String,
      trim: true,
      default: '',
    },
    stockDeductedAt: {
      type: Date,
      default: null,
    },
    stockReceivedAt: {
      type: Date,
      default: null,
    },
    timeline: {
      type: [transferTimelineSchema],
      default: [],
    },
    reminders: {
      overdueSince: {
        type: Date,
        default: null,
      },
      lastOverdueReminderAt: {
        type: Date,
        default: null,
      },
      lastOverdueStatus: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

stockTransferSchema.index({ tenant: 1, status: 1, createdAt: -1 });
stockTransferSchema.index({ tenant: 1, fromBranch: 1, toBranch: 1, createdAt: -1 });

stockTransferSchema.pre('validate', function preValidate(next) {
  if (!this.transferNumber) {
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.transferNumber = `TR-${Date.now()}-${randomSuffix}`;
  }

  next();
});

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
