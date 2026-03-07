const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

const Product = require(path.resolve(__dirname, '../../backend/src/models/Product'));

async function checkIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const indexes = await Product.collection.getIndexes();
        console.log('Product Indexes:', JSON.stringify(indexes, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkIndexes();
