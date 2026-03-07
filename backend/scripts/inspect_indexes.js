const mongoose = require('mongoose');
require('dotenv').config();

async function inspectIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const indexes = await db.collection('products').listIndexes().toArray();
        console.log('Detailed Product Indexes:', JSON.stringify(indexes, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

inspectIndexes();
