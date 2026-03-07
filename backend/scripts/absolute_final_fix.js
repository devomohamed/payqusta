const mongoose = require('mongoose');
require('dotenv').config();

async function absoluteFinalFix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const col = db.collection('products');

        console.log('1. Unsetting all non-string or empty barcodes...');
        // We use a more direct approach since $not $type can be tricky in some shell environments via node
        const allDocs = await col.find({}).toArray();
        let unsetCount = 0;
        for (const d of allDocs) {
            if (typeof d.barcode !== 'string' || d.barcode.trim() === '') {
                await col.updateOne({ _id: d._id }, { $unset: { barcode: "" } });
                unsetCount++;
            }
        }
        console.log(`Unset in ${unsetCount} documents.`);

        console.log('2. Unsetting intra-tenant duplicates...');
        const dups = await col.aggregate([
            { $match: { barcode: { $type: 'string' } } },
            { $group: { _id: { tenant: '$tenant', barcode: '$barcode' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        for (const d of dups) {
            const toUnset = d.ids.slice(1);
            await col.updateMany({ _id: { $in: toUnset } }, { $unset: { barcode: "" } });
            console.log(`Unset ${toUnset.length} dups for barcode ${d._id.barcode}`);
        }

        console.log('3. Creating index...');
        try {
            await col.createIndex(
                { tenant: 1, barcode: 1 },
                { unique: true, sparse: true, background: true }
            );
            console.log('SUCCESS: Barcode index created!');
        } catch (e) {
            console.error('FAILED:', e.message);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
absoluteFinalFix();
