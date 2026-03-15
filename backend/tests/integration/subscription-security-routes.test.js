jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Plan', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Product', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/Customer', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/Branch', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/SystemConfig', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/services/NotificationService', () => ({
  onNewSubscriptionRequest: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/Tenant');
const Plan = require('../../src/models/Plan');
const Product = require('../../src/models/Product');
const Customer = require('../../src/models/Customer');
const Branch = require('../../src/models/Branch');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createSelectResult = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

const createPopulateResult = (result) => ({
  populate: jest.fn().mockResolvedValue(result),
});

const buildTenantSubscription = (overrides = {}) => ({
  _id: 'tenant-1',
  subscription: {
    status: 'active',
    trialEndsAt: new Date('2026-04-01T00:00:00.000Z'),
    maxProducts: 2,
    maxCustomers: 3,
    maxUsers: 2,
    maxBranches: 1,
    plan: null,
    ...overrides,
  },
});

describe('Subscription webhook security and enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.SUBSCRIPTION_INSTAPAY_WEBHOOK_SECRET = 'instapay-secret';

    jwt.verify.mockReturnValue({
      id: 'user-1',
      tenant: 'tenant-1',
      iat: 2000000000,
      sv: 0,
    });

    User.findById.mockReturnValue(createSelectResult({
      _id: 'user-1',
      id: 'user-1',
      tenant: 'tenant-1',
      role: 'vendor',
      isActive: true,
      sessionVersion: 0,
      customRole: null,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    }));

    Tenant.findById.mockReturnValue(createPopulateResult(buildTenantSubscription()));
    Product.countDocuments.mockResolvedValue(0);
    Customer.countDocuments.mockResolvedValue(0);
    User.countDocuments.mockResolvedValue(0);
    Branch.countDocuments.mockResolvedValue(0);
  });

  afterEach(() => {
    delete process.env.SUBSCRIPTION_INSTAPAY_WEBHOOK_SECRET;
  });

  it('rejects subscription webhooks with an invalid shared secret', async () => {
    const res = await api
      .post('/api/v1/subscriptions/webhook/instapay')
      .set('Authorization', 'Bearer valid-token')
      .set('x-subscription-webhook-secret', 'wrong-secret')
      .send({
        status: 'success',
        tenantId: 'tenant-1',
        planId: 'plan-1',
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(Tenant.findById).not.toHaveBeenCalledWith('tenant-1');
    expect(Plan.findById).not.toHaveBeenCalled();
  });

  it('processes subscription webhooks only when the shared secret is valid', async () => {
    const tenant = {
      _id: 'tenant-1',
      subscription: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    const plan = {
      _id: 'plan-1',
      billingCycle: 'monthly',
      limits: {
        maxProducts: 100,
        maxCustomers: 1000,
        maxUsers: 5,
        maxBranches: 3,
      },
    };

    Tenant.findById.mockResolvedValue(tenant);
    Plan.findById.mockResolvedValue(plan);

    const res = await api
      .post('/api/v1/subscriptions/webhook/instapay')
      .set('Authorization', 'Bearer valid-token')
      .set('x-subscription-webhook-secret', 'instapay-secret')
      .send({
        status: 'success',
        tenantId: 'tenant-1',
        planId: 'plan-1',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
    expect(Tenant.findById).toHaveBeenCalledWith('tenant-1');
    expect(Plan.findById).toHaveBeenCalledWith('plan-1');
    expect(tenant.save).toHaveBeenCalled();
    expect(tenant.subscription.status).toBe('active');
    expect(tenant.subscription.gateway).toBe('instapay');
  });

  it('blocks trial tenants after trial expiry before creating a branch', async () => {
    Tenant.findById.mockReturnValue(createPopulateResult(buildTenantSubscription({
      status: 'trial',
      trialEndsAt: new Date('2026-03-01T00:00:00.000Z'),
    })));

    const res = await api
      .post('/api/v1/branches')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Branch 2' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message || '')).toContain('14');
  });

  it('blocks past_due tenants before creating a branch', async () => {
    Tenant.findById.mockReturnValue(createPopulateResult(buildTenantSubscription({
      status: 'past_due',
    })));

    const res = await api
      .post('/api/v1/branches')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Branch 2' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message || '').length).toBeGreaterThan(0);
  });

  it('enforces product quota on the real products create route', async () => {
    Tenant.findById.mockReturnValue(createPopulateResult(buildTenantSubscription({
      maxProducts: 2,
    })));
    Product.countDocuments.mockResolvedValue(2);

    const res = await api
      .post('/api/v1/products')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Quota Product',
        cost: 10,
        price: 15,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message || '').length).toBeGreaterThan(0);
    expect(Product.countDocuments).toHaveBeenCalledWith({ tenant: 'tenant-1', isActive: true });
  });

  it('enforces user quota on the real auth users create route', async () => {
    Tenant.findById.mockReturnValue(createPopulateResult(buildTenantSubscription({
      maxUsers: 2,
    })));
    User.countDocuments.mockResolvedValue(2);

    const res = await api
      .post('/api/v1/auth/users')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Quota User',
        email: 'quota@example.com',
        phone: '01012345678',
        password: 'secret1',
        role: 'coordinator',
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message || '')).toContain('(2)');
    expect(User.countDocuments).toHaveBeenCalledWith({ tenant: 'tenant-1', isActive: true });
  });

  it('enforces branch quota on the real branches create route', async () => {
    Tenant.findById.mockReturnValue(createPopulateResult(buildTenantSubscription({
      maxBranches: 1,
    })));
    Branch.countDocuments.mockResolvedValue(1);

    const res = await api
      .post('/api/v1/branches')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Branch 2' });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message || '')).toContain('(1)');
    expect(Branch.countDocuments).toHaveBeenCalledWith({ tenant: 'tenant-1', isActive: true });
  });
});

