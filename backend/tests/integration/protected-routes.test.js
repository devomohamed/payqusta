
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Role', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Customer', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/Invoice', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Role = require('../../src/models/Role');
const Customer = require('../../src/models/Customer');
const Invoice = require('../../src/models/Invoice');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createSelectResult = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

const createCustomerQuery = (customers) => {
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(customers),
  };

  return query;
};

describe('Protected route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('applies tenant isolation on protected customer reads', async () => {
    const user = {
      _id: 'user-1',
      tenant: 'tenant-1',
      role: 'vendor',
      isActive: true,
      sessionVersion: 0,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    };

    jwt.verify.mockReturnValue({
      id: 'user-1',
      tenant: 'tenant-1',
      iat: 2000000000,
      sv: 0,
    });
    User.findById.mockReturnValue(createSelectResult(user));
    Role.findById.mockResolvedValue(null);
    Role.findOne.mockResolvedValue(null);
    Customer.find.mockReturnValue(createCustomerQuery([
      { _id: 'customer-1', name: 'Tenant customer', phone: '0100' },
    ]));
    Customer.countDocuments.mockResolvedValue(1);

    const res = await api
      .get('/api/v1/customers')
      .set('Authorization', 'Bearer valid-token')
      .query({ search: 'Tenant' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Customer.find).toHaveBeenCalledWith({
      tenant: 'tenant-1',
      isActive: true,
      $or: [
        { name: { $regex: 'Tenant', $options: 'i' } },
        { phone: { $regex: 'Tenant', $options: 'i' } },
      ],
    });
    expect(Customer.countDocuments).toHaveBeenCalledWith({
      tenant: 'tenant-1',
      isActive: true,
      $or: [
        { name: { $regex: 'Tenant', $options: 'i' } },
        { phone: { $regex: 'Tenant', $options: 'i' } },
      ],
    });
  });

  it('blocks coordinators from invoice refund routes at route-level permission checks', async () => {
    const user = {
      _id: 'user-2',
      tenant: 'tenant-2',
      role: 'coordinator',
      isActive: true,
      sessionVersion: 0,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    };

    jwt.verify.mockReturnValue({
      id: 'user-2',
      tenant: 'tenant-2',
      iat: 2000000000,
      sv: 0,
    });
    User.findById.mockReturnValue(createSelectResult(user));
    Role.findById.mockResolvedValue(null);
    Role.findOne.mockResolvedValue(null);

    const res = await api
      .post('/api/v1/invoices/507f1f77bcf86cd799439011/refund')
      .set('Authorization', 'Bearer valid-token')
      .send({ reason: 'Coordinator should be denied' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(Invoice.findOne).not.toHaveBeenCalled();
  });
});
