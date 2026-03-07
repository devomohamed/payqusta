const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Product = require('../src/models/Product');

async function cleanup() {
    try {
        const uri = process.env.MONGODB_URI;
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Find products with empty or null barcode/sku
        const query = {
            $or: [
                { barcode: '' },
                { barcode: null },
                { sku: '' },
                { sku: null }
            ]
        };

        const count = await Product.countDocuments(query);
        console.log(`Found ${count} products requiring cleanup.`);

        if (count > 0) {
            const result = await Product.updateMany(
                query,
                { $unset: { barcode: "", sku: "" } }
            );
            console.log(`Updated ${result.modifiedCount} products (unset barcode/sku).`);
        }

        // Also check variants
        const variantQuery = {
            $or: [
                { 'variants.barcode': '' },
                { 'variants.barcode': null },
                { 'variants.sku': '' },
                { 'variants.sku': null }
            ]
        };

        const variantProducts = await Product.find(variantQuery);
        console.log(`Found ${variantProducts.length} products with variants requiring cleanup.`);

        for (const product of variantProducts) {
            let modified = false;
            product.variants.forEach(v => {
                if (v.barcode === '' || v.barcode === null) {
                    v.barcode = undefined;
                    modified = true;
                }
                if (v.sku === '' || v.sku === null) {
                    v.sku = undefined;
                    modified = true;
                }
            });
            if (modified) {
                await product.save();
            }
        }

        console.log('Cleanup completed.');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanup();
