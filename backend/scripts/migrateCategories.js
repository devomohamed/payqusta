const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Tenant = require('../src/models/Tenant');

async function migrate() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/payqusta';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const tenants = await Tenant.find({});
        for (const tenant of tenants) {
            console.log(`Processing tenant: ${tenant.name}`);

            const uniqueCategories = await Product.aggregate([
                { $match: { tenant: tenant._id, category: { $type: 'string' } } },
                { $group: { _id: '$category' } }
            ]);

            for (const cat of uniqueCategories) {
                const categoryName = cat._id;
                if (!categoryName) continue;

                let category = await Category.findOne({ tenant: tenant._id, name: categoryName });
                if (!category) {
                    category = await Category.create({
                        tenant: tenant._id,
                        name: categoryName,
                        isActive: true
                    });
                }

                await Product.collection.updateMany(
                    { tenant: tenant._id, category: categoryName },
                    { $set: { category: category._id, categoryName: categoryName } }
                );
            }
        }
        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
