/**
 * Permission Check Middleware
 * Verifies if user has permission to perform action on resource
 */

const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const { RESOURCES, ACTIONS, DEFAULT_ROLES } = require('../config/permissions');

/**
 * Check if user has permission for resource/action
 * @param {string} resource - Resource name (e.g., 'products')
 * @param {string} action - Action name (e.g., 'create')
 */
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Super admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // If user has custom role, check its permissions
      let roleDoc = null;
      if (user.customRole) {
        roleDoc = await Role.findById(user.customRole);
      } else {
        const { ROLES } = require('../config/constants');
        const standardRoles = Object.values(ROLES);
        if (!standardRoles.includes(user.role)) {
          roleDoc = await Role.findOne({ name: user.role, tenant: user.tenant });
        }
      }

      if (roleDoc) {
        const permission = roleDoc.permissions.find(p => p.resource === resource);
        if (!permission || !permission.actions.includes(action)) {
          return next(AppError.forbidden('ليس لديك صلاحية لهذا الإجراء'));
        }
        return next();
      }

      // Fallback to default role permissions
      const defaultRole = DEFAULT_ROLES[user.role.toUpperCase()];
      if (!defaultRole) {
        return next(AppError.forbidden('دور غير معروف'));
      }

      const permission = defaultRole.permissions.find(p => p.resource === resource);
      if (!permission || !permission.actions.includes(action)) {
        return next(AppError.forbidden('ليس لديك صلاحية لهذا الإجراء'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper to get user permissions
 */
const getUserPermissions = async (user) => {
  if (user.role === 'admin') {
    // Admin has all permissions
    return Object.values(RESOURCES).map(resource => ({
      resource,
      actions: Object.values(ACTIONS),
    }));
  }

  let roleDoc = null;
  if (user.customRole) {
    roleDoc = await Role.findById(user.customRole);
  } else {
    const { ROLES } = require('../config/constants');
    const standardRoles = Object.values(ROLES);
    if (!standardRoles.includes(user.role)) {
      roleDoc = await Role.findOne({ name: user.role, tenant: user.tenant });
    }
  }

  if (roleDoc) {
    return roleDoc.permissions;
  }

  const defaultRole = DEFAULT_ROLES[user.role.toUpperCase()];
  return defaultRole ? defaultRole.permissions : [];
};

module.exports = { checkPermission, getUserPermissions };
