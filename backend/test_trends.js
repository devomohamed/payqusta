const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ProductTrendsJob = require('./src/jobs/ProductTrendsJob');

dotenv.config();

async function run() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/payqusta';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const job = new ProductTrendsJob();
        console.log('Starting manual job run...');
        await job.analyzeTrends();
        console.log('Job finished successfully.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

run();
