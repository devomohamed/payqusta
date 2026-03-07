const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Product = require('../src/models/Product');

async function checkIndexes() {
    try {
        const uri = process.env.MONGODB_URI;
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const indexes = await Product.collection.getIndexes();
        console.log('Product Indexes:', JSON.stringify(indexes, null, 2));

        const emptyBarcodesCount = await Product.countDocuments({ barcode: '' });
        const nullBarcodesCount = await Product.countDocuments({ barcode: null });
        console.log(`Empty barcodes: ${emptyBarcodesCount}, Null barcodes: ${nullBarcodesCount}`);

        const emptySkusCount = await Product.countDocuments({ sku: '' });
        const nullSkusCount = await Product.countDocuments({ sku: null });
        console.log(`Empty SKUs: ${emptySkusCount}, Null SKUs: ${nullSkusCount}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkIndexes();
