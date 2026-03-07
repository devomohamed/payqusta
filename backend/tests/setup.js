process.env.NODE_ENV = process.env.NODE_ENV || 'test';
const mongoose = require('mongoose');

beforeAll(() => {
  jest.setTimeout(60000);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
