/**
 * Tenant Controller - legacy tenant switching helpers.
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');
const { getStarterCategorySettings, seedStarterCatalogForTenant } = require('../services/starterCatalogService');

class TenantController {
  /**
   * Create a new Tenant (Store) under the current User's account.
   * POST /api/v1/auth/create-store
   */
  createMyTenant = catchAsync(async (req, res, next) => {
    const { name, phone, address } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    // Only vendors/admins can create new stores
    if (user.role !== 'admin' && user.role !== 'vendor' && !user.isSuperAdmin) {
      return next(AppError.forbidden('غير مصرح لك بإنشاء متاجر جديدة'));
    }

    if (!name) {
      return next(AppError.badRequest('اسم المتجر مطلوب'));
    }

    // Check if free plan exists, otherwise null
    const freePlan = await mongoose.model('Plan').findOne({ price: 0 });

    const tenant = await Tenant.create({
      name,
      slug: name.toLowerCase().replace(/[^\w\u0621-\u064A\s-]/g, '').replace(/\s+/g, '-'),
      owner: user._id,
      businessInfo: {
        phone: phone || user.phone,
        email: user.email,
        address: address || '',
      },
      subscription: {
        plan: freePlan ? freePlan._id : null,
        status: 'active',
        trialEndsAt: null,
        maxProducts: freePlan ? freePlan.limits.maxProducts : 50,
        maxCustomers: freePlan ? freePlan.limits.maxCustomers : 100,
        maxUsers: freePlan ? freePlan.limits.maxUsers : 3,
      },
      settings: {
        categories: [
          { name: 'عام', isVisible: true },
          { name: 'ملابس', isVisible: true },
          { name: 'إلكترونيات', isVisible: true },
          { name: 'مشروبات', isVisible: true },
          { name: 'مأكولات', isVisible: true }
        ],
      }
    });

    tenant.set('settings.categories', getStarterCategorySettings());
    await tenant.save();

    // Add to user's tenants array if not already there
    if (!user.tenants.includes(tenant._id)) {
      user.tenants.push(tenant._id);
      await user.save({ validateBeforeSave: false });
    }

    await seedStarterCatalogForTenant(tenant._id);

    ApiResponse.created(res, {
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        subscription: tenant.subscription,
        isActive: tenant.isActive
      }
    }, 'تم إنشاء المتجر بنجاح');
  });

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
