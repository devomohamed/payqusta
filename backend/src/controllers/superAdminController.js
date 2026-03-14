/**
 * Super Admin Controller — System Owner Operations
 * Manages all tenants, views consolidated analytics
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const PublicLead = require('../models/PublicLead');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const NotificationService = require('../services/NotificationService');
const { getStarterCategorySettings } = require('../services/starterCatalogService');

class SuperAdminController {
  /**
   * GET /api/v1/super-admin/tenants
   * List all tenants with basic stats
   */
  async getAllTenants(req, res, next) {
    try {
      const tenants = await Tenant.find({ isActive: true })
        .select('name businessInfo createdAt')
        .sort({ createdAt: -1 });

      const tenantsWithStats = await Promise.all(
        tenants.map(async (tenant) => {
          const [branchCount, userCount, invoiceCount, totalRevenue, owner] = await Promise.all([
            Branch.countDocuments({ tenant: tenant._id, isActive: true }),
            User.countDocuments({ tenant: tenant._id, isActive: true }),
            Invoice.countDocuments({ tenant: tenant._id }),
            Invoice.aggregate([
              { $match: { tenant: tenant._id } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            User.findOne({ tenant: tenant._id, role: 'admin' }).select('name email phone')
          ]);

          return {
            _id: tenant._id,
            name: tenant.name,
            businessInfo: tenant.businessInfo,
            createdAt: tenant.createdAt,
            isActive: tenant.isActive,
            subscription: tenant.subscription,
            owner,
            stats: {
              branches: branchCount,
              users: userCount,
              invoices: invoiceCount,
              revenue: totalRevenue[0]?.total || 0
            }
          };
        })
      );

      ApiResponse.success(res, { tenants: tenantsWithStats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/super-admin/analytics
   * System-wide analytics across all tenants
   */
  async getSystemAnalytics(req, res, next) {
    try {
      const [
        totalTenants,
        totalBranches,
        totalUsers,
        totalCustomers,
        totalProducts,
        totalRevenue
      ] = await Promise.all([
        Tenant.countDocuments({ isActive: true }),
        Branch.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: true }),
        Customer.countDocuments(),
        Product.countDocuments(),
        Invoice.aggregate([
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      ]);

      // Revenue by tenant (top 5)
      const revenueByTenant = await Invoice.aggregate([
        {
          $group: {
            _id: '$tenant',
            revenue: { $sum: '$totalAmount' },
            invoices: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'tenants',
            localField: '_id',
            foreignField: '_id',
            as: 'tenantInfo'
          }
        },
        { $unwind: '$tenantInfo' },
        {
          $project: {
            tenantName: '$tenantInfo.name',
            revenue: 1,
            invoices: 1
          }
        }
      ]);

      ApiResponse.success(res, {
        overview: {
          tenants: totalTenants,
          branches: totalBranches,
          users: totalUsers,
          customers: totalCustomers,
          products: totalProducts,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        topTenants: revenueByTenant
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/super-admin/tenants/:id/details
   * Get detailed info about a specific tenant
   */
  async getTenantDetails(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.params.id);
      if (!tenant) return next(AppError.notFound('المحل غير موجود'));

      const [branches, users, customers, products, invoices] = await Promise.all([
        Branch.find({ tenant: tenant._id, isActive: true }),
        User.find({ tenant: tenant._id, isActive: true }).select('name email role'),
        Customer.countDocuments({ tenant: tenant._id }),
        Product.countDocuments({ tenant: tenant._id }),
        Invoice.aggregate([
          { $match: { tenant: tenant._id } },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' },
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      ApiResponse.success(res, {
        tenant,
        branches,
        users,
        stats: {
          customers,
          products,
          invoices: invoices[0]?.count || 0,
          revenue: invoices[0]?.total || 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/super-admin/tenants
   * Create new tenant (Super Admin only)
   */
  async createTenant(req, res, next) {
    try {
      const { name, businessInfo, adminEmail, adminPassword } = req.body;

      if (!name || !adminEmail || !adminPassword) {
        return next(AppError.badRequest('البيانات المطلوبة: name, adminEmail, adminPassword'));
      }

      // Create tenant
      const tenant = await Tenant.create({
        name,
        businessInfo,
        settings: {
          categories: getStarterCategorySettings(),
        },
      });
      await require('../services/starterCatalogService').seedStarterCatalogForTenant(tenant._id);

      // Create admin user for this tenant
      const admin = await User.create({
        name: `Admin ${name}`,
        email: adminEmail,
        password: adminPassword,
        phone: businessInfo?.phone || '0000000000',
        role: 'admin',
        tenant: tenant._id,
        isActive: true
      });

      ApiResponse.success(res, { tenant, admin }, 'تم إنشاء المحل بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/super-admin/tenants/:id
   * Update tenant details
   */
  async updateTenant(req, res, next) {
    try {
      const { name, isActive, subscription } = req.body;
      const tenant = await Tenant.findById(req.params.id);

      if (!tenant) return next(AppError.notFound('المحل غير موجود'));

      if (name) tenant.name = name;
      if (isActive !== undefined) {
        tenant.isActive = isActive;
        // Deactivate/Activate all users of this tenant? 
        // Usually we want to block access if tenant is inactive. 
        // Middleware `tenantScope` or login should check tenant.isActive
        await User.updateMany({ tenant: tenant._id }, { isActive: isActive });
      }
      if (subscription) tenant.subscription = subscription;

      await tenant.save();

      ApiResponse.success(res, { tenant }, 'تم تحديث المحل بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/super-admin/tenants/:id
   * Soft delete tenant
   */
  async deleteTenant(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.params.id);
      if (!tenant) return next(AppError.notFound('المحل غير موجود'));

      tenant.isActive = false;
      await tenant.save();

      // Deactivate all users
      await User.updateMany({ tenant: tenant._id }, { isActive: false });

      ApiResponse.success(res, null, 'تم تعطيل المحل بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/super-admin/tenants/:id/impersonate
   * Login as this tenant's admin
   */
  async impersonateTenant(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.params.id);
      if (!tenant) return next(AppError.notFound('المحل غير موجود'));

      // Find the admin user for this tenant
      const adminUser = await User.findOne({ tenant: tenant._id, role: 'admin' }).sort({ createdAt: 1 });

      if (!adminUser) {
        return next(AppError.notFound('لا يوجد مدير لهذا المحل'));
      }

      // Generate token for this user
      const token = adminUser.getSignedJwtToken();

      ApiResponse.success(res, {
        token,
        user: adminUser,
        tenant
      }, `تم الدخول كـ ${adminUser.name}`);
    } catch (error) {
      next(error);
    }
  }
  /**
   * GET /api/v1/super-admin/subscription-requests
   * List all subscription requests
   */
  getSubscriptionRequests = catchAsync(async (req, res) => {
    const { status = 'pending' } = req.query;
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const requests = await SubscriptionRequest.find(query)
      .populate('tenant', 'name email phone')
      .populate('plan', 'name price currency')
      .sort('-createdAt');

    ApiResponse.success(res, requests);
  });

  /**
   * POST /api/v1/super-admin/subscription-requests/:id/approve
   * Approves a request and activates the tenant's subscription
   */
  approveSubscriptionRequest = catchAsync(async (req, res, next) => {
    const request = await SubscriptionRequest.findById(req.params.id)
      .populate('plan');

    if (!request) {
      return next(AppError.notFound('الطلب غير موجود'));
    }

    if (request.status !== 'pending') {
      return next(AppError.badRequest('تم التعامل مع هذا الطلب مسبقاً'));
    }

    const tenant = await Tenant.findById(request.tenant);
    if (!tenant) {
      return next(AppError.notFound('المتجر غير موجود'));
    }

    // Activate subscription
    tenant.subscription.plan = request.plan._id;
    tenant.subscription.status = 'active';
    tenant.subscription.gateway = request.gateway;

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (request.plan.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    tenant.subscription.currentPeriodStart = startDate;
    tenant.subscription.currentPeriodEnd = endDate;
    tenant.subscription.maxProducts = request.plan.limits.maxProducts;
    tenant.subscription.maxCustomers = request.plan.limits.maxCustomers;
    tenant.subscription.maxUsers = request.plan.limits.maxUsers;
    tenant.subscription.maxBranches = request.plan.limits.maxBranches;

    await tenant.save();

    // Mark request as approved
    request.status = 'approved';
    request.approvedBy = req.user.id;
    await request.save();

    // Send Notification to Vendor + Super Admin
    NotificationService.onSubscriptionApproved(tenant._id, request.plan.name, tenant.name).catch(() => { });

    ApiResponse.success(res, { request, tenant: tenant.subscription }, 'تم الموافقة على الطلب وتفعيل الاشتراك بنجاح');
  });

  /**
   * POST /api/v1/super-admin/subscription-requests/:id/reject
   * Rejects a subscription request
   */
  rejectSubscriptionRequest = catchAsync(async (req, res, next) => {
    const { reason } = req.body;
    const request = await SubscriptionRequest.findById(req.params.id);

    if (!request) {
      return next(AppError.notFound('الطلب غير موجود'));
    }

    if (request.status !== 'pending') {
      return next(AppError.badRequest('تم التعامل مع هذا الطلب مسبقاً'));
    }

    // Mark request as rejected
    request.status = 'rejected';
    request.approvedBy = req.user.id;
    request.rejectionReason = reason || 'تم الرفض بواسطة الإدارة';
    await request.save();

    // Send Notification to Vendor + Super Admin
    NotificationService.onSubscriptionRejected(request.tenant, request.rejectionReason, '').catch(() => { });

    ApiResponse.success(res, request, 'تم رفض الطلب بنجاح');
  });

  /**
   * GET /api/v1/super-admin/leads
   * List public website leads with lightweight filters
   */
  getPublicLeads = catchAsync(async (req, res) => {
    const status = String(req.query?.status || 'all').trim();
    const requestType = String(req.query?.requestType || 'all').trim();
    const search = String(req.query?.search || '').trim();

    const query = {};
    if (status !== 'all') query.status = status;
    if (requestType !== 'all') query.requestType = requestType;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const [leads, stats] = await Promise.all([
      PublicLead.find(query).sort({ submittedAt: -1, createdAt: -1 }).limit(200),
      PublicLead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    ApiResponse.success(res, { leads, stats });
  });

  /**
   * PATCH /api/v1/super-admin/leads/:id
   * Update public website lead status and notes
   */
  updatePublicLead = catchAsync(async (req, res, next) => {
    const lead = await PublicLead.findById(req.params.id);
    if (!lead) {
      return next(AppError.notFound('\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F')); 
    }

    const nextStatus = String(req.body?.status || '').trim();
    const internalNotes = String(req.body?.internalNotes || '').trim();
    const allowedStatuses = ['new', 'contacted', 'qualified', 'closed', 'spam'];

    if (nextStatus) {
      if (!allowedStatuses.includes(nextStatus)) {
        return next(AppError.badRequest('\u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629')); 
      }
      lead.status = nextStatus;
      if (['contacted', 'qualified', 'closed'].includes(nextStatus)) {
        lead.lastContactedAt = new Date();
      }
    }

    if (req.body?.internalNotes !== undefined) {
      lead.internalNotes = internalNotes;
    }

    await lead.save();

    ApiResponse.success(res, lead, '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0637\u0644\u0628 \u0628\u0646\u062C\u0627\u062D');
  });
}

module.exports = new SuperAdminController();
