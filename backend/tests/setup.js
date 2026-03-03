process.env.NODE_ENV = process.env.NODE_ENV || 'test';

beforeAll(() => {
  jest.setTimeout(30000);
});
