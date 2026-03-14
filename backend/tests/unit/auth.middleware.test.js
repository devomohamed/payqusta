jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/Tenant');
const AppError = require('../../src/utils/AppError');
const { protect, tenantScope, publicTenantScope } = require('../../src/middleware/auth');

function createNext() {
  return jest.fn();
}

function createSelectResult(result) {
  return {
    select: jest.fn().mockResolvedValue(result),
  };
}

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.PLATFORM_ROOT_DOMAIN = 'payqusta.store';
  });

  describe('protect', () => {
    it('rejects requests without a bearer token', async () => {
      const req = {
        headers: {},
        query: {},
        originalUrl: '/api/v1/auth/me',
      };
      const next = createNext();

      await protect(req, {}, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('rejects invalid JWT tokens', async () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('bad token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const req = {
        headers: { authorization: 'Bearer invalid-token' },
        query: {},
        originalUrl: '/api/v1/auth/me',
      };
      const next = createNext();

      await protect(req, {}, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
    });

    it('attaches the user and tenant when the token is valid', async () => {
      const user = {
        _id: 'user-1',
        tenant: 'tenant-1',
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

      const req = {
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        originalUrl: '/api/v1/auth/me',
      };
      const next = createNext();

      await protect(req, {}, next);

      expect(req.user).toBe(user);
      expect(req.tenantId).toBe('tenant-1');
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects disabled users even with a valid token', async () => {
      jwt.verify.mockReturnValue({
        id: 'user-1',
        tenant: 'tenant-1',
        iat: 2000000000,
        sv: 0,
      });
      User.findById.mockReturnValue(createSelectResult({
        _id: 'user-1',
        tenant: 'tenant-1',
        isActive: false,
        sessionVersion: 0,
        changedPasswordAfter: jest.fn().mockReturnValue(false),
      }));

      const req = {
        headers: { authorization: 'Bearer valid-token' },
        query: {},
        originalUrl: '/api/v1/auth/me',
      };
      const next = createNext();

      await protect(req, {}, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('tenantScope', () => {
    it('scopes tenant admins to their own tenant automatically', () => {
      const req = {
        user: {
          role: 'admin',
          tenant: 'tenant-99',
          isSuperAdmin: false,
        },
      };
      const next = createNext();

      tenantScope(req, {}, next);

      expect(req.tenantId).toBe('tenant-99');
      expect(req.tenantFilter).toEqual({ tenant: 'tenant-99' });
      expect(next).toHaveBeenCalledWith();
    });

    it('returns a bad request error when no tenant context exists for a tenant user', () => {
      const req = {
        user: {
          role: 'vendor',
          tenant: null,
          isSuperAdmin: false,
        },
      };
      const next = createNext();

      tenantScope(req, {}, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('publicTenantScope', () => {
    it('rejects public requests that do not identify a tenant', async () => {
      const req = {
        headers: {},
        query: {},
      };
      const next = createNext();

      await publicTenantScope(req, {}, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(Tenant.findById).not.toHaveBeenCalled();
      expect(Tenant.findOne).not.toHaveBeenCalled();
    });

    it('resolves the tenant from the x-tenant-id header', async () => {
      Tenant.findById.mockResolvedValue({ _id: 'tenant-abc' });
      const req = {
        headers: { 'x-tenant-id': 'tenant-abc' },
        query: {},
      };
      const next = createNext();

      await publicTenantScope(req, {}, next);

      expect(Tenant.findById).toHaveBeenCalledWith('tenant-abc');
      expect(req.tenantId).toBe('tenant-abc');
      expect(req.tenantFilter).toEqual({ tenant: 'tenant-abc' });
      expect(next).toHaveBeenCalledWith();
    });

    it('resolves platform subdomains to the matching tenant slug', async () => {
      Tenant.findOne.mockResolvedValue({ _id: 'tenant-subdomain' });
      const req = {
        headers: { host: 'demo.payqusta.store' },
        query: {},
      };
      const next = createNext();

      await publicTenantScope(req, {}, next);

      expect(Tenant.findOne).toHaveBeenCalledWith({ slug: 'demo', isActive: true });
      expect(req.tenantId).toBe('tenant-subdomain');
      expect(req.tenantFilter).toEqual({ tenant: 'tenant-subdomain' });
      expect(next).toHaveBeenCalledWith();
    });
  });
});
