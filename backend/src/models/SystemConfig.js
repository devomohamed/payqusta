const mongoose = require('mongoose');

const gatewaySchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    configured: { type: Boolean, default: false },
    label: { type: String, default: '' },
  },
  { _id: false }
);

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    payments: {
      stripe: { ...gatewaySchema.obj, label: { type: String, default: 'Stripe' } },
      paymob: { ...gatewaySchema.obj, label: { type: String, default: 'Paymob' } },
      instapay: {
        ...gatewaySchema.obj,
        label: { type: String, default: 'InstaPay' },
        account: { type: String, default: '' },
      },
      vodafone_cash: {
        ...gatewaySchema.obj,
        label: { type: String, default: 'Vodafone Cash' },
        number: { type: String, default: '' },
      },
    },
    notifications: {
      platformEmail: {
        enabled: { type: Boolean, default: false },
        host: { type: String, default: '' },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        user: { type: String, default: '' },
        pass: { type: String, default: '' },
        fromEmail: { type: String, default: '' },
        fromName: { type: String, default: 'PayQusta' },
      },
      platformSms: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ['mock', 'twilio', 'twilio_verify', 'generic_http', 'disabled'],
          default: 'mock',
        },
        baseUrl: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        apiSecret: { type: String, default: '' },
        senderId: { type: String, default: 'PayQusta' },
        supportsCustomSenderId: { type: Boolean, default: true },
      },
      defaults: {
        routingMode: {
          type: String,
          enum: ['smart', 'email_only', 'sms_only', 'whatsapp_only', 'whatsapp_preferred'],
          default: 'smart',
        },
        fallbackEnabled: { type: Boolean, default: true },
        allowEmailFallbackToSms: { type: Boolean, default: true },
        allowSmsFallbackToEmail: { type: Boolean, default: true },
        activationLinkBaseUrl: { type: String, default: '' },
        shortLinkDomain: { type: String, default: '' },
        poweredByEnabled: { type: Boolean, default: true },
        poweredByUrl: { type: String, default: 'https://payqusta.com' },
      },
      tenantPolicy: {
        allowCustomSmtp: { type: Boolean, default: true },
        allowCustomSms: { type: Boolean, default: true },
        allowPlatformEmailFallback: { type: Boolean, default: true },
        allowPlatformSmsFallback: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
