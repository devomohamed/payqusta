const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../src/models/Product');

async function diag() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const docs = await Product.find({ $or: [{ barcode: null }, { barcode: '' }] });
        console.log('Products with null/empty barcode:', docs.length);
        docs.forEach(d => console.log(d._id, d.name, '|' + d.barcode + '|'));
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
diag();
