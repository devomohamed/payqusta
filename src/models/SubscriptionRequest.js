const mongoose = require('mongoose');

const subscriptionRequestSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
        },
        gateway: {
            type: String,
            enum: ['instapay', 'vodafone_cash'],
            required: true,
        },
        receiptImage: {
            type: String, // Base64 string or image URL
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        rejectionReason: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
