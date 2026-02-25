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
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
