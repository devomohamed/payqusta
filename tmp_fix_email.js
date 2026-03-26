const mongoose = require('mongoose');

async function run() {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/payqusta');
    console.log('Connected to MongoDB');
    
    const SystemConfig = mongoose.model('SystemConfig', new mongoose.Schema({}, { strict: false }));
    
    const result = await SystemConfig.updateOne(
      { key: 'default' },
      { $set: { 'notifications.platformEmail.enabled': false } }
    );
    
    console.log('Update result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
