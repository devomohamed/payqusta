const mongoose = require('mongoose');
require('dotenv').config();

async function cleanAll() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const col = db.collection('products');

        console.log('1. Cleaning top-level barcodes...');
        const all = await col.find({}).toArray();
        let count = 0;
        for (const d of all) {
            if (typeof d.barcode !== 'string' || d.barcode.trim() === '') {
                await col.updateOne({ _id: d._id }, { $unset: { barcode: "" } });
                count++;
            }
        }
        console.log(`Unset top-level in ${count} docs.`);

        console.log('2. Cleaning variants barcodes...');
        let vCount = 0;
        for (const d of all) {
            if (d.variants && Array.isArray(d.variants)) {
                let modified = false;
                const newVariants = d.variants.map(v => {
                    if (typeof v.barcode !== 'string' || v.barcode.trim() === '') {
                        const { barcode, ...rest } = v;
                        modified = true;
                        return rest;
                    }
                    return v;
                });
                if (modified) {
                    await col.updateOne({ _id: d._id }, { $set: { variants: newVariants } });
                    vCount++;
                }
            }
        }
        console.log(`Cleaned variants in ${vCount} docs.`);

        console.log('3. Creating index...');
        await col.createIndex(
            { tenant: 1, barcode: 1 },
            { unique: true, sparse: true, background: true }
        );
        console.log('SUCCESS: Index created!');

        await mongoose.disconnect();
    } catch (e) {
        console.error('FAILED:', e.message);
        process.exit(1);
    }
}
cleanAll();
