require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('./src/models/Plan');

const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const plans = [
            {
                name: 'الباقة الأساسية',
                description: 'باقة مخصصة للمبتدئين',
                price: 0,
                currency: 'EGP',
                billingCycle: 'monthly',
                features: ['إدارة المنتجات', 'نقطة بيع مجانية', '1 فرع الأساسي'],
                limits: {
                    maxProducts: 50,
                    maxCustomers: 100,
                    maxUsers: 1,
                    maxBranches: 1,
                    freeWhatsappMessages: 0
                },
                isActive: true,
            },
            {
                name: 'باقة المحترفين',
                description: 'باقة مخصصة للأعمال المتنامية',
                price: 499,
                currency: 'EGP',
                billingCycle: 'monthly',
                features: ['كل ميزات الأساسية', 'تنبيهات المخزون', 'واتساب مجاني محدود', 'أكثر من فرع'],
                limits: {
                    maxProducts: 1000,
                    maxCustomers: 5000,
                    maxUsers: 5,
                    maxBranches: 3,
                    freeWhatsappMessages: 50
                },
                isActive: true,
                isPopular: true,
            },
            {
                name: 'باقة الشركات',
                description: 'باقة متقدمة للشركات الواسعة',
                price: 1499,
                currency: 'EGP',
                billingCycle: 'monthly',
                features: ['كل الميزات', 'تحليلات متقدمة', 'إدارة فروع مفتوحة', 'دعم فني مخصص'],
                limits: {
                    maxProducts: 100000,
                    maxCustomers: 100000,
                    maxUsers: 20,
                    maxBranches: 10,
                    freeWhatsappMessages: 500
                },
                isActive: true,
            }
        ];

        await Plan.deleteMany(); // Clear existing
        await Plan.insertMany(plans);

        console.log('✅ Plans Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
};

seedPlans();
