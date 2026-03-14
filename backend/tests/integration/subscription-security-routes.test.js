jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Plan', () => ({
  findById: jest.fn(),
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
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createSelectResult = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

describe('Subscription webhook security', () => {
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
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    }));
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
    expect(Tenant.findById).not.toHaveBeenCalled();
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
});
