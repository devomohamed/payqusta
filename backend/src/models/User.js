/**
 * User Model - Authentication & Authorization
 * Supports multi-tenant with role-based access control
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ROLES } = require('../config/constants');

const BRANCH_ACCESS_MODES = ['all_branches', 'assigned_branches', 'single_branch'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'الاسم مطلوب'],
      trim: true,
      maxlength: [80, 'الاسم لا يتجاوز 80 حرف'],
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'بريد إلكتروني غير صالح'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^01[0125][0-9]{8}$/, 'رقم هاتف غير صالح، يجب أن يبدأ بـ 01 ويتكون من 11 رقم'],
    },
    password: {
      type: String,
      minlength: [6, 'كلمة المرور لا تقل عن 6 أحرف'],
      select: false,
    },
    role: {
      type: String,
      default: ROLES.VENDOR,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: function () {
        return this.role !== ROLES.ADMIN && !this.isSuperAdmin;
      },
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    primaryBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    assignedBranches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    }],
    branchAccessMode: {
      type: String,
      enum: BRANCH_ACCESS_MODES,
      default: 'all_branches',
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    customRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    tenants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }],
    avatar: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 0 },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    invitation: {
      status: {
        type: String,
        enum: ['not_sent', 'pending', 'sent', 'fallback_sent', 'failed', 'activated', 'expired'],
        default: 'not_sent',
      },
      channel: {
        type: String,
        enum: ['sms', 'email', 'whatsapp', 'auto', 'none'],
        default: 'auto',
      },
      fallbackChannel: {
        type: String,
        enum: ['sms', 'email', 'none'],
        default: 'none',
      },
      tokenHash: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
      sentAt: { type: Date, default: null },
      activatedAt: { type: Date, default: null },
      lastError: { type: String, default: '' },
    },

    // Gamification & Performance
    gamification: {
      points: { type: Number, default: 0 },
      level: { type: Number, default: 1 },
      dailyTarget: { type: Number, default: 1000 },
      badges: [{
        id: String,
        awardedAt: { type: Date, default: Date.now },
      }],
      streak: { type: Number, default: 0 },
      lastSaleDate: { type: Date },
    },
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ email: 1, tenant: 1 }, { unique: true });
userSchema.index({ phone: 1, tenant: 1 }, { sparse: true });
userSchema.index({ role: 1, tenant: 1 });
userSchema.index({ primaryBranch: 1, tenant: 1 });

userSchema.pre('validate', function (next) {
  if (this.primaryBranch && !this.branch) {
    this.branch = this.primaryBranch;
  }

  if (this.branch && !this.primaryBranch) {
    this.primaryBranch = this.branch;
  }

  if (this.primaryBranch) {
    const primaryBranchId = String(this.primaryBranch);
    const assignedBranchIds = (this.assignedBranches || []).map((branchId) => String(branchId));
    if (!assignedBranchIds.includes(primaryBranchId)) {
      this.assignedBranches = [...(this.assignedBranches || []), this.primaryBranch];
    }
  }

  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      tenant: this.tenant?._id ? this.tenant._id.toString() : this.tenant,
      sv: this.sessionVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
