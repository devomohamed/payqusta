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
const {
  runtimeState,
  startStartupTask,
  completeStartupTask,
  registerJob,
  trackJobLockAcquired,
} = require('../../src/ops/runtimeState');
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
    runtimeState.jobLocks.clear();

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
    trackJobLockAcquired({
      key: 'stock_monitor:global',
      jobName: 'stock_monitor',
      contextKey: 'global',
      ownerId: 'worker-1',
      acquiredAt: new Date('2026-03-15T12:00:00.000Z'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata: { operation: 'checkStockLevels' },
    });

    const res = await api
      .get('/api/v1/ops/status')
      .set('Authorization', 'Bearer vendor-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.process).toBeDefined();
    expect(res.body.startup.total).toBeGreaterThanOrEqual(1);
    expect(res.body.jobs.total).toBeGreaterThanOrEqual(1);
    expect(res.body.jobLocks).toEqual(expect.objectContaining({
      active: 1,
      expired: 0,
    }));
    expect(res.body.config.integrations).toEqual(expect.objectContaining({
      bostaWebhookSecretConfigured: expect.any(Boolean),
      paymobApiKeyConfigured: expect.any(Boolean),
    }));
  });

  it('returns protected ops metrics in prometheus text format', async () => {
    startStartupTask('database_connection', { description: 'Primary DB connection' });
    completeStartupTask('database_connection');
    registerJob('product_trends', { schedule: '0 2 * * *', category: 'analytics' });
    trackJobLockAcquired({
      key: 'product_trends:global',
      jobName: 'product_trends',
      contextKey: 'global',
      ownerId: 'worker-2',
      acquiredAt: new Date('2026-03-15T12:00:00.000Z'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata: { operation: 'analyzeTrends' },
    });

    const res = await api
      .get('/api/v1/ops/metrics')
      .set('Authorization', 'Bearer vendor-token');

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('payqusta_app_ready');
    expect(res.text).toContain('payqusta_jobs_total');
    expect(res.text).toContain('payqusta_job_locks_active');
    expect(res.text).toContain('payqusta_startup_task_status{task="database_connection"}');
    expect(res.text).toContain('payqusta_job_status{job="product_trends"}');
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
