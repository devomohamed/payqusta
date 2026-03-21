const { createApiClient } = require('../helpers/apiClient');
const {
  hasDbTestEnv,
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} = require('../helpers/dbTestHarness');

const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const Role = require('../../src/models/Role');
const Branch = require('../../src/models/Branch');
const Product = require('../../src/models/Product');
const AuditLog = require('../../src/models/AuditLog');

const api = createApiClient();
const describeDb = hasDbTestEnv() ? describe : describe.skip;

const createTenant = async (overrides = {}) => Tenant.create({
  name: 'Admin E2E Store',
  slug: `admin-e2e-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  settings: {
    shipping: {
      enabled: false,
      provider: 'local',
      supportsCashOnDelivery: true,
      baseFee: 0,
    },
  },
  ...overrides,
});

const createOwner = async (tenant, overrides = {}) => User.create({
  name: 'Admin Owner',
  email: `owner-${Date.now()}-${Math.round(Math.random() * 1000)}@example.com`,
  phone: `010${Math.floor(10000000 + Math.random() * 89999999)}`,
  password: 'Secret123!',
  role: 'admin',
  tenant: tenant._id,
  ...overrides,
});

const loginAs = async (email, password = 'Secret123!') => {
  const res = await api
    .post('/api/v1/auth/login')
    .send({ email, password });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.token).toBeTruthy();

  return res.body.data.token;
};

const createBranchPayload = (name, overrides = {}) => ({
  name,
  phone: `010${Math.floor(10000000 + Math.random() * 89999999)}`,
  branchType: 'store',
  participatesInOnlineOrders: true,
  isFulfillmentCenter: false,
  onlinePriority: 100,
  pickupEnabled: true,
  shippingOrigin: {
    governorate: 'Cairo',
    city: 'Cairo',
    area: 'Nasr City',
    addressLine: `${name} address`,
    postalCode: '11511',
  },
  ...overrides,
});

const waitForAuditLog = async (filter, attempts = 10) => {
  for (let index = 0; index < attempts; index += 1) {
    const entry = await AuditLog.findOne(filter).lean();
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return null;
};

describeDb('Admin RBAC and fulfillment DB-backed E2E', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await clearTestDatabase();
    await disconnectTestDatabase();
  });

  it('lets the owner create scoped branches, custom roles, and employees with an audit trail', async () => {
    const tenant = await createTenant();
    const owner = await createOwner(tenant);
    const token = await loginAs(owner.email);

    const branchARes = await api
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .send(createBranchPayload('Cairo Online Hub', {
        branchType: 'fulfillment_center',
        isFulfillmentCenter: true,
        onlinePriority: 1,
        pickupEnabled: false,
      }));

    expect(branchARes.statusCode).toBe(201);
    expect(branchARes.body.success).toBe(true);

    const branchBRes = await api
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .send(createBranchPayload('Giza Pickup Store', {
        branchType: 'store',
        isFulfillmentCenter: false,
        onlinePriority: 2,
        pickupEnabled: true,
      }));

    expect(branchBRes.statusCode).toBe(201);
    expect(branchBRes.body.success).toBe(true);

    const branchAId = branchARes.body.data.branch._id;
    const branchBId = branchBRes.body.data.branch._id;

    const roleRes = await api
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Portal Fulfillment Clerk',
        description: 'Handles portal orders for assigned branches only',
        permissions: [
          { resource: 'products', actions: ['read'] },
          { resource: 'invoices', actions: ['read', 'update'] },
          { resource: 'branches', actions: ['read'] },
        ],
      });

    expect(roleRes.statusCode).toBe(201);
    expect(roleRes.body.success).toBe(true);

    const customRoleId = roleRes.body.data._id;

    const createUserRes = await api
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Scoped Fulfillment Agent',
        email: 'scoped.agent@example.com',
        phone: '01012345678',
        password: 'Secret123!',
        role: 'cashier',
        customRole: customRoleId,
        primaryBranch: branchAId,
        assignedBranches: [branchAId, branchBId],
        branchAccessMode: 'assigned_branches',
      });

    expect(createUserRes.statusCode).toBe(201);
    expect(createUserRes.body.success).toBe(true);

    const createdUserId = createUserRes.body.data.user._id;

    const usersRes = await api
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${token}`);

    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.body.success).toBe(true);

    const createdUser = usersRes.body.data.find((entry) => entry._id === createdUserId);
    expect(createdUser).toBeTruthy();
    expect(createdUser.customRole.name).toBe('Portal Fulfillment Clerk');
    expect(createdUser.primaryBranch.name).toBe('Cairo Online Hub');
    expect(createdUser.assignedBranches).toHaveLength(2);
    expect(createdUser.branchAccessMode).toBe('assigned_branches');

    const userAudit = await waitForAuditLog({
      tenant: tenant._id,
      resource: 'user',
      resourceId: createdUserId,
      action: 'create',
    });
    const branchAudit = await waitForAuditLog({
      tenant: tenant._id,
      resource: 'branch',
      resourceId: branchAId,
      action: 'create',
    });

    expect(userAudit).toBeTruthy();
    expect(branchAudit).toBeTruthy();

    const auditRouteRes = await api
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .query({
        resource: 'user',
        resourceId: createdUserId,
      });

    expect(auditRouteRes.statusCode).toBe(200);
    expect(auditRouteRes.body.success).toBe(true);
    expect(auditRouteRes.body.data).toHaveLength(1);
    expect(auditRouteRes.body.data[0].resource).toBe('user');
    expect(auditRouteRes.body.data[0].resourceId.toString()).toBe(createdUserId.toString());
  });

  it('lets the owner persist fulfillment policy and branch-level product availability end to end', async () => {
    const tenant = await createTenant();
    const owner = await createOwner(tenant, {
      email: 'owner.fulfillment@example.com',
      phone: '01055554444',
    });
    const token = await loginAs(owner.email);

    const branchARes = await api
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .send(createBranchPayload('Primary Online Branch', {
        branchType: 'fulfillment_center',
        isFulfillmentCenter: true,
        onlinePriority: 1,
      }));

    const branchBRes = await api
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .send(createBranchPayload('Backup Branch', {
        branchType: 'store',
        isFulfillmentCenter: false,
        onlinePriority: 2,
      }));

    const branchAId = branchARes.body.data.branch._id;
    const branchBId = branchBRes.body.data.branch._id;

    const settingsRes = await api
      .put('/api/v1/settings/store')
      .set('Authorization', `Bearer ${token}`)
      .send({
        settings: {
          onlineFulfillment: {
            mode: 'branch_priority',
            defaultOnlineBranchId: branchAId,
            branchPriorityOrder: [branchAId, branchBId],
            allowCrossBranchOnlineAllocation: true,
            allowMixedBranchOrders: false,
          },
        },
      });

    expect(settingsRes.statusCode).toBe(200);
    expect(settingsRes.body.success).toBe(true);

    const storefrontSettingsRes = await api
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(storefrontSettingsRes.statusCode).toBe(200);
    expect(storefrontSettingsRes.body.success).toBe(true);
    expect(storefrontSettingsRes.body.data.tenant.settings.onlineFulfillment.mode).toBe('branch_priority');
    expect(
      storefrontSettingsRes.body.data.tenant.settings.onlineFulfillment.defaultOnlineBranchId.toString()
    ).toBe(branchAId.toString());

    const productRes = await api
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Branch-aware Headphones')
      .field('sku', 'ADMIN-E2E-HEADPHONES')
      .field('cost', '90')
      .field('price', '150')
      .field('stockQuantity', '10')
      .field('minQuantity', '2')
      .field('inventory', JSON.stringify([
        { branch: branchAId, quantity: 6, minQuantity: 2 },
        { branch: branchBId, quantity: 4, minQuantity: 1 },
      ]))
      .field('branchAvailability', JSON.stringify([
        {
          branch: branchAId,
          isAvailableInBranch: true,
          isSellableInPos: true,
          isSellableOnline: true,
          safetyStock: 1,
          onlineReserveQty: 1,
          priorityRank: 1,
        },
        {
          branch: branchBId,
          isAvailableInBranch: true,
          isSellableInPos: true,
          isSellableOnline: false,
          safetyStock: 0,
          onlineReserveQty: 0,
          priorityRank: 2,
        },
      ]));

    expect(productRes.statusCode).toBe(201);
    expect(productRes.body.success).toBe(true);

    const product = await Product.findById(productRes.body.data._id).lean();

    expect(product.inventory).toHaveLength(2);
    expect(product.branchAvailability).toHaveLength(2);

    const branchAInventory = product.inventory.find((entry) => entry.branch.toString() === branchAId.toString());
    const branchAAvailability = product.branchAvailability.find((entry) => entry.branch.toString() === branchAId.toString());
    const branchBAvailability = product.branchAvailability.find((entry) => entry.branch.toString() === branchBId.toString());

    expect(branchAInventory.quantity).toBe(6);
    expect(branchAAvailability.isSellableOnline).toBe(true);
    expect(branchAAvailability.onlineReserveQty).toBe(1);
    expect(branchBAvailability.isSellableOnline).toBe(false);
    expect(branchBAvailability.priorityRank).toBe(2);

    const storedTenant = await Tenant.findById(tenant._id).lean();
    expect(storedTenant.settings.onlineFulfillment.branchPriorityOrder).toHaveLength(2);
  });
});

if (!hasDbTestEnv()) {
  describe('Admin RBAC and fulfillment DB-backed E2E', () => {
    it('is skipped until TEST_MONGODB_URI is provided', () => {
      expect(hasDbTestEnv()).toBe(false);
    });
  });
}
