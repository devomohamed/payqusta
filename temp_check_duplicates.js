const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

const Product = require(path.resolve(__dirname, '../../backend/src/models/Product'));

async function checkDuplicates() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const productsWithEmptyBarcode = await Product.find({
            $or: [
                { barcode: '' },
                { barcode: null }
            ]
        });

        const productsWithEmptySku = await Product.find({
            $or: [
                { sku: '' },
                { sku: null }
            ]
        });

        console.log(`Products with empty/null barcode: ${productsWithEmptyBarcode.length}`);
        productsWithEmptyBarcode.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.name}, Barcode: "${p.barcode}"`);
        });

        console.log(`Products with empty/null sku: ${productsWithEmptySku.length}`);
        productsWithEmptySku.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.name}, SKU: "${p.sku}"`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkDuplicates();
