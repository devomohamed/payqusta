jest.mock('../../src/models/Role', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

const Role = require('../../src/models/Role');
const AppError = require('../../src/utils/AppError');
const { RESOURCES, ACTIONS } = require('../../src/config/permissions');
const { checkPermission, getUserPermissions } = require('../../src/middleware/checkPermission');

function createNext() {
  return jest.fn();
}

async function runPermissionMiddleware(resource, action, user) {
  const next = createNext();
  await checkPermission(resource, action)({ user }, {}, next);
  return next;
}

describe('checkPermission middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows admin users without consulting role documents', async () => {
    const next = await runPermissionMiddleware('settings', 'delete', {
      role: 'admin',
      tenant: 'tenant-1',
    });

    expect(next).toHaveBeenCalledWith();
    expect(Role.findById).not.toHaveBeenCalled();
    expect(Role.findOne).not.toHaveBeenCalled();
  });

  it('allows actions granted by default role permissions', async () => {
    const next = await runPermissionMiddleware('products', 'update', {
      role: 'vendor',
      tenant: 'tenant-1',
    });

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks actions denied by default role permissions', async () => {
    const next = await runPermissionMiddleware('customers', 'delete', {
      role: 'coordinator',
      tenant: 'tenant-1',
    });

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
  });

  it('uses custom role permissions when customRole is attached to the user', async () => {
    Role.findById.mockResolvedValue({
      permissions: [
        { resource: 'customers', actions: ['read', 'update'] },
      ],
    });

    const next = await runPermissionMiddleware('customers', 'update', {
      role: 'coordinator',
      tenant: 'tenant-1',
      customRole: 'role-1',
    });

    expect(Role.findById).toHaveBeenCalledWith('role-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('looks up dynamic roles by name inside the current tenant', async () => {
    Role.findOne.mockResolvedValue({
      permissions: [
        { resource: 'reports', actions: ['read'] },
      ],
    });

    const next = await runPermissionMiddleware('reports', 'read', {
      role: 'auditor',
      tenant: 'tenant-42',
    });

    expect(Role.findOne).toHaveBeenCalledWith({ name: 'auditor', tenant: 'tenant-42' });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects unknown roles that do not map to default permissions or a stored role', async () => {
    Role.findOne.mockResolvedValue(null);

    const next = await runPermissionMiddleware('reports', 'read', {
      role: 'auditor',
      tenant: 'tenant-42',
    });

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
  });
});

describe('getUserPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns full resource coverage for admins', async () => {
    const permissions = await getUserPermissions({ role: 'admin' });

    expect(permissions).toHaveLength(Object.keys(RESOURCES).length);
    expect(permissions).toEqual(
      expect.arrayContaining([
        {
          resource: RESOURCES.PRODUCTS,
          actions: expect.arrayContaining(Object.values(ACTIONS)),
        },
      ])
    );
  });

  it('returns stored permissions for custom roles', async () => {
    const storedPermissions = [
      { resource: 'users', actions: ['read'] },
    ];
    Role.findById.mockResolvedValue({ permissions: storedPermissions });

    const permissions = await getUserPermissions({
      role: 'coordinator',
      tenant: 'tenant-1',
      customRole: 'role-1',
    });

    expect(permissions).toEqual(storedPermissions);
  });

  it('falls back to default role permissions for standard tenant roles', async () => {
    const permissions = await getUserPermissions({
      role: 'coordinator',
      tenant: 'tenant-1',
    });

    expect(permissions).toEqual(
      expect.arrayContaining([
        { resource: 'invoices', actions: ['create', 'read'] },
      ])
    );
  });
});
