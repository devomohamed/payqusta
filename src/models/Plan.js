const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'اسم الباقة مطلوب'],
            trim: true,
            unique: true
        },
        description: {
            type: String,
            trim: true
        },
        price: {
            type: Number,
            required: [true, 'سعر الباقة مطلوب']
        },
        currency: {
            type: String,
            default: 'EGP'
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly'
        },
        // Stripe references
        stripeProductId: {
            type: String,
            default: null
        },
        stripePriceId: {
            type: String,
            default: null
        },
        // Paymob references 
        paymobIntegrationId: {
            type: String,
            default: null
        },
        // Limits and features
        features: [{
            type: String
        }],
        limits: {
            maxProducts: { type: Number, default: 50 },
            maxCustomers: { type: Number, default: 100 },
            maxUsers: { type: Number, default: 3 },
            maxBranches: { type: Number, default: 1 },
            storageLimitMB: { type: Number, default: 1024 }, // 1GB default
            freeWhatsappMessages: { type: Number, default: 0 } // Default free messages per cycle
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isPopular: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Plan', planSchema);
