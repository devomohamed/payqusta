const mongoose = require('mongoose');
require('dotenv').config();

async function deepDiag() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const col = db.collection('products');

        const tenantId = new mongoose.Types.ObjectId('698e40991112e0b3f075fe2d');
        const docs = await col.find({ tenant: tenantId }).toArray();

        console.log(`Inspecting ${docs.length} docs for tenant 698e40991112e0b3f075fe2d`);

        for (const d of docs) {
            console.log(`ID: ${d._id}, Name: ${d.name}, Barcode: ${JSON.stringify(d.barcode)}, Type: ${typeof d.barcode}, HasKey: ${Object.prototype.hasOwnProperty.call(d, 'barcode')}`);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
deepDiag();
