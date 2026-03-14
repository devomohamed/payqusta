jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const { runtimeState, startStartupTask, completeStartupTask, registerJob } = require('../../src/ops/runtimeState');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createSelectQuery = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

describe('Ops routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runtimeState.startupTasks.clear();
    runtimeState.jobs.clear();

    jwt.verify.mockReturnValue({
      id: '507f1f77bcf86cd799439011',
      tenant: '507f1f77bcf86cd799439012',
      sv: 0,
      iat: Math.floor(Date.now() / 1000),
    });

    User.findById.mockReturnValue(createSelectQuery({
      _id: '507f1f77bcf86cd799439011',
      role: 'vendor',
      tenant: '507f1f77bcf86cd799439012',
      isActive: true,
      sessionVersion: 0,
      changedPasswordAfter: () => false,
    }));
  });

  afterEach(() => {
    delete process.env.OPS_BEARER_TOKEN;
  });

  it('returns protected ops status with runtime and integration flags', async () => {
    startStartupTask('database_connection', { description: 'Primary DB connection' });
    completeStartupTask('database_connection');
    registerJob('stock_monitor', { schedule: '0 */6 * * *', category: 'inventory' });

    const res = await api
      .get('/api/v1/ops/status')
      .set('Authorization', 'Bearer vendor-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.process).toBeDefined();
    expect(res.body.startup.total).toBeGreaterThanOrEqual(1);
    expect(res.body.jobs.total).toBeGreaterThanOrEqual(1);
    expect(res.body.config.integrations).toEqual(expect.objectContaining({
      bostaWebhookSecretConfigured: expect.any(Boolean),
      paymobApiKeyConfigured: expect.any(Boolean),
    }));
  });

  it('returns protected ops metrics in prometheus text format', async () => {
    startStartupTask('database_connection', { description: 'Primary DB connection' });
    completeStartupTask('database_connection');
    registerJob('product_trends', { schedule: '0 2 * * *', category: 'analytics' });

    const res = await api
      .get('/api/v1/ops/metrics')
      .set('Authorization', 'Bearer vendor-token');

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('payqusta_app_ready');
    expect(res.text).toContain('payqusta_jobs_total');
    expect(res.text).toContain('payqusta_startup_task_status{task=\"database_connection\"}');
    expect(res.text).toContain('payqusta_job_status{job=\"product_trends\"}');
  });

  it('accepts OPS_BEARER_TOKEN without requiring JWT verification', async () => {
    process.env.OPS_BEARER_TOKEN = 'ops-static-token';

    const res = await api
      .get('/api/v1/ops/status')
      .set('Authorization', 'Bearer ops-static-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});
