const mongoose = require('mongoose');
const User = require('./src/models/User');
const { ROLES } = require('./config/constants');
require('dotenv').config({ path: '../.env' });

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payqusta');
  const user = await User.findOne({ email: 'bahr@payqusta.com' });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  console.log('User Role:', user.role);
  console.log('ROLES.ADMIN:', ROLES.ADMIN);
  console.log('Match:', user.role === ROLES.ADMIN);
  process.exit(0);
}

debug().catch(err => {
  console.error(err);
  process.exit(1);
});
