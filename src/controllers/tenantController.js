/**
 * Tenant Controller - legacy tenant switching helpers.
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');

class TenantController {
  /**
   * Legacy route kept for backward compatibility only.
   * Branches are now managed through /api/v1/branches.
   */
  createBranch = catchAsync(async (req, res, next) => {
    return next(AppError.badRequest('هذا المسار متوقف. استخدم /api/v1/branches لإدارة الفروع.'));
  });

  /**
   * Get all branches (tenants list) accessible by current user.
   * GET /api/v1/tenants/my-branches
   */
  getMyBranches = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id).populate(
      'tenants',
      'name slug businessInfo subscription isActive'
    );

    let branches = user.tenants || [];
    const mainTenantId = user.tenant;
    if (mainTenantId && !branches.find((b) => b._id.toString() === mainTenantId.toString())) {
      const mainTenant = await Tenant.findById(mainTenantId).select(
        'name slug businessInfo subscription isActive'
      );
      if (mainTenant) branches.push(mainTenant);
    }

    ApiResponse.success(res, branches, 'قائمة الفروع');
  });

  /**
   * Switch tenant session by issuing a token bound to target tenant.
   * POST /api/v1/auth/switch-tenant
   */
  switchTenant = catchAsync(async (req, res, next) => {
    const { tenantId } = req.body;
    const user = req.user;

    const isOwner = await Tenant.exists({ _id: tenantId, owner: user._id });
    const legacyAccess = user.tenant && user.tenant.toString() === tenantId;
    const arrayAccess = user.tenants?.some((t) => t.toString() === tenantId);

    if (!isOwner && !legacyAccess && !arrayAccess && user.role !== 'admin') {
      return next(AppError.forbidden('ليس لديك صلاحية الوصول لهذا الفرع'));
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        tenant: tenantId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    ApiResponse.success(res, { token }, 'تم التحويل للفرع المحدد');
  });
}

module.exports = new TenantController();
