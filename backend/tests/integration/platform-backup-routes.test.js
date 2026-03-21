jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/controllers/backupController', () => ({
  exportData: jest.fn(),
  exportJSON: jest.fn(),
  getStats: jest.fn(),
  getAutoSettings: jest.fn(),
  updateAutoSettings: jest.fn(),
  restoreData: jest.fn(),
  restoreJSON: jest.fn(),
}));

jest.mock('../../src/models/Plan', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/SystemConfig', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/models/PublicLead', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../src/services/backupExportService', () => ({
  buildTenantJsonBackup: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/Tenant');
const Plan = require('../../src/models/Plan');
const SystemConfig = require('../../src/models/SystemConfig');
const PublicLead = require('../../src/models/PublicLead');
const backupController = require('../../src/controllers/backupController');
const { buildTenantJsonBackup } = require('../../src/services/backupExportService');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createSelectResult = (result) => ({
  select: jest.fn(() => ({
    populate: jest.fn().mockResolvedValue(result),
  })),
});

const createLeanQuery = (result) => {
  const query = {
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
  };

  return query;
};

const createSelectLeanQuery = (result) => {
  const query = {
    select: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
  };

  return query;
};

describe('Platform backup routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.SUPER_ADMIN_EMAIL = 'owner@example.com';

    jwt.verify.mockReturnValue({
      id: 'super-admin-user',
      tenant: null,
      iat: 2000000000,
      sv: 0,
    });

    User.findById.mockReturnValue(createSelectResult({
      _id: 'super-admin-user',
      email: 'owner@example.com',
      role: 'admin',
      isSuperAdmin: true,
      isActive: true,
      sessionVersion: 0,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    }));
    Tenant.findById.mockResolvedValue(null);
    Tenant.findOne.mockResolvedValue(null);
    Tenant.create.mockImplementation(async (payload) => ({
      _id: 'created-tenant-id',
      ...payload,
    }));
    backupController.restoreJSON.mockImplementation(async (req, res) => (
      res.status(200).json({
        success: true,
        message: 'tenant restore ok',
        data: {
          totalImported: 3,
          totalSkipped: 1,
          report: {
            summary: {
              imported: 3,
              skipped: 1,
            },
          },
        },
      })
    ));
  });

  it('returns platform backup stats for the system owner', async () => {
    Plan.countDocuments.mockResolvedValue(3);
    SystemConfig.countDocuments.mockResolvedValue(1);
    PublicLead.countDocuments.mockResolvedValue(7);

    const res = await api
      .get('/api/v1/super-admin/backup/stats')
      .set('Authorization', 'Bearer valid-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.counts).toEqual({
      plans: 3,
      systemConfigs: 1,
      publicLeads: 7,
    });
    expect(res.body.data.supportedDomains).toEqual(['plans', 'systemConfigs', 'publicLeads']);
  });

  it('exports platform backup json domains', async () => {
    Plan.find.mockReturnValue(createLeanQuery([
      {
        name: 'Starter',
        price: 0,
        currency: 'EGP',
        billingCycle: 'monthly',
        limits: { maxProducts: 50, maxCustomers: 100, maxUsers: 3, maxBranches: 1 },
        features: [],
        isActive: true,
      },
    ]));
    SystemConfig.find.mockReturnValue(createLeanQuery([
      {
        key: 'default',
        payments: {
          stripe: { enabled: false, configured: false, label: 'Stripe' },
        },
      },
    ]));
    PublicLead.find.mockReturnValue(createLeanQuery([
      {
        name: 'Lead One',
        email: 'lead@example.com',
        phone: '01000000000',
        requestType: 'demo',
        status: 'new',
        submittedAt: '2026-03-15T00:00:00.000Z',
      },
    ]));

    const res = await api
      .get('/api/v1/super-admin/backup/export-json')
      .set('Authorization', 'Bearer valid-token');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');

    const payload = JSON.parse(res.text);
    expect(payload.scope).toBe('platform');
    expect(payload.counts).toEqual({
      plans: 1,
      systemConfigs: 1,
      publicLeads: 1,
    });
    expect(payload.data.plans[0].name).toBe('Starter');
    expect(payload.data.systemConfigs[0].key).toBe('default');
    expect(payload.data.publicLeads[0].email).toBe('lead@example.com');
  });

  it('restores platform backup json additively with validation details', async () => {
    const existingPlan = {
      name: 'Starter',
      price: 0,
      save: jest.fn().mockResolvedValue(true),
    };
    const existingConfig = {
      key: 'default',
      payments: {},
      save: jest.fn().mockResolvedValue(true),
    };

    Plan.findOne
      .mockResolvedValueOnce(existingPlan)
      .mockResolvedValueOnce(null);
    SystemConfig.findOne.mockResolvedValue(existingConfig);
    PublicLead.findOne.mockResolvedValue(null);
    Plan.create.mockResolvedValue({ _id: 'plan-pro' });
    SystemConfig.create.mockResolvedValue({ _id: 'cfg-default' });
    PublicLead.create.mockResolvedValue({ _id: 'lead-1' });

    const backupPayload = {
      version: 'platform-backup-v1',
      appName: 'PayQusta',
      scope: 'platform',
      exportedAt: '2026-03-15T00:00:00.000Z',
      data: {
        plans: [
          {
            name: 'Starter',
            price: 0,
            currency: 'EGP',
            billingCycle: 'monthly',
            limits: { maxProducts: 50, maxCustomers: 100, maxUsers: 3, maxBranches: 1 },
            features: [],
            isActive: true,
          },
          {
            name: 'Pro',
            price: 499,
            currency: 'EGP',
            billingCycle: 'monthly',
            limits: { maxProducts: 500, maxCustomers: 1000, maxUsers: 10, maxBranches: 3 },
            features: ['reports'],
            isActive: true,
          },
        ],
        systemConfigs: [
          {
            key: 'default',
            payments: {
              instapay: { enabled: true, configured: true, label: 'InstaPay', account: 'pay@instapay' },
            },
          },
        ],
        publicLeads: [
          {
            name: 'Lead One',
            email: 'lead@example.com',
            phone: '01000000000',
            requestType: 'demo',
            status: 'new',
            submittedAt: '2026-03-15T00:00:00.000Z',
          },
        ],
      },
    };

    const res = await api
      .post('/api/v1/super-admin/backup/restore-json')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', Buffer.from(JSON.stringify(backupPayload)), {
        filename: 'platform-backup.json',
        contentType: 'application/json',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results).toEqual({
      plans: { imported: 1, updated: 1, skipped: 0 },
      systemConfigs: { imported: 0, updated: 1, skipped: 0 },
      publicLeads: { imported: 1, skipped: 0 },
    });
    expect(existingPlan.save).toHaveBeenCalled();
    expect(existingConfig.save).toHaveBeenCalled();
    expect(Plan.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pro' }));
    expect(PublicLead.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'lead@example.com',
      requestType: 'demo',
    }));
    expect(res.body.data.validationReport.supportedDomains).toEqual(['plans', 'systemConfigs', 'publicLeads']);
    expect(res.body.data.validationReport.knownGaps).toContain('full_platform_disaster_recovery');
  });

  it('exports a full-platform snapshot with embedded tenant backups', async () => {
    Plan.find.mockReturnValue(createLeanQuery([
      {
        name: 'Starter',
        price: 0,
        currency: 'EGP',
        billingCycle: 'monthly',
        limits: { maxProducts: 50, maxCustomers: 100, maxUsers: 3, maxBranches: 1 },
        features: [],
        isActive: true,
      },
    ]));
    SystemConfig.find.mockReturnValue(createLeanQuery([
      {
        key: 'default',
        payments: {
          stripe: { enabled: false, configured: false, label: 'Stripe' },
        },
      },
    ]));
    PublicLead.find.mockReturnValue(createLeanQuery([]));
    Tenant.find.mockReturnValue(createSelectLeanQuery([
      {
        _id: 'tenant-1',
        name: 'Store One',
        slug: 'store-one',
        isActive: true,
        customDomain: null,
        customDomainStatus: 'not_configured',
        subscription: { status: 'active', plan: 'plan-1' },
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
      },
    ]));
    buildTenantJsonBackup.mockResolvedValue({
      version: '1.0',
      appName: 'PayQusta',
      exportedAt: '2026-03-15T00:00:00.000Z',
      tenant: 'tenant-1',
      counts: {
        products: 1,
        customers: 1,
        suppliers: 0,
        invoices: 1,
        expenses: 0,
        branches: 1,
        roles: 1,
        users: 1,
        subscriptionRequests: 0,
        notifications: 0,
        auditLogs: 0,
        uploadBinaries: 0,
        tenantConfig: 1,
        total: 6,
      },
      data: {
        products: [],
        customers: [],
        suppliers: [],
        invoices: [],
        expenses: [],
        branches: [],
        roles: [],
        users: [],
        subscriptionRequests: [],
        notifications: [],
        auditLogs: [],
        uploadBinaries: [],
        tenantSnapshot: { name: 'Store One' },
      },
    });

    const res = await api
      .get('/api/v1/super-admin/backup/export-full-json')
      .set('Authorization', 'Bearer valid-token');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');

    const payload = JSON.parse(res.text);
    expect(payload.scope).toBe('platform_full');
    expect(payload.counts).toEqual({
      platformPlans: 1,
      platformSystemConfigs: 1,
      platformPublicLeads: 0,
      tenants: 1,
      tenantRecords: 6,
    });
    expect(payload.platform.plans[0].name).toBe('Starter');
    expect(payload.tenants).toHaveLength(1);
    expect(payload.tenants[0].tenant.name).toBe('Store One');
    expect(payload.tenants[0].backup.tenant).toBe('tenant-1');
    expect(buildTenantJsonBackup).toHaveBeenCalledWith('tenant-1');
  });

  it('restores a full-platform snapshot with platform data and embedded tenant backups', async () => {
    const existingPlan = {
      name: 'Starter',
      price: 0,
      save: jest.fn().mockResolvedValue(true),
    };
    const existingConfig = {
      key: 'default',
      payments: {},
      save: jest.fn().mockResolvedValue(true),
    };

    Plan.findOne.mockResolvedValue(existingPlan);
    SystemConfig.findOne.mockResolvedValue(existingConfig);
    PublicLead.findOne.mockResolvedValue(null);

    const backupPayload = {
      version: 'platform-full-backup-v1',
      appName: 'PayQusta',
      scope: 'platform_full',
      exportedAt: '2026-03-15T00:00:00.000Z',
      platform: {
        plans: [
          {
            name: 'Starter',
            price: 0,
            currency: 'EGP',
            billingCycle: 'monthly',
            limits: { maxProducts: 50, maxCustomers: 100, maxUsers: 3, maxBranches: 1 },
            features: [],
            isActive: true,
          },
        ],
        systemConfigs: [
          {
            key: 'default',
            payments: {
              instapay: { enabled: true, configured: true, label: 'InstaPay', account: 'pay@instapay' },
            },
          },
        ],
        publicLeads: [
          {
            name: 'Lead One',
            email: 'lead@example.com',
            phone: '01000000000',
            requestType: 'demo',
            status: 'new',
            submittedAt: '2026-03-15T00:00:00.000Z',
          },
        ],
      },
      tenants: [
        {
          tenant: {
            name: 'Restored Store',
            slug: 'restored-store',
            isActive: true,
            subscriptionStatus: 'active',
            plan: 'plan-1',
          },
          backup: {
            version: '1.0',
            appName: 'PayQusta',
            exportedAt: '2026-03-15T00:00:00.000Z',
            tenant: 'legacy-tenant-id',
            counts: { total: 4 },
            data: {
              products: [],
              customers: [],
              suppliers: [],
              invoices: [],
              expenses: [],
              branches: [],
              roles: [],
              users: [],
              subscriptionRequests: [],
              notifications: [],
              auditLogs: [],
              uploadBinaries: [],
              tenantSnapshot: {
                name: 'Restored Store',
                slug: 'restored-store',
                subscription: { status: 'active' },
              },
            },
          },
        },
      ],
    };

    const res = await api
      .post('/api/v1/super-admin/backup/restore-full-json')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', Buffer.from(JSON.stringify(backupPayload)), {
        filename: 'full-platform-backup.json',
        contentType: 'application/json',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.tenants).toEqual({
      total: 1,
      restored: 1,
      failed: 0,
      created: 1,
    });
    expect(existingPlan.save).toHaveBeenCalled();
    expect(existingConfig.save).toHaveBeenCalled();
    expect(PublicLead.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'lead@example.com',
      requestType: 'demo',
    }));
    expect(Tenant.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Restored Store',
      slug: 'restored-store',
    }));
    expect(backupController.restoreJSON).toHaveBeenCalledTimes(1);
    expect(res.body.data.tenantResults[0]).toEqual(expect.objectContaining({
      success: true,
      created: true,
      matchedBy: 'created',
    }));
    expect(res.body.data.knownGaps).toContain('one-click_infrastructure_rebuild');
  });
});
