const mongoose = require('mongoose');
require('dotenv').config();

async function findTrueDups() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const dups = await db.collection('products').aggregate([
            { $match: { barcode: { $ne: null, $ne: '' } } },
            { $group: { _id: { tenant: '$tenant', barcode: '$barcode' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();
        console.log('True Intra-Tenant Duplicates:', JSON.stringify(dups, null, 2));
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
findTrueDups();
