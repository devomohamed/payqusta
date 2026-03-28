/**
 * Permission Check Middleware
 * Verifies if a user has permission to perform an action on a resource.
 */

const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const { RESOURCES, ACTIONS, DEFAULT_ROLES } = require('../config/permissions');
const { ROLES } = require('../config/constants');

function isTenantAdminFullAccess(user = null) {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'admin' || role === (ROLES.ADMIN || 'admin').toLowerCase();
}

function getPermissionDeniedError() {
  return AppError.forbidden('ليس لديك صلاحية لهذا الإجراء');
}

function getUnknownRoleError() {
  return AppError.forbidden('دور غير معروف');
}

async function resolveRoleDocument(user) {
  if (!user) return null;

  if (user.customRole) {
    return Role.findById(user.customRole);
  }

  const standardRoles = Object.values(ROLES);
  if (!standardRoles.includes(user.role)) {
    return Role.findOne({ name: user.role, tenant: user.tenant });
  }

  return null;
}

function resolveDefaultRole(user) {
  if (!user?.role) return null;
  return DEFAULT_ROLES[user.role.toUpperCase()] || null;
}

async function userHasPermission(user, resource, action) {
  if (!user) return false;

  if (user?.isSuperAdmin) return true;
  if (isTenantAdminFullAccess(user)) return true;

  const roleDoc = await resolveRoleDocument(user);
  if (roleDoc) {
    const permission = roleDoc.permissions.find((entry) => entry.resource === resource);
    return Boolean(permission && permission.actions.includes(action));
  }

  const defaultRole = resolveDefaultRole(user);
  if (!defaultRole) return false;

  const permission = defaultRole.permissions.find((entry) => entry.resource === resource);
  return Boolean(permission && permission.actions.includes(action));
}

/**
 * Check if user has permission for resource/action.
 * Frozen decision for the current RBAC wave:
 * tenant admins remain full-access, while staff roles and custom roles
 * continue to use fine-grained permission checks.
 */
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      const logger = require('../utils/logger');
      const isAdmin = isTenantAdminFullAccess(user);
      
      if (isAdmin) {
        // logger.debug(`[DEBUG_PERM] Admin bypass for ${user?.email}`);
        return next();
      }

      logger.info(`[DEBUG_PERM] Manual check: User: ${user?.email}, Role: ${user?.role}, ROLES.ADMIN: ${ROLES.ADMIN}, Resource: ${resource}, Action: ${action}`);

      const roleDoc = await resolveRoleDocument(user);
      if (roleDoc) {
        logger.info(`[DEBUG_PERM] Found Custom Role Doc: ${roleDoc.name}`);
        const permission = roleDoc.permissions.find((entry) => entry.resource === resource);
        if (!permission || !permission.actions.includes(action)) {
          logger.warn(`[DEBUG_PERM] Custom Role Permission Denied: ${resource}.${action}`);
          return next(getPermissionDeniedError());
        }
        return next();
      }

      const defaultRole = resolveDefaultRole(user);
      if (!defaultRole) {
        logger.error(`[DEBUG_PERM] No Role/Default Role found for: ${user?.role}`);
        return next(getUnknownRoleError());
      }

      logger.info(`[DEBUG_PERM] Found Default Role: ${user?.role}`);
      const permission = defaultRole.permissions.find((entry) => entry.resource === resource);

      if (!permission || !permission.actions.includes(action)) {
        logger.warn(`[DEBUG_PERM] Default Role Permission Denied: ${resource}.${action}`);
        return next(getPermissionDeniedError());
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Helper to get user permissions.
 */
const getUserPermissions = async (user) => {
  if (isTenantAdminFullAccess(user)) {
    return Object.values(RESOURCES).map((resource) => ({
      resource,
      actions: Object.values(ACTIONS),
    }));
  }

  const roleDoc = await resolveRoleDocument(user);
  if (roleDoc) {
    return roleDoc.permissions;
  }

  const defaultRole = resolveDefaultRole(user);
  return defaultRole ? defaultRole.permissions : [];
};

module.exports = {
  checkPermission,
  getUserPermissions,
  isTenantAdminFullAccess,
  userHasPermission,
};
