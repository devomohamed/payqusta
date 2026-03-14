const mongoose = require('mongoose');

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || '';
const TEST_DB_NAME = process.env.TEST_MONGODB_DB_NAME || 'payqusta_e2e';

const hasDbTestEnv = () => Boolean(TEST_MONGODB_URI);

async function connectTestDatabase() {
  if (!hasDbTestEnv()) {
    throw new Error('TEST_MONGODB_URI is required for DB-backed E2E tests');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(TEST_MONGODB_URI, {
    dbName: TEST_DB_NAME,
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  });

  return mongoose.connection;
}

async function clearTestDatabase() {
  if (mongoose.connection.readyState !== 1) return;

  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
}

async function disconnectTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  TEST_DB_NAME,
  hasDbTestEnv,
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
};
