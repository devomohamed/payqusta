/**
 * Data Migration Script
 * Imports customers, products, and invoices from Excel/CSV files into PayQusta.
 * 
 * Usage: node scripts/migrate.js --file=data.xlsx --tenant=TENANT_ID --type=customers|products
 */
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const Customer = require('../src/models/Customer');
const Product = require('../src/models/Product');

const MONGODB_URI = process.env.MONGODB_URI;

const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, val] = arg.replace('--', '').split('=');
    acc[key] = val;
    return acc;
}, {});

if (!args.file || !args.tenant || !args.type) {
    console.error('Usage: node scripts/migrate.js --file=data.xlsx --tenant=TENANT_ID --type=customers|products');
    process.exit(1);
}

const run = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const filePath = path.resolve(args.file);
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        console.log(`📄 Found ${rows.length} rows in ${args.file}`);

        if (args.type === 'customers') {
            const customers = rows.map(row => ({
                tenant: args.tenant,
                name: row['الاسم'] || row['Name'] || row['name'] || '',
                phone: String(row['الهاتف'] || row['Phone'] || row['phone'] || ''),
                email: row['البريد'] || row['Email'] || row['email'] || '',
                address: row['العنوان'] || row['Address'] || row['address'] || '',
            })).filter(c => c.name);

            const result = await Customer.insertMany(customers, { ordered: false });
            console.log(`✅ Imported ${result.length} customers`);
        }

        if (args.type === 'products') {
            const products = rows.map(row => ({
                tenant: args.tenant,
                name: row['المنتج'] || row['Product'] || row['name'] || '',
                sku: row['SKU'] || row['sku'] || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                price: Number(row['السعر'] || row['Price'] || row['price'] || 0),
                cost: Number(row['التكلفة'] || row['Cost'] || row['cost'] || 0),
                quantity: Number(row['الكمية'] || row['Quantity'] || row['quantity'] || 0),
                category: row['الفئة'] || row['Category'] || row['category'] || 'عام',
            })).filter(p => p.name);

            const result = await Product.insertMany(products, { ordered: false });
            console.log(`✅ Imported ${result.length} products`);
        }

        console.log('🎉 Migration complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await mongoose.disconnect();
    }
};

run();
