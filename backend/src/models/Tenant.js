/**
 * Tenant Model — Multi-Vendor SaaS
 * Each vendor/seller has their own tenant with isolated data
 */

const mongoose = require('mongoose');
const { CURRENCIES } = require('../config/constants');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المتجر مطلوب'],
      trim: true,
      maxlength: [100, 'اسم المتجر لا يتجاوز 100 حرف'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customDomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    customDomainStatus: {
      type: String,
      enum: ['not_configured', 'pending', 'connected'],
      default: 'not_configured',
    },
    customDomainLastCheckedAt: {
      type: Date,
      default: null,
    },
    // Branding customization
    branding: {
      logo: { type: String, default: null },
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#10b981' },
      darkMode: { type: Boolean, default: false },
    },
    // Business info
    businessInfo: {
      phone: { type: String },
      email: { type: String },
      address: { type: String },
      taxId: { type: String },
      commercialRegister: { type: String },
    },
    // Settings
    settings: {
      currency: {
        type: String,
        enum: Object.keys(CURRENCIES),
        default: 'EGP',
      },
      timezone: { type: String, default: 'Africa/Cairo' },
      language: { type: String, default: 'ar' },
      lowStockThreshold: { type: Number, default: 5 },
      autoRestockAlert: { type: Boolean, default: true },
      enableGamification: { type: Boolean, default: true },
      categories: {
        type: [{
          name: String,
          isVisible: { type: Boolean, default: true }
        }],
        default: []
      },
      watermark: {
        enabled: { type: Boolean, default: false },
        text: { type: String, default: '' },
        position: { type: String, enum: ['center', 'northwest', 'northeast', 'southwest', 'southeast'], default: 'southeast' },
        opacity: { type: Number, min: 0, max: 100, default: 50 },
      },
    },
    // WhatsApp configuration
    whatsapp: {
      enabled: { type: Boolean, default: false },
      phoneNumber: { type: String },
      phoneNumberId: { type: String },
      accessToken: { type: String },
      wabaId: { type: String }, // WhatsApp Business Account ID (dynamic)
      // Per-tenant template name mapping (auto-detected or manual)
      templateNames: {
        invoice: { type: String },      // e.g. 'payqusta_invoice' or 'invoice_notification'
        statement: { type: String },    // e.g. 'payqusta_statement' or 'customer_statement'
        reminder: { type: String },     // e.g. 'payqusta_reminder' or 'payment_reminder'
        payment: { type: String },      // e.g. 'payqusta_payment' or 'payment_received'
        restock: { type: String },      // e.g. 'payqusta_restock' or 'restock_request'
      },
      // Per-tenant template language mapping
      templateLanguages: {
        invoice: { type: String, default: 'ar_EG' },
        statement: { type: String, default: 'ar_EG' },
        reminder: { type: String, default: 'ar_EG' },
        payment: { type: String, default: 'ar_EG' },
        restock: { type: String, default: 'en' },
      },
      notifications: {
        installmentReminder: { type: Boolean, default: true },
        invoiceCreated: { type: Boolean, default: true },
        lowStockAlert: { type: Boolean, default: true },
        supplierPaymentDue: { type: Boolean, default: true },
      },
      // Quota management for WhatsApp messages
      quota: {
        limit: { type: Number, default: 0 }, // Total allowed messages
        used: { type: Number, default: 0 },  // Messages sent so far
      },
      // Billing and pricing information
      billing: {
        pricePerMessage: { type: Number, default: 1.5 }, // e.g. 1.5 EGP per message (including markup)
        alertThreshold: { type: Number, default: 20 },   // Alert when only 20 messages are left
      }
    },
    subscription: {
      plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        default: null
      },
      status: {
        type: String,
        enum: ['active', 'trial', 'past_due', 'suspended', 'cancelled'],
        default: 'trial',
      },
      trialEndsAt: { type: Date },
      currentPeriodStart: { type: Date },
      currentPeriodEnd: { type: Date },
      // Billing gateway info
      gateway: {
        type: String,
        enum: ['stripe', 'paymob', 'instapay', 'vodafone_cash', 'manual', null],
        default: null
      },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      paymobOrderId: { type: String, default: null }, // for latest payment
      // Stored snapshot of limits (in case plan changes but tenant keeps grandfathered limits)
      maxProducts: { type: Number, default: 50 },
      maxCustomers: { type: Number, default: 100 },
      maxUsers: { type: Number, default: 3 },
      maxBranches: { type: Number, default: 1 }
    },
    // Dashboard widget configuration
    dashboardWidgets: [
      {
        widgetId: String,
        position: { x: Number, y: Number, w: Number, h: Number },
        visible: { type: Boolean, default: true },
      },
    ],
    // CCTV Cameras
    cameras: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true }, // HLS (.m3u8), MP4, or Embed URL
        type: { type: String, enum: ['stream', 'embed'], default: 'stream' },
        branch: { type: String }, // Optional: link to specific branch
      }
    ],
    // Purchased Add-ons (Premium Features)
    addons: [{
      type: String // We will store the Addon 'key' here
    }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
tenantSchema.index({ owner: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ customDomain: 1 }, { unique: true, sparse: true });

// Pre-save Migration: Handle legacy data
tenantSchema.pre('save', function (next) {
  if (typeof this.whatsapp === 'string') {
    this.whatsapp = undefined;
  }

  // Fix legacy plan values stored as strings (e.g. "pro") instead of ObjectId
  if (this.subscription?.plan && !mongoose.isValidObjectId(this.subscription.plan)) {
    this.subscription.plan = null;
  }

  // Set trial if new tenant (14 days freemium), unless already active (e.g., Free Plan)
  if (this.isNew && !this.subscription.trialEndsAt && this.subscription.status !== 'active') {
    const trialDays = 14;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    this.subscription.trialEndsAt = trialEnd;
    this.subscription.status = 'trial';
  }

  // Generate slug
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\u0621-\u064A\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Unset empty custom domains so sparse index ignores them
  if (!this.customDomain || this.customDomain.trim() === '') {
    this.customDomain = undefined;
  }

  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);
