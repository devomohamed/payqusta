/**
 * Authentication & Authorization Middleware
 * JWT verification, role-based access control, tenant isolation
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const crypto = require('crypto');
const {
  getPlatformSubdomain,
  getRequestHost,
  isPlatformHost,
  markCustomDomainConnected,
} = require('../utils/tenantDomainHelpers');

const safeTokenEquals = (providedToken, expectedToken) => {
  if (!providedToken || !expectedToken) return false;

  const provided = Buffer.from(String(providedToken));
  const expected = Buffer.from(String(expectedToken));

  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(provided, expected);
};

/**
 * Protect routes — verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header OR query string (only for SSE stream)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token && req.originalUrl.includes('/stream')) {
      token = req.query.token;
    }

    if (!token) {
      return next(AppError.unauthorized('يرجى تسجيل الدخول للوصول'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and populate branch
    const user = await User.findById(decoded.id)
      .select('+password')
      .populate('branch', 'name');
    if (!user) {
      return next(AppError.unauthorized('المستخدم غير موجود'));
    }

    if (!user.isActive) {
      return next(AppError.unauthorized('تم تعطيل هذا الحساب'));
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(AppError.unauthorized('تم تغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى'));
    }

    // Check session version (logout from all devices)
    const tokenSv = decoded.sv || 0;
    if (tokenSv !== (user.sessionVersion || 0)) {
      return next(AppError.unauthorized('تم إنهاء جلستك. يرجى تسجيل الدخول مرة أخرى'));
    }

    // Attach user and tenant to request
    req.user = user;
    req.tenantId = decoded.tenant || user.tenant;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('رمز المصادقة غير صالح'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('انتهت صلاحية رمز المصادقة'));
    }
    next(error);
  }
};

/**
 * Protect operational routes
 * Allows either a configured ops bearer token or a normal authenticated vendor/admin JWT.
 */
const protectOps = async (req, res, next) => {
  const authorization = String(req.headers.authorization || '').trim();
  const opsToken = String(process.env.OPS_BEARER_TOKEN || '').trim();

  if (authorization.startsWith('Bearer ') && opsToken) {
    const providedToken = authorization.slice('Bearer '.length).trim();
    if (safeTokenEquals(providedToken, opsToken)) {
      req.opsAccess = true;
      req.user = {
        _id: null,
        role: 'admin',
        tenant: null,
        isOpsToken: true,
        isActive: true,
      };
      req.tenantId = null;
      return next();
    }
  }

  return protect(req, res, next);
};

/**
 * Authorize specific roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Check if this is a custom role (not in standard predefined roles)
    const { ROLES } = require('../config/constants');
    const standardRoles = Object.values(ROLES);

    if (!standardRoles.includes(req.user.role)) {
      // It's a custom dynamic role, we let the `checkPermission` middleware handle it
      return next();
    }

    return next(
      AppError.forbidden(`الدور "${req.user.role}" غير مصرح له بالوصول`)
    );
  };
};

/**
 * Tenant isolation middleware
 * Ensures all queries are scoped to the current tenant
 */
const tenantScope = (req, res, next) => {
  if (!req.tenantId && req.user && req.user.role !== 'admin') {
    return next(AppError.badRequest('معرف المتجر مطلوب'));
  }

  // Attach tenant filter helper
  // Admin with a tenant gets scoped too; admin without tenant gets global access ONLY if explicitly designed (e.g. Super Admin)
  // But here 'admin' usually means Tenant Admin. Super Admin has verifySuperAdmin or isSuperAdmin flag.
  // We must ensure that if a user has a tenant, they are scoped to it, regardless of role 'admin'.

  if (req.user && req.user.tenant && !req.user.isSuperAdmin) {
    req.tenantId = req.user.tenant.toString();
    req.tenantFilter = { tenant: req.tenantId };
  } else {
    req.tenantFilter = req.tenantId ? { tenant: req.tenantId } : {};
  }

  next();
};

/**
 * Check if user is an admin or vendor
 */
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'vendor' || req.user.isSuperAdmin)) {
    return next();
  }
  return next(AppError.forbidden('غير مصرح لك بالوصول - للمديرين فقط'));
};

/**
 * Public Tenant Scope middleware
 * For storefront routes that don't require authentication
 */
const publicTenantScope = async (req, res, next) => {
  try {
    // Optionally authenticate to recognize dashboard admins making public requests
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            const user = await User.findById(decoded.id);
            if (user && user.isActive) {
              req.user = user;
              if (!req.tenantId) {
                req.tenantId = decoded.tenant || user.tenant;
              }
            }
          }
        }
      } catch (err) {
        // Ignore token errors here to allow fallback to public access
      }
    }

    if (req.tenantId) {
      req.tenantFilter = { tenant: req.tenantId };
      return next();
    }

    let tenantId = req.headers['x-tenant-id'] || req.query.tenant;
    const slug = req.query.slug || req.headers['x-tenant-slug'];
    const requestHost = getRequestHost(req);
    const hostSlug = getPlatformSubdomain(requestHost);

    // If still no tenantId, the token might have been malformed or missing user
    if (!tenantId && !slug && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.tenant) {
          tenantId = decoded.tenant;
        }
      } catch (err) {
        // Ignore token errors here.
      }
    }

    const Tenant = require('../models/Tenant');
    let tenant = null;

    if (tenantId) {
      tenant = await Tenant.findById(tenantId);
    } else if (slug) {
      tenant = await Tenant.findOne({ slug });
    } else if (hostSlug) {
      tenant = await Tenant.findOne({ slug: hostSlug, isActive: true });
    } else if (!isPlatformHost(requestHost)) {
      tenant = await Tenant.findOne({ customDomain: requestHost, isActive: true });
    }

    if (!tenantId && !slug && !hostSlug && !tenant) {
      return next(AppError.badRequest('Please provide tenant identifier (x-tenant-id, slug, or store subdomain)'));
    }

    if (!tenant) {
      return next(AppError.notFound('Store not found'));
    }

    if (!tenantId && !slug && !hostSlug && !isPlatformHost(requestHost)) {
      markCustomDomainConnected(Tenant, tenant._id);
    }

    req.tenantId = tenant._id;
    req.tenantFilter = { tenant: tenant._id };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Audit logging middleware
 * Logs sensitive operations
 */
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Log after successful response
      if (data.success) {
        const AuditLog = require('../models/AuditLog');
        // Attempt to extract tenant ID from response if not available in req (e.g., when creating a tenant)
        let resolvedTenant = req.tenantId;
        if (!resolvedTenant && data.data) {
          if (data.data.tenant && data.data.tenant._id) resolvedTenant = data.data.tenant._id;
          else if (data.data._id && resource === 'tenant') resolvedTenant = data.data._id;
        }

        // Attempt to extract resourceId for nested responses like { tenant, owner }
        let resolvedResourceId = req.params.id || data.data?._id;
        if (!resolvedResourceId && data.data) {
          if (data.data.tenant && data.data.tenant._id) resolvedResourceId = data.data.tenant._id;
        }

        AuditLog.log({
          tenant: resolvedTenant,
          user: req.user?._id,
          action,
          resource,
          resourceId: resolvedResourceId,
          details: { method: req.method, path: req.path },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        }).catch((err) => logger.error(`Audit log error: ${err.message}`));
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = { protect, protectOps, authorize, isAdmin, tenantScope, publicTenantScope, auditLog };
