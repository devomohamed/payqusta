const mongoose = require('mongoose');

const purchaseReturnSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Supplier',
            required: true,
            index: true,
        },
        purchaseInvoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SupplierPurchaseInvoice',
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            required: true,
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true,
                },
                variantId: mongoose.Schema.Types.ObjectId,
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                unitCost: {
                    type: Number,
                    required: true,
                },
                totalCost: {
                    type: Number,
                    required: true,
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['completed', 'cancelled'],
            default: 'completed',
        },
        returnNumber: {
            type: String,
            required: true,
            unique: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        notes: String,
    },
    { timestamps: true }
);

// Auto-generate return number (Debit Note number)
purchaseReturnSchema.pre('validate', async function (next) {
    if (!this.returnNumber && this.tenant) {
        const count = await this.constructor.countDocuments({ tenant: this.tenant });
        this.returnNumber = `PR-${(count + 1).toString().padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);
