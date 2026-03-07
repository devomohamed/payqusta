const mongoose = require('mongoose');
require('dotenv').config();

async function extremeFix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('products');

        console.log('1. Identifying all products with non-string barcodes...');
        const allDocs = await collection.find({}).toArray();
        const toUnset = [];

        for (const doc of allDocs) {
            if (typeof doc.barcode !== 'string' || doc.barcode === '') {
                toUnset.push(doc._id);
            }
        }

        console.log(`Found ${toUnset.length} documents with non-string or empty barcodes.`);

        if (toUnset.length > 0) {
            const res = await collection.updateMany(
                { _id: { $in: toUnset } },
                { $unset: { barcode: "" } }
            );
            console.log(`Unset barcode in ${res.modifiedCount} documents.`);
        }

        console.log('2. Double checking for intra-tenant dups...');
        const dups = await collection.aggregate([
            { $match: { barcode: { $type: 'string', $ne: '' } } },
            { $group: { _id: { tenant: '$tenant', barcode: '$barcode' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        for (const d of dups) {
            const idsToUnset = d.ids.slice(1);
            await collection.updateMany({ _id: { $in: idsToUnset } }, { $unset: { barcode: "" } });
            console.log(`Unset ${idsToUnset.length} dups for barcode ${d._id.barcode}`);
        }

        console.log('3. Creating index...');
        await collection.createIndex(
            { tenant: 1, barcode: 1 },
            { unique: true, sparse: true, background: true }
        );
        console.log('Barcode index created successfully!');

        await mongoose.disconnect();
    } catch (e) {
        console.error('FAILED:', e.message);
        process.exit(1);
    }
}
extremeFix();
