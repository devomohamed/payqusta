/**
 * PurchaseOrder Model — Supplier Order Management
 */

const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'partial', 'received', 'cancelled'],
      default: 'pending',
    },
    paymentType: {
      type: String,
      enum: ['cash', 'deferred'],
      default: 'deferred',
    },
    paymentFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'custom'],
      default: 'monthly',
    },
    installments: {
      type: Number,
      min: 1,
      default: 1,
    },
    firstInstallmentDate: { type: Date },
    customInstallmentDates: [{ type: Date }],
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        variantId: mongoose.Schema.Types.ObjectId, // If product has variants
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true, min: 0 },
        totalCost: { type: Number, required: true, min: 0 },
        receivedQuantity: { type: Number, default: 0, min: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, default: 0 },
    receivedValue: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    outstandingAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    expectedDeliveryDate: { type: Date },
    receivedDate: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index
purchaseOrderSchema.index({ tenant: 1, orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ tenant: 1, supplier: 1 });
purchaseOrderSchema.index({ tenant: 1, branch: 1 });
purchaseOrderSchema.index({ tenant: 1, status: 1 });

// Auto-generate order number before validation
purchaseOrderSchema.pre('validate', async function (next) {
  if (this.isNew && !this.orderNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.orderNumber = `PO-${Date.now()}-${count + 1}`;
  }
  next();
});

// Normalize totals and received progress
purchaseOrderSchema.pre('save', function (next) {
  this.items = (this.items || []).map((item) => {
    const baseItem = typeof item.toObject === 'function' ? item.toObject() : item;
    const quantity = Math.max(1, Number(item.quantity || 0));
    const unitCost = Math.max(0, Number(item.unitCost || 0));
    const receivedQuantity = Math.max(0, Math.min(quantity, Number(item.receivedQuantity || 0)));

    return {
      ...baseItem,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      receivedQuantity,
    };
  });

  this.totalAmount = this.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  this.receivedValue = this.items.reduce((sum, item) => (
    sum + (Number(item.receivedQuantity || 0) * Number(item.unitCost || 0))
  ), 0);

  if (this.paymentType === 'cash') {
    this.paidAmount = this.receivedValue;
    this.paymentFrequency = 'monthly';
    this.installments = 1;
    this.firstInstallmentDate = null;
    this.customInstallmentDates = [];
  } else {
    this.paidAmount = Math.max(0, Math.min(Number(this.paidAmount || 0), this.receivedValue));
    this.installments = Math.max(1, Math.floor(Number(this.installments || 1)));
    if (this.paymentFrequency === 'custom') {
      this.customInstallmentDates = (this.customInstallmentDates || [])
        .map((date) => new Date(date))
        .filter((date) => !Number.isNaN(date.getTime()));
    } else {
      this.customInstallmentDates = [];
    }
  }

  this.outstandingAmount = Math.max(0, this.receivedValue - this.paidAmount);

  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
