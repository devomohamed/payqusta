jest.mock('../../src/models/Tenant', () => ({}));
jest.mock('../../src/models/Branch', () => ({}));
jest.mock('../../src/models/Invoice', () => ({}));
jest.mock('../../src/models/Customer', () => ({}));
jest.mock('../../src/models/Product', () => ({}));
jest.mock('../../src/services/starterCatalogService', () => ({
  getStarterCategorySettings: jest.fn(),
  seedStarterCatalogForTenant: jest.fn(),
}));
jest.mock('../../src/utils/userAccessHelpers', () => ({
  resolveUserRoleAssignment: jest.fn(),
  resolveUserBranchAssignment: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/AuditLog', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../src/utils/helpers', () => ({
  getPaginationParams: jest.fn(),
}));

jest.mock('../../src/utils/ApiResponse', () => ({
  paginated: jest.fn(),
}));

const User = require('../../src/models/User');
const AuditLog = require('../../src/models/AuditLog');
const Helpers = require('../../src/utils/helpers');
const ApiResponse = require('../../src/utils/ApiResponse');
const adminController = require('../../src/controllers/adminController');

function createAuditQuery(logs) {
  const query = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(logs),
  };
  return query;
}

describe('adminController.getAuditLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies resourceId and tenant scoping filters', async () => {
    Helpers.getPaginationParams.mockReturnValue({ page: 1, limit: 8, skip: 0 });

    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'user-1' }]),
    });

    const logs = [{ _id: 'log-1', resourceId: 'resource-123' }];
    const auditQuery = createAuditQuery(logs);
    AuditLog.find.mockReturnValue(auditQuery);
    AuditLog.countDocuments.mockResolvedValue(1);

    const req = {
      query: {
        search: 'ahmed',
        action: 'update',
        resource: 'user',
        resourceId: 'resource-123',
      },
      user: {
        isSuperAdmin: false,
        tenant: 'tenant-42',
      },
    };
    const res = {};
    const next = jest.fn();

    adminController.getAuditLogs(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(User.find).toHaveBeenCalled();
    expect(AuditLog.find).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update',
      resource: 'user',
      resourceId: 'resource-123',
      tenant: 'tenant-42',
    }));
    expect(AuditLog.countDocuments).toHaveBeenCalledWith(expect.objectContaining({
      resourceId: 'resource-123',
      tenant: 'tenant-42',
    }));
    expect(ApiResponse.paginated).toHaveBeenCalledWith(res, logs, { page: 1, limit: 8, total: 1 });
    expect(next).not.toHaveBeenCalled();
  });
});
