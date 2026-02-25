const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
    {
        referrer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
        },
        referred: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            default: null,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'registered', 'converted', 'rewarded'],
            default: 'pending',
        },
        reward: {
            type: {
                type: String,
                enum: ['discount', 'free_month', 'credit'],
                default: 'free_month',
            },
            value: { type: Number, default: 1 }, // 1 free month
            claimed: { type: Boolean, default: false },
        },
        referredEmail: { type: String },
        convertedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

referralSchema.index({ referrer: 1 }); // code index is already created by unique:true

module.exports = mongoose.model('Referral', referralSchema);
