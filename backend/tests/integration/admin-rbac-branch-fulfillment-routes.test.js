jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../src/models/Role', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Branch', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../../src/models/AuditLog', () => ({
  log: jest.fn().mockResolvedValue(undefined),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/Tenant');
const Role = require('../../src/models/Role');
const Branch = require('../../src/models/Branch');
const AuditLog = require('../../src/models/AuditLog');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const TENANT_ID = '507f1f77bcf86cd799439101';
const OWNER_ID = '507f1f77bcf86cd799439001';
const CUSTOM_ROLE_ID = '507f1f77bcf86cd799439201';
const PRIMARY_BRANCH_ID = '507f1f77bcf86cd799439301';
const SECONDARY_BRANCH_ID = '507f1f77bcf86cd799439302';
const CREATED_USER_ID = '507f1f77bcf86cd799439401';
const CREATED_BRANCH_ID = '507f1f77bcf86cd799439501';
const MANAGER_ID = '507f1f77bcf86cd799439601';

const createProtectedUserQuery = (user) => ({
  select: jest.fn(() => ({
    populate: jest.fn().mockResolvedValue(user),
  })),
});

const createPopulateQuery = (result) => ({
  populate: jest.fn().mockResolvedValue(result),
});

const createSelectQuery = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

const createBranchPopulateQuery = (result) => {
  const query = {
    populate: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
  };

  return query;
};

const createAuditLogsQuery = (result) => {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
  };

  return query;
};

describe('Admin, branch, and fulfillment route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';

    jwt.verify.mockReturnValue({
      id: OWNER_ID,
      tenant: TENANT_ID,
      iat: 2000000000,
      sv: 0,
    });

    User.findById.mockReturnValue(createProtectedUserQuery({
      _id: OWNER_ID,
      id: OWNER_ID,
      tenant: TENANT_ID,
      role: 'vendor',
      isActive: true,
      sessionVersion: 0,
      customRole: null,
      isSuperAdmin: false,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    }));
  });

  it('creates tenant users with custom roles and explicit branch scope', async () => {
    Tenant.findById.mockReturnValueOnce(createPopulateQuery({
      _id: TENANT_ID,
      subscription: {
        status: 'active',
        maxUsers: 5,
        plan: null,
      },
    }));
    User.countDocuments.mockResolvedValueOnce(1);
    User.findOne.mockResolvedValueOnce(null);
    Role.findOne.mockReturnValueOnce(createSelectQuery({ _id: CUSTOM_ROLE_ID }));
    Branch.find.mockReturnValueOnce(createSelectQuery([
      { _id: PRIMARY_BRANCH_ID },
      { _id: SECONDARY_BRANCH_ID },
    ]));
    User.create.mockResolvedValueOnce({
      _id: CREATED_USER_ID,
      name: 'Scoped User',
      email: 'scoped@example.com',
      phone: '01012345678',
      role: 'cashier',
      customRole: CUSTOM_ROLE_ID,
      tenant: TENANT_ID,
      branch: PRIMARY_BRANCH_ID,
      primaryBranch: PRIMARY_BRANCH_ID,
      assignedBranches: [PRIMARY_BRANCH_ID, SECONDARY_BRANCH_ID],
      branchAccessMode: 'assigned_branches',
      isActive: true,
    });

    const res = await api
      .post('/api/v1/auth/users')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Scoped User',
        email: 'scoped@example.com',
        phone: '01012345678',
        password: 'Secret123!',
        role: 'cashier',
        customRole: CUSTOM_ROLE_ID,
        primaryBranch: PRIMARY_BRANCH_ID,
        assignedBranches: [PRIMARY_BRANCH_ID, SECONDARY_BRANCH_ID],
        branchAccessMode: 'assigned_branches',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      tenant: TENANT_ID,
      role: 'cashier',
      customRole: CUSTOM_ROLE_ID,
      branch: PRIMARY_BRANCH_ID,
      primaryBranch: PRIMARY_BRANCH_ID,
      assignedBranches: [PRIMARY_BRANCH_ID, SECONDARY_BRANCH_ID],
      branchAccessMode: 'assigned_branches',
    }));
    expect(AuditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      tenant: TENANT_ID,
      action: 'create',
      resource: 'user',
      user: OWNER_ID,
    }));
  });

  it('creates branches with commerce settings and auto-scoped managers', async () => {
    const branchDoc = {
      _id: CREATED_BRANCH_ID,
      tenant: TENANT_ID,
      manager: null,
      save: jest.fn().mockResolvedValue(undefined),
    };

    Tenant.findById
      .mockReturnValueOnce(createPopulateQuery({
        _id: TENANT_ID,
        subscription: {
          status: 'active',
          maxBranches: 3,
          plan: null,
        },
      }))
      .mockResolvedValueOnce({
        _id: TENANT_ID,
        subscription: {
          status: 'active',
          maxBranches: 3,
        },
      });
    Branch.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    User.findOne.mockResolvedValueOnce(null);
    Branch.create.mockResolvedValueOnce([branchDoc]);
    User.create.mockResolvedValueOnce([{
      _id: MANAGER_ID,
      name: 'Branch Manager',
      email: 'manager@example.com',
      role: 'coordinator',
      tenant: TENANT_ID,
      branch: CREATED_BRANCH_ID,
      primaryBranch: CREATED_BRANCH_ID,
      assignedBranches: [CREATED_BRANCH_ID],
      branchAccessMode: 'single_branch',
    }]);
    Branch.findById.mockReturnValueOnce(createBranchPopulateQuery({
      _id: CREATED_BRANCH_ID,
      tenant: { _id: TENANT_ID, name: 'Tenant Store' },
      name: 'Fulfillment Hub',
      branchType: 'fulfillment_center',
      participatesInOnlineOrders: true,
      isFulfillmentCenter: true,
      onlinePriority: 4,
      pickupEnabled: false,
      shippingOrigin: {
        governorate: 'Giza',
        city: '6th of October',
        area: 'Industrial',
        addressLine: 'Warehouse Street',
        postalCode: '12566',
      },
      manager: {
        _id: MANAGER_ID,
        name: 'Branch Manager',
        role: 'coordinator',
      },
    }));

    const res = await api
      .post('/api/v1/branches')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Fulfillment Hub',
        phone: '0234567890',
        branchType: 'fulfillment_center',
        participatesInOnlineOrders: true,
        isFulfillmentCenter: true,
        onlinePriority: 4,
        pickupEnabled: false,
        shippingOrigin: {
          governorate: 'Giza',
          city: '6th of October',
          area: 'Industrial',
          addressLine: 'Warehouse Street',
          postalCode: '12566',
        },
        managerName: 'Branch Manager',
        managerEmail: 'manager@example.com',
        managerPhone: '01099999999',
        managerPassword: 'Secret123!',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Branch.create).toHaveBeenCalledWith([
      expect.objectContaining({
        tenant: TENANT_ID,
        name: 'Fulfillment Hub',
        branchType: 'fulfillment_center',
        participatesInOnlineOrders: true,
        isFulfillmentCenter: true,
        onlinePriority: 4,
        pickupEnabled: false,
        shippingOrigin: expect.objectContaining({
          city: '6th of October',
          postalCode: '12566',
        }),
      }),
    ]);
    expect(User.create).toHaveBeenCalledWith([
      expect.objectContaining({
        role: 'coordinator',
        branch: CREATED_BRANCH_ID,
        primaryBranch: CREATED_BRANCH_ID,
        assignedBranches: [CREATED_BRANCH_ID],
        branchAccessMode: 'single_branch',
      }),
    ]);
  });

  it('normalizes tenant online fulfillment settings against active branches', async () => {
    Tenant.findById.mockReturnValueOnce(createSelectQuery({
      _id: TENANT_ID,
      settings: {
        onlineFulfillment: {
          mode: 'branch_priority',
        },
      },
    }));
    Branch.find.mockReturnValueOnce(createSelectQuery([
      { _id: PRIMARY_BRANCH_ID, participatesInOnlineOrders: true },
      { _id: SECONDARY_BRANCH_ID, participatesInOnlineOrders: false },
    ]));
    Tenant.findByIdAndUpdate.mockResolvedValueOnce({
      _id: TENANT_ID,
      settings: {
        onlineFulfillment: {
          mode: 'branch_priority',
          defaultOnlineBranchId: PRIMARY_BRANCH_ID,
          branchPriorityOrder: [PRIMARY_BRANCH_ID, SECONDARY_BRANCH_ID],
          allowCrossBranchOnlineAllocation: true,
          allowMixedBranchOrders: false,
        },
      },
    });

    const res = await api
      .put('/api/v1/settings/store')
      .set('Authorization', 'Bearer valid-token')
      .send({
        settings: {
          onlineFulfillment: {
            mode: 'branch_priority',
            defaultOnlineBranchId: PRIMARY_BRANCH_ID,
            branchPriorityOrder: [
              PRIMARY_BRANCH_ID,
              SECONDARY_BRANCH_ID,
              PRIMARY_BRANCH_ID,
              '507f1f77bcf86cd799439399',
            ],
            allowCrossBranchOnlineAllocation: true,
            allowMixedBranchOrders: true,
          },
        },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Tenant.findByIdAndUpdate).toHaveBeenCalledWith(
      TENANT_ID,
      {
        $set: expect.objectContaining({
          'settings.onlineFulfillment': {
            mode: 'branch_priority',
            defaultOnlineBranchId: PRIMARY_BRANCH_ID,
            branchPriorityOrder: [PRIMARY_BRANCH_ID, SECONDARY_BRANCH_ID],
            allowCrossBranchOnlineAllocation: true,
            allowMixedBranchOrders: false,
          },
        }),
      },
      { new: true, runValidators: true },
    );
  });

  it('filters admin audit logs by resource and resourceId at route level', async () => {
    User.findById.mockReturnValueOnce(createProtectedUserQuery({
      _id: OWNER_ID,
      id: OWNER_ID,
      tenant: TENANT_ID,
      role: 'admin',
      isActive: true,
      sessionVersion: 0,
      customRole: null,
      isSuperAdmin: false,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    }));
    AuditLog.find.mockReturnValueOnce(createAuditLogsQuery([
      {
        _id: '507f1f77bcf86cd799439701',
        action: 'update',
        resource: 'user',
        resourceId: CREATED_USER_ID,
      },
    ]));
    AuditLog.countDocuments.mockResolvedValueOnce(1);

    const res = await api
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', 'Bearer valid-token')
      .query({
        resource: 'user',
        resourceId: CREATED_USER_ID,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(AuditLog.find).toHaveBeenCalledWith({
      resource: 'user',
      resourceId: CREATED_USER_ID,
      tenant: TENANT_ID,
    });
    expect(AuditLog.countDocuments).toHaveBeenCalledWith({
      resource: 'user',
      resourceId: CREATED_USER_ID,
      tenant: TENANT_ID,
    });
  });
});
