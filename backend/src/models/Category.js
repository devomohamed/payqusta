const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'اسم القسم مطلوب'],
            trim: true,
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        description: {
            type: String,
            trim: true,
        },
        icon: {
            type: String,
            default: '📦',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
categorySchema.index({ tenant: 1, name: 1, parent: 1 }, { unique: true });

// Virtual for children
categorySchema.virtual('children', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent',
});

module.exports = mongoose.model('Category', categorySchema);
