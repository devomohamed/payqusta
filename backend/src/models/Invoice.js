/**
 * Invoice Model — Sales & Installment Management
 * Supports cash, deferred, and installment payments
 * NO TAX — as per BRD requirements
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  INVOICE_STATUS, PAYMENT_METHODS, INSTALLMENT_STATUS,
  INSTALLMENT_FREQUENCIES
} = require('../config/constants');

// Invoice line item
const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  allocatedBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
  },
  productName: { type: String, required: true },
  sku: { type: String },
  barcode: { type: String },
  internationalBarcode: { type: String },
  internationalBarcodeType: { type: String },
  localBarcode: { type: String },
  localBarcodeType: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true },
  taxable: { type: Boolean, default: true },
  taxRate: { type: Number, default: 0 },
});

// Installment schedule item
const installmentSchema = new mongoose.Schema({
  installmentNumber: { type: Number, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: Object.values(INSTALLMENT_STATUS),
    default: INSTALLMENT_STATUS.PENDING,
  },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date },
  reminderSent: { type: Boolean, default: false },
  lastReminderDate: { type: Date },
});

// Payment record
const paymentRecordSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { type: String, default: 'cash' },
  reference: { type: String },
  notes: { type: String },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  shift: { // ID of the CashShift during which this payment was collected
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashShift',
    index: true,
  },
});

const invoiceSchema = new mongoose.Schema(
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
      required: false, // optional for portal orders
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'العميل مطلوب'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // portal orders use customer as originator
    },
    shift: { // Directly link the invoice to a specific Cash Shift
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashShift',
      index: true,
    },
    // Items
    items: [invoiceItemSchema],
    // Totals
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    shippingDiscount: { type: Number, default: 0, min: 0 },
    carrierCost: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true },
    // Payment
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: [true, 'طريقة الدفع مطلوبة'],
    },
    // Payment tracking
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    // Installment configuration
    installmentConfig: {
      numberOfInstallments: { type: Number, default: 0 },
      frequency: {
        type: String,
        enum: Object.values(INSTALLMENT_FREQUENCIES),
        default: INSTALLMENT_FREQUENCIES.MONTHLY,
      },
      downPayment: { type: Number, default: 0 },
      startDate: { type: Date },
    },
    // Installment schedule
    installments: [installmentSchema],
    // Payment history
    payments: [paymentRecordSchema],
    // Status
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.PENDING,
    },
    // Order tracking status (for portal orders)
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    fulfillmentStatus: {
      type: String,
      enum: [
        'pending_review',
        'branch_x_ready',
        'awaiting_stock_transfer',
        'transfer_in_progress',
        'partial_receipt_review',
        'ready_for_shipping',
        'no_stock',
        'cancelled',
      ],
      default: 'pending_review',
    },
    orderStatusHistory: [{
      status: String,
      date: { type: Date, default: Date.now },
      note: String,
    }],
    // WhatsApp
    whatsappSent: { type: Boolean, default: false },
    whatsappSentAt: { type: Date },
    // Notes
    notes: { type: String, maxlength: 2000 },
    // Due date (for deferred payment)
    dueDate: { type: Date },
    // Source
    source: {
      type: String,
      enum: ['pos', 'portal', 'online_store', 'import'],
      default: 'pos',
    },
    // Storefront campaign attribution (UTM / ad source)
    campaignAttribution: {
      utmSource: { type: String },
      utmMedium: { type: String },
      utmCampaign: { type: String },
      utmTerm: { type: String },
      utmContent: { type: String },
      campaignMessage: { type: String },
      ref: { type: String },
      gclid: { type: String },
      fbclid: { type: String },
      referrer: { type: String },
      landingPath: { type: String },
      landingUrl: { type: String },
      firstSeenAt: { type: Date },
      lastSeenAt: { type: Date },
    },
    // Shipping / Delivery details (portal orders)
    shippingAddress: {
      fullName: { type: String },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
      governorate: { type: String },
      notes: { type: String },
    },
    shippingMethod: { type: String },
    addressChangedAfterCheckout: {
      type: Boolean,
      default: false,
    },
    addressReviewStatus: {
      type: String,
      enum: ['none', 'pending', 'resolved'],
      default: 'none',
    },
    addressReviewNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    fulfillmentBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    shippingZone: {
      code: { type: String },
      label: { type: String },
    },
    transferRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockTransfer',
      default: null,
    },
    shipmentId: { type: String },
    trackingNumber: { type: String },
    guestTrackingToken: { type: String },
    guestTrackingTokenIssuedAt: { type: Date },
    estimatedDeliveryDate: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    inventoryRestoredAt: { type: Date },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundedAt: { type: Date },
    cancelReason: { type: String },
    refundReason: { type: String },
    returnStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'received', 'rejected', 'refunded'],
      default: 'none',
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'partially_refunded', 'refunded', 'failed'],
      default: 'none',
    },
    // Shipping Integration (Bosta, etc.)
    shippingDetails: {
      provider: { type: String, enum: ['bosta', 'aramex', 'local', 'manual', null], default: null },
      waybillNumber: { type: String },
      trackingUrl: { type: String },
      status: { type: String, enum: ['pending', 'created', 'picked_up', 'in_transit', 'delivered', 'returned', 'cancelled'], default: 'pending' },
    },
    shipmentFailure: {
      provider: { type: String, enum: ['bosta', 'aramex', 'local', 'manual', null], default: null },
      lastError: { type: String, default: '', trim: true, maxlength: 1000 },
      failedAt: { type: Date, default: null },
      retryCount: { type: Number, default: 0, min: 0 },
      lastAttemptAt: { type: Date, default: null },
      lastAttemptPayloadSummary: {
        address: { type: String, default: '', trim: true, maxlength: 300 },
        city: { type: String, default: '', trim: true, maxlength: 80 },
        governorate: { type: String, default: '', trim: true, maxlength: 80 },
        pickupBranchName: { type: String, default: '', trim: true, maxlength: 120 },
        itemsCount: { type: Number, default: 0, min: 0 },
        reference: { type: String, default: '', trim: true, maxlength: 80 },
      },
      dismissedAt: { type: Date, default: null },
      dismissedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      dismissalNote: { type: String, default: '', trim: true, maxlength: 500 },
    },
    // Electronic Signature (For portal credit/installment orders)
    electronicSignature: {
      type: String,
    },
    // Commission Data
    commission: {
      amount: { type: Number, default: 0 },
      isPaid: { type: Boolean, default: false },
    },
    // Quick Collection & Gateways
    paymentLink: { type: String },
    gatewayFees: { type: Number, default: 0 },
    paymentAttempts: [{
      date: { type: Date, default: Date.now },
      gateway: { type: String },
      status: { type: String },
      transactionId: { type: String },
      errorMessage: { type: String }
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
invoiceSchema.index({ tenant: 1, invoiceNumber: 1 });
invoiceSchema.index({ tenant: 1, branch: 1 });
invoiceSchema.index({ tenant: 1, customer: 1 });
invoiceSchema.index({ tenant: 1, status: 1 });
invoiceSchema.index({ tenant: 1, createdAt: -1 });
invoiceSchema.index({ 'installments.dueDate': 1, 'installments.status': 1 });
// Compound indexes for common queries
invoiceSchema.index({ tenant: 1, customer: 1, status: 1 });
invoiceSchema.index({ tenant: 1, branch: 1, createdAt: -1 });
invoiceSchema.index({ tenant: 1, paymentMethod: 1, status: 1 });
invoiceSchema.index({ tenant: 1, guestTrackingToken: 1 });

// Pre-save: Calculate totals and status
invoiceSchema.pre('save', function (next) {
  if (this.source === 'online_store' && !this.guestTrackingToken) {
    this.guestTrackingToken = crypto.randomBytes(18).toString('hex');
    this.guestTrackingTokenIssuedAt = new Date();
  }

  // Calculate subtotal and tax from items
  let currentProfit = 0;
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate tax amount from taxable items
    this.taxAmount = this.items.reduce((sum, item) => {
      if (item.taxable && item.taxRate > 0) {
        return sum + (item.totalPrice * (item.taxRate / 100));
      }
      return sum;
    }, 0);

    const effectiveShipping = Math.max(0, (this.shippingFee || 0) - (this.shippingDiscount || 0));

    // Total = Subtotal + Tax + Shipping - Discount
    this.totalAmount = this.subtotal + this.taxAmount + effectiveShipping - this.discount;
  }

  // Calculate remaining amount
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);

  // Update status based on payments
  if (this.status !== INVOICE_STATUS.CANCELLED) {
    if (this.paidAmount >= this.totalAmount) {
      this.status = INVOICE_STATUS.PAID;
      this.remainingAmount = 0;
    } else if (this.paidAmount > 0) {
      this.status = INVOICE_STATUS.PARTIALLY_PAID;
    }
  }

  // Check for overdue installments
  const now = new Date();
  if (this.installments && this.installments.length > 0) {
    this.installments.forEach((inst) => {
      if (inst.status === 'pending' && inst.dueDate < now) {
        inst.status = INSTALLMENT_STATUS.OVERDUE;
      }
    });

    const hasOverdue = this.installments.some((i) => i.status === 'overdue');
    if (hasOverdue && this.status !== INVOICE_STATUS.PAID && this.status !== INVOICE_STATUS.CANCELLED) {
      this.status = INVOICE_STATUS.OVERDUE;
    }
  }

  next();
});

// Instance: Record a payment
invoiceSchema.methods.recordPayment = function (amount, method = 'cash', userId = null, reference = '') {
  this.paidAmount += amount;
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);

  this.payments.push({
    amount,
    method,
    reference,
    recordedBy: userId,
    date: new Date(),
  });

  // Update status
  if (this.paidAmount >= this.totalAmount) {
    this.status = INVOICE_STATUS.PAID;
    // Mark all pending installments as paid
    this.installments.forEach((inst) => {
      if (inst.status !== 'paid') {
        inst.status = 'paid';
        inst.paidAmount = inst.amount;
        inst.paidDate = new Date();
      }
    });
  } else {
    this.status = INVOICE_STATUS.PARTIALLY_PAID;
  }

  // Apply payment to installments in order
  if (this.installments.length > 0) {
    let remaining = amount;
    for (const inst of this.installments) {
      if (remaining <= 0) break;
      if (inst.status === 'paid') continue;

      const due = inst.amount - inst.paidAmount;
      const payment = Math.min(remaining, due);
      inst.paidAmount += payment;
      remaining -= payment;

      if (inst.paidAmount >= inst.amount) {
        inst.status = 'paid';
        inst.paidDate = new Date();
      } else {
        inst.status = 'partially_paid';
      }
    }
  }

  return this;
};

// Instance: Pay all remaining at once (سداد كل المبلغ المتبقي)
invoiceSchema.methods.payAllRemaining = function (userId = null) {
  const remainingToPay = this.remainingAmount;
  return this.recordPayment(remainingToPay, 'cash', userId, 'سداد كامل');
};

// Static: Get overdue invoices for a tenant
invoiceSchema.statics.getOverdueInvoices = function (tenantId, branchId = null) {
  const filter = {
    tenant: tenantId,
    status: { $in: [INVOICE_STATUS.OVERDUE, INVOICE_STATUS.PARTIALLY_PAID] },
    remainingAmount: { $gt: 0 },
  };
  if (branchId) filter.branch = branchId;

  return this.find(filter)
    .populate('customer', 'name phone')
    .sort({ 'installments.dueDate': 1 });
};

// Static: Get upcoming installments
invoiceSchema.statics.getUpcomingInstallments = function (tenantId, daysBefore = 1, branchId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysBefore);
  targetDate.setHours(23, 59, 59, 999);

  const filter = {
    tenant: tenantId,
    'installments.status': { $in: ['pending', 'overdue'] },
    'installments.dueDate': { $gte: today, $lte: targetDate },
  };
  if (branchId) filter.branch = branchId;

  return this.find(filter)
    .populate('customer', 'name phone whatsapp')
    .select('invoiceNumber customer totalAmount paidAmount remainingAmount installments');
};

// Static: Sales summary for dashboard
invoiceSchema.statics.getSalesSummary = async function (tenantId, period = 30, branchId = null) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const matchStage = {
    tenant: new mongoose.Types.ObjectId(tenantId),
    createdAt: { $gte: startDate },
    status: { $ne: INVOICE_STATUS.CANCELLED },
  };
  if (branchId) matchStage.branch = new mongoose.Types.ObjectId(branchId);

  const result = await this.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalOutstanding: { $sum: '$remainingAmount' },
        invoiceCount: { $sum: 1 },
        avgInvoiceValue: { $avg: '$totalAmount' },
      },
    },
  ]);

  return result[0] || {
    totalSales: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    invoiceCount: 0,
    avgInvoiceValue: 0,
  };
};

module.exports = mongoose.model('Invoice', invoiceSchema);
