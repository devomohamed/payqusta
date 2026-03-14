process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOG_SILENT = process.env.LOG_SILENT || 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const mongoose = require('mongoose');

beforeAll(() => {
  jest.setTimeout(60000);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
