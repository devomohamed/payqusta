const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../src/models/Product');

async function robustCleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({
            $or: [
                { barcode: '' },
                { barcode: null },
                { sku: '' },
                { sku: null },
                { 'variants.barcode': '' },
                { 'variants.barcode': null },
                { 'variants.sku': '' },
                { 'variants.sku': null }
            ]
        });

        console.log(`Processing ${products.length} products...`);

        for (const doc of products) {
            let modified = false;

            if (doc.barcode === '' || doc.barcode === null) {
                doc.barcode = undefined;
                modified = true;
            }
            if (doc.sku === '' || doc.sku === null) {
                doc.sku = undefined;
                modified = true;
            }

            if (doc.variants && doc.variants.length > 0) {
                doc.variants.forEach(v => {
                    if (v.barcode === '' || v.barcode === null) {
                        v.barcode = undefined;
                        modified = true;
                    }
                    if (v.sku === '' || v.sku === null) {
                        v.sku = undefined;
                        modified = true;
                    }
                });
            }

            if (modified) {
                // Use markModified for mixed types/maps if necessary, 
                // but here standard assignment to undefined + save() works for $unset in Mongoose
                await doc.save();
                console.log(`Cleaned up product: ${doc._id} (${doc.name})`);
            }
        }

        console.log('Robust cleanup completed.');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

robustCleanup();
