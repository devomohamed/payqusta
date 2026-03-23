const mongoose = require('mongoose');

const notificationDispatchSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['user', 'customer'],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    purpose: {
      type: String,
      enum: ['activation', 'invitation', 'test'],
      default: 'activation',
    },
    preferredChannel: {
      type: String,
      enum: ['sms', 'email', 'auto', 'none'],
      default: 'auto',
    },
    channel: {
      type: String,
      enum: ['sms', 'email'],
      required: true,
    },
    isFallback: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    destinationMasked: {
      type: String,
      default: '',
    },
    provider: {
      type: String,
      default: '',
    },
    providerMessageId: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationDispatchSchema.index({ tenant: 1, actorType: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationDispatch', notificationDispatchSchema);
