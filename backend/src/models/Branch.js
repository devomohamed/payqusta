const mongoose = require('mongoose');

const BRANCH_TYPE_VALUES = ['store', 'warehouse', 'fulfillment_center', 'hybrid'];

const shippingOriginSchema = new mongoose.Schema(
  {
    governorate: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    area: { type: String, trim: true, default: '' },
    addressLine: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الفرع مطلوب'],
      trim: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^01[0125][0-9]{8}$/, 'رقم هاتف غير صالح، يجب أن يبدأ بـ 01 ويتكون من 11 رقم'],
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    branchType: {
      type: String,
      enum: BRANCH_TYPE_VALUES,
      default: 'store',
    },
    participatesInOnlineOrders: {
      type: Boolean,
      default: false,
    },
    isFulfillmentCenter: {
      type: Boolean,
      default: false,
    },
    onlinePriority: {
      type: Number,
      min: 1,
      max: 9999,
      default: 100,
    },
    pickupEnabled: {
      type: Boolean,
      default: true,
    },
    shippingOrigin: {
      type: shippingOriginSchema,
      default: () => ({}),
    },
    cameras: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, enum: ['stream', 'embed'], default: 'stream' },
      },
    ],
    currentShift: {
      startTime: { type: Date, default: null },
      endTime: { type: Date, default: null },
      openingBalance: { type: Number, default: 0 },
      closingBalance: { type: Number, default: 0 },
      startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: { type: String, default: '' },
    },
    settlementHistory: [
      {
        date: { type: Date, required: true },
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
        settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

branchSchema.index({ tenant: 1, isActive: 1 });
branchSchema.index({ tenant: 1, name: 1 }, { unique: true });
branchSchema.index({ tenant: 1, participatesInOnlineOrders: 1, isActive: 1 });
branchSchema.index({ tenant: 1, isFulfillmentCenter: 1, onlinePriority: 1 });

module.exports = mongoose.model('Branch', branchSchema);
