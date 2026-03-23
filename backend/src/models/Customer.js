/**
 * Customer Model - Client Management with Gamification
 * Supports portal access, VIP tiers, points, and communication preferences
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { CUSTOMER_TIERS, GAMIFICATION } = require('../config/constants');

const customerSchema = new mongoose.Schema(
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
      index: true,
    },
    name: {
      type: String,
      required: [true, 'اسم العميل مطلوب'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^01[0125][0-9]{8}$/, 'رقم هاتف غير صالح، يجب أن يبدأ بـ 01 ويتكون من 11 رقم'],
    },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    nationalId: { type: String, trim: true },
    profilePhoto: { type: String, default: null },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', ''], default: '' },
    whatsappNumber: { type: String, trim: true },
    bio: { type: String, maxlength: 300 },

    documents: [{
      type: {
        type: String,
        enum: ['national_id', 'passport', 'utility_bill', 'contract', 'other'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      url: { type: String, required: true },
      backUrl: { type: String },
      rejectionReason: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    }],

    addresses: [{
      label: { type: String, default: 'المنزل' },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      zipCode: { type: String },
      isDefault: { type: Boolean, default: false },
    }],

    password: {
      type: String,
      select: false,
      minlength: 6,
    },
    isPortalActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: { type: Date },
    portalAccess: {
      status: {
        type: String,
        enum: ['not_sent', 'pending', 'sent', 'fallback_sent', 'failed', 'activated', 'expired'],
        default: 'not_sent',
      },
      channel: {
        type: String,
        enum: ['sms', 'email', 'auto', 'none'],
        default: 'auto',
      },
      fallbackChannel: {
        type: String,
        enum: ['sms', 'email', 'none'],
        default: 'none',
      },
      activationTokenHash: { type: String, default: '' },
      activationExpiresAt: { type: Date, default: null },
      activatedAt: { type: Date, default: null },
      lastInviteAt: { type: Date, default: null },
      lastDeliveryStatus: { type: String, default: '' },
      lastDeliveryError: { type: String, default: '' },
      otp: {
        codeHash: { type: String, default: '' },
        expiresAt: { type: Date, default: null },
        attempts: { type: Number, default: 0 },
        lastSentAt: { type: Date, default: null },
      },
    },

    financials: {
      totalPurchases: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
      outstandingBalance: { type: Number, default: 0 },
      creditLimit: { type: Number, default: 10000 },
      lifetimeValue: { type: Number, default: 0 },
    },
    creditEngine: {
      score: { type: Number, default: 100, min: 0, max: 100 },
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'blocked'],
        default: 'low',
      },
      maxInstallments: { type: Number, default: 12 },
      allowDeferred: { type: Boolean, default: true },
      allowInstallments: { type: Boolean, default: true },
      lastAssessment: { type: Date },
    },
    paymentBehavior: {
      onTimePayments: { type: Number, default: 0 },
      latePayments: { type: Number, default: 0 },
      totalPayments: { type: Number, default: 0 },
      avgDaysLate: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
    },
    salesBlocked: { type: Boolean, default: false },
    salesBlockedReason: { type: String },
    salesBlockedAt: { type: Date },
    firstPurchaseDate: { type: Date },
    lastPurchaseDate: { type: Date },
    lastPaymentDate: { type: Date },
    tier: {
      type: String,
      enum: Object.values(CUSTOMER_TIERS),
      default: CUSTOMER_TIERS.NORMAL,
    },
    gamification: {
      points: { type: Number, default: 0 },
      totalEarnedPoints: { type: Number, default: 0 },
      redeemedPoints: { type: Number, default: 0 },
      badges: [{
        name: String,
        earnedAt: Date,
        icon: String,
      }],
      lastDailyRewardClaim: { type: Date },
    },
    wallet: {
      balance: { type: Number, default: 0 },
      totalRecharged: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
    },
    whatsapp: {
      enabled: { type: Boolean, default: true },
      number: { type: String },
      notifications: {
        invoices: { type: Boolean, default: true },
        reminders: { type: Boolean, default: true },
        statements: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
      },
    },
    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }],
    barcode: { type: String, trim: true },
    notes: { type: String, maxlength: 2000 },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

customerSchema.pre('validate', function (next) {
  if (!this.phone && !this.email) {
    this.invalidate('phone', 'أدخل رقم الهاتف أو البريد الإلكتروني على الأقل');
  }
  next();
});

customerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

customerSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

customerSchema.pre('save', function (next) {
  if (typeof this.whatsapp === 'string') {
    if (this.whatsapp.trim()) {
      this.whatsappNumber = this.whatsapp;
    }
    this.whatsapp = undefined;
  }

  if (this.whatsappNumber === '') this.whatsappNumber = undefined;
  if (this.barcode === '') this.barcode = undefined;
  if (this.phone === '') this.phone = undefined;
  if (this.email === '') this.email = undefined;

  if (!this.barcode) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    this.barcode = `CST-${datePart}-${randomPart}`;
  }

  next();
});

customerSchema.index({ tenant: 1, phone: 1 }, { unique: true, sparse: true });
customerSchema.index({ tenant: 1, barcode: 1 }, { unique: true, sparse: true });
customerSchema.index({ tenant: 1, whatsappNumber: 1 }, { unique: false, sparse: true });
customerSchema.index({ tenant: 1, name: 'text' });
customerSchema.index({ tenant: 1, tier: 1 });
customerSchema.index({ tenant: 1, 'financials.outstandingBalance': -1 });
customerSchema.index({ tenant: 1, isActive: 1 });
customerSchema.index({ tenant: 1, isPortalActive: 1 });

customerSchema.methods.addPoints = function (points) {
  this.gamification.points += points;
  this.gamification.totalEarnedPoints += points;

  if (this.gamification.totalEarnedPoints >= GAMIFICATION.VIP_THRESHOLD) {
    this.tier = CUSTOMER_TIERS.VIP;
  } else if (this.gamification.totalEarnedPoints >= GAMIFICATION.PREMIUM_THRESHOLD) {
    this.tier = CUSTOMER_TIERS.PREMIUM;
  }

  return this;
};

customerSchema.methods.recordPurchase = function (amount, paidAmount = 0) {
  this.financials.totalPurchases += amount;
  this.financials.totalPaid += paidAmount;
  this.financials.outstandingBalance = this.financials.totalPurchases - this.financials.totalPaid;

  const earnedPoints = Math.floor(amount / 1000) * GAMIFICATION.POINTS_PER_PURCHASE;
  this.addPoints(earnedPoints);

  return this;
};

customerSchema.methods.recordPayment = function (amount, onTime = true) {
  this.financials.totalPaid += amount;
  this.financials.outstandingBalance = Math.max(
    0,
    this.financials.totalPurchases - this.financials.totalPaid
  );

  if (onTime) {
    this.addPoints(GAMIFICATION.POINTS_PER_ON_TIME);
  }

  return this;
};

customerSchema.statics.getTopCustomers = function (tenantId, limit = 10) {
  return this.find({ tenant: tenantId, isActive: true })
    .sort({ 'financials.totalPurchases': -1 })
    .limit(limit)
    .select('name phone email tier financials.totalPurchases financials.outstandingBalance gamification.points');
};

customerSchema.statics.getDebtors = function (tenantId) {
  return this.find({
    tenant: tenantId,
    isActive: true,
    'financials.outstandingBalance': { $gt: 0 },
  })
    .sort({ 'financials.outstandingBalance': -1 })
    .select('name phone email financials.outstandingBalance');
};

customerSchema.methods.calculateCreditScore = function () {
  let score = 100;
  const pb = this.paymentBehavior;
  const fin = this.financials;

  if (pb.totalPayments > 0) {
    const onTimeRatio = pb.onTimePayments / pb.totalPayments;
    score -= Math.round((1 - onTimeRatio) * 40);
  }

  if (pb.latePayments > 3) score -= Math.min(pb.latePayments * 3, 20);

  if (fin.creditLimit > 0) {
    const utilizationRatio = fin.outstandingBalance / fin.creditLimit;
    if (utilizationRatio > 1) score -= 20;
    else if (utilizationRatio > 0.8) score -= 15;
    else if (utilizationRatio > 0.5) score -= 8;
  }

  if (pb.avgDaysLate > 30) score -= 10;
  else if (pb.avgDaysLate > 14) score -= 6;
  else if (pb.avgDaysLate > 7) score -= 3;

  if (pb.currentStreak >= 5) score += 5;
  else if (pb.currentStreak >= 3) score += 3;

  this.creditEngine.score = Math.max(0, Math.min(100, score));

  if (this.creditEngine.score >= 70) {
    this.creditEngine.riskLevel = 'low';
    this.creditEngine.maxInstallments = 12;
    this.creditEngine.allowDeferred = true;
    this.creditEngine.allowInstallments = true;
  } else if (this.creditEngine.score >= 50) {
    this.creditEngine.riskLevel = 'medium';
    this.creditEngine.maxInstallments = 6;
    this.creditEngine.allowDeferred = true;
    this.creditEngine.allowInstallments = true;
  } else if (this.creditEngine.score >= 30) {
    this.creditEngine.riskLevel = 'high';
    this.creditEngine.maxInstallments = 3;
    this.creditEngine.allowDeferred = false;
    this.creditEngine.allowInstallments = true;
  } else {
    this.creditEngine.riskLevel = 'blocked';
    this.creditEngine.maxInstallments = 0;
    this.creditEngine.allowDeferred = false;
    this.creditEngine.allowInstallments = false;
  }

  this.creditEngine.lastAssessment = new Date();
  return this;
};

customerSchema.methods.recordPaymentWithBehavior = function (amount, daysLate = 0) {
  this.financials.totalPaid += amount;
  this.financials.outstandingBalance = Math.max(
    0,
    this.financials.totalPurchases - this.financials.totalPaid
  );
  this.lastPaymentDate = new Date();

  this.paymentBehavior.totalPayments += 1;
  if (daysLate <= 0) {
    this.paymentBehavior.onTimePayments += 1;
    this.paymentBehavior.currentStreak += 1;
    if (this.paymentBehavior.currentStreak > this.paymentBehavior.longestStreak) {
      this.paymentBehavior.longestStreak = this.paymentBehavior.currentStreak;
    }
    this.addPoints(GAMIFICATION.POINTS_PER_ON_TIME);
  } else {
    this.paymentBehavior.latePayments += 1;
    this.paymentBehavior.currentStreak = 0;
    const totalLate = this.paymentBehavior.avgDaysLate * (this.paymentBehavior.latePayments - 1) + daysLate;
    this.paymentBehavior.avgDaysLate = Math.round(totalLate / this.paymentBehavior.latePayments);
  }

  this.calculateCreditScore();
  return this;
};

customerSchema.methods.blockSales = function (reason) {
  this.salesBlocked = true;
  this.salesBlockedReason = reason;
  this.salesBlockedAt = new Date();
  return this;
};

customerSchema.methods.unblockSales = function () {
  this.salesBlocked = false;
  this.salesBlockedReason = undefined;
  this.salesBlockedAt = undefined;
  return this;
};

customerSchema.statics.getAgingReport = async function (tenantId) {
  const Invoice = require('./Invoice');
  const customers = await this.find({
    tenant: tenantId,
    isActive: true,
    'financials.outstandingBalance': { $gt: 0 },
  }).lean();

  const today = new Date();
  const result = { current: [], days30: [], days60: [], days90: [], days90Plus: [] };

  for (const customer of customers) {
    const invoices = await Invoice.find({
      customer: customer._id,
      remainingAmount: { $gt: 0 },
    }).lean();

    let oldest = null;
    for (const invoice of invoices) {
      if (!oldest || invoice.createdAt < oldest) oldest = invoice.createdAt;
    }

    if (!oldest) continue;

    const daysOld = Math.floor((today - new Date(oldest)) / (1000 * 60 * 60 * 24));
    const entry = {
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      tier: customer.tier,
      outstanding: customer.financials.outstandingBalance,
      daysOld,
      creditScore: customer.creditEngine?.score || 100,
      riskLevel: customer.creditEngine?.riskLevel || 'low',
    };

    if (daysOld <= 0) result.current.push(entry);
    else if (daysOld <= 30) result.days30.push(entry);
    else if (daysOld <= 60) result.days60.push(entry);
    else if (daysOld <= 90) result.days90.push(entry);
    else result.days90Plus.push(entry);
  }

  return {
    ...result,
    summary: {
      current: result.current.reduce((sum, customer) => sum + customer.outstanding, 0),
      days30: result.days30.reduce((sum, customer) => sum + customer.outstanding, 0),
      days60: result.days60.reduce((sum, customer) => sum + customer.outstanding, 0),
      days90: result.days90.reduce((sum, customer) => sum + customer.outstanding, 0),
      days90Plus: result.days90Plus.reduce((sum, customer) => sum + customer.outstanding, 0),
      totalCustomers: customers.length,
      totalOutstanding: customers.reduce((sum, customer) => sum + customer.financials.outstandingBalance, 0),
    },
  };
};

module.exports = mongoose.model('Customer', customerSchema);
