const mongoose = require('mongoose');
require('dotenv').config();

async function finalFix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('products');

        console.log('1. Unsetting all null/empty barcodes...');
        const res1 = await collection.updateMany(
            { $or: [{ barcode: null }, { barcode: '' }] },
            { $unset: { barcode: "" } }
        );
        console.log(`Unset in ${res1.modifiedCount} documents.`);

        console.log('2. Unsetting intra-tenant duplicates (except first)...');
        const dups = await collection.aggregate([
            { $match: { barcode: { $ne: null, $ne: '' } } },
            { $group: { _id: { tenant: '$tenant', barcode: '$barcode' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        for (const d of dups) {
            const toUnset = d.ids.slice(1);
            await collection.updateMany({ _id: { $in: toUnset } }, { $unset: { barcode: "" } });
            console.log(`Unset barcode for ${toUnset.length} duplicate docs in tenant ${d._id.tenant}`);
        }

        console.log('3. Creating sparse unique index...');
        try {
            await collection.createIndex(
                { tenant: 1, barcode: 1 },
                { unique: true, sparse: true, background: true }
            );
            console.log('Barcode index created successfully!');
        } catch (e) {
            console.error('Index creation failed:', e.message);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
finalFix();
