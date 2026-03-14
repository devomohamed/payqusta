const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
            index: true,
        },
        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
            required: true,
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        variant: {
            sku: String,
            name: String
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        reason: {
            type: String,
            required: true,
            enum: ['defective', 'wrong_item', 'changed_mind', 'other']
        },
        description: {
            type: String,
            maxlength: 500
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
            index: true
        },
        adminNotes: {
            type: String
        },
        refundAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        refundStatus: {
            type: String,
            enum: ['none', 'pending', 'refunded', 'failed'],
            default: 'none'
        },
        refundedAt: {
            type: Date
        },
        restockedQuantity: {
            type: Number,
            default: 0,
            min: 0
        },
        restockedAt: {
            type: Date
        },
        completedAt: {
            type: Date
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
