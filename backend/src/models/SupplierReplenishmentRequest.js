const mongoose = require('mongoose');

const REQUEST_STATUSES = ['requested', 'under_review', 'approved', 'rejected', 'converted_to_purchase_order'];
const REQUEST_SOURCES = ['branch_products', 'branch_dashboard', 'low_stock_page', 'stock_transfers_page', 'manual'];

const supplierReplenishmentRequestSchema = new mongoose.Schema(
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
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    requestedQty: {
      type: Number,
      required: true,
      min: 1,
    },
    currentQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    minQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'requested',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    source: {
      type: String,
      enum: REQUEST_SOURCES,
      default: 'manual',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    convertedPurchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

supplierReplenishmentRequestSchema.index({ tenant: 1, branch: 1, status: 1 });
supplierReplenishmentRequestSchema.index({ tenant: 1, product: 1, supplier: 1, status: 1 });

module.exports = mongoose.model('SupplierReplenishmentRequest', supplierReplenishmentRequestSchema);
