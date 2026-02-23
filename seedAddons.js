const mongoose = require('mongoose');
require('dotenv').config();

const Addon = require('./src/models/Addon');

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB...'))
    .catch(err => {
        console.error('❌ Could not connect to MongoDB:', err);
        process.exit(1);
    });

const addons = [
    {
        name: "حزمة التقارير المتقدمة",
        description: "احصل على وصول كامل لتحليلات أعمالك، بما في ذلك تقارير الأرباح والخسائر المعمقة، نظرة تفصيلية على المخزون، تقارير أداء المنتجات، وتحليلات العملاء المفصلة ومعدلات الدفع.",
        key: "advanced_reports",
        price: 499,
        currency: "EGP",
        category: "reports",
        features: [
            "تقرير الأرباح المتعمق مع هوامش الربح المتوقعة",
            "تقارير المخزون وتنبيهات النواقص",
            "تقارير تقييم العملاء والمخاطر",
            "تحليل أداء المنتجات والأعلى مبيعًا",
            "تصدير جميع التقارير إلى Excel"
        ],
        isActive: true
    }
];




const seedDB = async () => {
    try {

        console.log('Clearing existing addons...');
        await Addon.deleteMany({});
        console.log('Inserting new addons...');
        await Addon.insertMany(addons);

        console.log('✅ Addons seeded successfully!');
   
    } catch (err) {
        console.error('❌ Error seeding addons:', err);
    } finally {
        mongoose.connection.close();
        console.log('Database connection closed.');
    }
};

seedDB();
