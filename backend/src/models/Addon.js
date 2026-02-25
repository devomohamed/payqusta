const mongoose = require('mongoose');

const addonSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'اسم الإضافة مطلوب'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        key: {
            type: String,
            required: [true, 'المعرف البرمجي للإضافة مطلوب'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        price: {
            type: Number,
            required: [true, 'سعر الإضافة مطلوب'],
            default: 0,
        },
        currency: {
            type: String,
            default: 'EGP',
        },
        category: {
            type: String,
            enum: ['reports', 'integrations', 'templates', 'other'],
            default: 'other',
        },
        features: [{
            type: String
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Addon', addonSchema);
