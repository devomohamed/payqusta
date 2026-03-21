/**
 * Permission Check Middleware
 * Verifies if a user has permission to perform an action on a resource.
 */

const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const { RESOURCES, ACTIONS, DEFAULT_ROLES } = require('../config/permissions');
const { ROLES } = require('../config/constants');

function isTenantAdminFullAccess(user = null) {
  return Boolean(user && user.role === ROLES.ADMIN);
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

      if (isTenantAdminFullAccess(user)) {
        return next();
      }

      const roleDoc = await resolveRoleDocument(user);
      if (roleDoc) {
        const permission = roleDoc.permissions.find((entry) => entry.resource === resource);
        if (!permission || !permission.actions.includes(action)) {
          return next(getPermissionDeniedError());
        }
        return next();
      }

      const defaultRole = resolveDefaultRole(user);
      if (!defaultRole) {
        return next(getUnknownRoleError());
      }

      const permission = defaultRole.permissions.find((entry) => entry.resource === resource);
      if (!permission || !permission.actions.includes(action)) {
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
};
