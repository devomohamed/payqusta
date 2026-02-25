const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

async function verifyFix() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const testTenantName = `Test Tenant ${Date.now()}`;
        const testEmail = `test-${Date.now()}@test.com`;

        console.log(`Attempting to create tenant: ${testTenantName}`);

        // Simulate creation logic from adminController.js
        const tenant = await Tenant.create({
            name: testTenantName,
            slug: testTenantName.toLowerCase().replace(/[^\w\u0621-\u064A\s-]/g, '').replace(/\s+/g, '-'),
            subscription: {
                plan: 'enterprise',
                status: 'active',
                maxProducts: 10000,
                maxCustomers: 10000,
                maxUsers: 50,
                trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
            settings: {
                categories: [
                    { name: 'عام', isVisible: true },
                    { name: 'ملابس', isVisible: true },
                    { name: 'إلكترونيات', isVisible: true },
                    { name: 'مشروبات', isVisible: true },
                    { name: 'مأكولات', isVisible: true }
                ],
            }
        });

        console.log('✅ Tenant created successfully!');
        console.log('Categories:', JSON.stringify(tenant.settings.categories, null, 2));

        // Verify category deletion logic (conceptual check of the fix)
        console.log('Verifying category deletion pull logic...');
        const updatedTenant = await Tenant.findByIdAndUpdate(
            tenant._id,
            { $pull: { 'settings.categories': { name: 'عام' } } },
            { new: true }
        );

        const hasAm = updatedTenant.settings.categories.some(c => c.name === 'عام');
        if (!hasAm) {
            console.log('✅ Category "عام" removed successfully using object pull!');
        } else {
            console.log('❌ Category "عام" was NOT removed.');
        }

        // Cleanup
        await Tenant.findByIdAndDelete(tenant._id);
        console.log('Test tenant cleaned up.');

    } catch (err) {
        console.error('❌ Verification failed:');
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

verifyFix();
