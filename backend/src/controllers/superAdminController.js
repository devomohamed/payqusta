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
const Plan = require('../models/Plan');
const SystemConfig = require('../models/SystemConfig');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const PublicLead = require('../models/PublicLead');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const NotificationService = require('../services/NotificationService');
const { getStarterCategorySettings } = require('../services/starterCatalogService');
const { buildTenantJsonBackup } = require('../services/backupExportService');
const backupController = require('./backupController');

const PLATFORM_BACKUP_DOMAINS = ['plans', 'systemConfigs', 'publicLeads'];
const PLATFORM_BACKUP_KNOWN_GAPS = [
  'tenants',
  'tenant_operational_data',
  'tenant_users_and_sessions',
  'runtime_env_secrets',
  'payment_gateway_secrets',
  'full_platform_disaster_recovery',
];

function sanitizePlan(plan = {}) {
  const raw = typeof plan.toObject === 'function' ? plan.toObject() : plan;
  const { _id, createdAt, updatedAt, __v, ...rest } = raw || {};
  return rest;
}

function sanitizeSystemConfig(config = {}) {
  const raw = typeof config.toObject === 'function' ? config.toObject() : config;
  const { _id, createdAt, updatedAt, __v, ...rest } = raw || {};
  return rest;
}

function sanitizePublicLead(lead = {}) {
  const raw = typeof lead.toObject === 'function' ? lead.toObject() : lead;
  const { _id, createdAt, updatedAt, __v, ...rest } = raw || {};
  return rest;
}

function buildPlatformBackupValidationReport({ backup = null, results = {}, warnings = [] } = {}) {
  const backupData = backup?.data || {};
  const includedDomains = PLATFORM_BACKUP_DOMAINS.filter((domain) => (
    Array.isArray(backupData[domain]) ? backupData[domain].length > 0 : Boolean(backupData[domain])
  ));

  return {
    backupMetadata: backup ? {
      version: backup.version || null,
      appName: backup.appName || null,
      exportedAt: backup.exportedAt || null,
      scope: backup.scope || null,
    } : null,
    supportedDomains: PLATFORM_BACKUP_DOMAINS,
    includedDomains,
    missingSupportedDomains: PLATFORM_BACKUP_DOMAINS.filter((domain) => !includedDomains.includes(domain)),
    results,
    warnings,
    knownGaps: PLATFORM_BACKUP_KNOWN_GAPS,
  };
}

async function buildPlatformJsonBackup() {
  const [plans, systemConfigs, publicLeads] = await Promise.all([
    Plan.find().sort({ isActive: -1, price: 1, createdAt: -1 }).lean(),
    SystemConfig.find().sort({ key: 1 }).lean(),
    PublicLead.find().sort({ submittedAt: -1, createdAt: -1 }).lean(),
  ]);

  return {
    version: 'platform-backup-v1',
    appName: 'PayQusta',
    scope: 'platform',
    exportedAt: new Date().toISOString(),
    counts: {
      plans: plans.length,
      systemConfigs: systemConfigs.length,
      publicLeads: publicLeads.length,
    },
    data: {
      plans: plans.map(sanitizePlan),
      systemConfigs: systemConfigs.map(sanitizeSystemConfig),
      publicLeads: publicLeads.map(sanitizePublicLead),
    },
  };
}

async function restorePlatformBackupObject(backup = {}) {
  const exportedPlans = Array.isArray(backup.data?.plans) ? backup.data.plans : [];
  const exportedSystemConfigs = Array.isArray(backup.data?.systemConfigs) ? backup.data.systemConfigs : [];
  const exportedPublicLeads = Array.isArray(backup.data?.publicLeads) ? backup.data.publicLeads : [];

  const results = {
    plans: { imported: 0, updated: 0, skipped: 0 },
    systemConfigs: { imported: 0, updated: 0, skipped: 0 },
    publicLeads: { imported: 0, skipped: 0 },
  };
  const warnings = [];

  for (const plan of exportedPlans) {
    if (!plan?.name) {
      results.plans.skipped += 1;
      warnings.push('plan_missing_name');
      continue;
    }

    const payload = sanitizePlan(plan);
    const existing = await Plan.findOne({ name: plan.name });
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      results.plans.updated += 1;
    } else {
      await Plan.create(payload);
      results.plans.imported += 1;
    }
  }

  for (const config of exportedSystemConfigs) {
    const key = String(config?.key || 'default').trim() || 'default';
    const payload = sanitizeSystemConfig({ ...config, key });
    const existing = await SystemConfig.findOne({ key });
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      results.systemConfigs.updated += 1;
    } else {
      await SystemConfig.create(payload);
      results.systemConfigs.imported += 1;
    }
  }

  for (const lead of exportedPublicLeads) {
    const email = String(lead?.email || '').trim().toLowerCase();
    const requestType = String(lead?.requestType || '').trim();
    const submittedAt = lead?.submittedAt ? new Date(lead.submittedAt) : null;

    if (!email || !requestType || !submittedAt || Number.isNaN(submittedAt.getTime())) {
      results.publicLeads.skipped += 1;
      warnings.push('public_lead_missing_identity_fields');
      continue;
    }

    const existing = await PublicLead.findOne({
      email,
      requestType,
      submittedAt,
    });

    if (existing) {
      results.publicLeads.skipped += 1;
      continue;
    }

    await PublicLead.create({
      ...sanitizePublicLead(lead),
      email,
      submittedAt,
    });
    results.publicLeads.imported += 1;
  }

  return {
    results,
    validationReport: buildPlatformBackupValidationReport({
      backup,
      results,
      warnings: [...new Set(warnings)],
    }),
  };
}

function buildTenantLookupCandidates(entry = {}) {
  const candidates = [];
  const metadata = entry.tenant || {};
  const snapshot = entry.backup?.data?.tenantSnapshot || {};

  if (metadata._id && mongoose.isValidObjectId(String(metadata._id))) {
    candidates.push({ kind: 'id', value: String(metadata._id) });
  }
  if (metadata.slug || snapshot.slug) {
    candidates.push({ kind: 'slug', value: String(metadata.slug || snapshot.slug).trim().toLowerCase() });
  }
  if (metadata.customDomain || snapshot.customDomain) {
    candidates.push({ kind: 'customDomain', value: String(metadata.customDomain || snapshot.customDomain).trim().toLowerCase() });
  }
  if (metadata.name || snapshot.name) {
    candidates.push({ kind: 'name', value: String(metadata.name || snapshot.name).trim() });
  }

  return candidates.filter((candidate) => candidate.value);
}

async function resolveOrCreateTargetTenant(entry = {}) {
  const candidates = buildTenantLookupCandidates(entry);
  let tenant = null;

  for (const candidate of candidates) {
    if (candidate.kind === 'id') {
      tenant = await Tenant.findById(candidate.value);
    } else if (candidate.kind === 'slug') {
      tenant = await Tenant.findOne({ slug: candidate.value });
    } else if (candidate.kind === 'customDomain') {
      tenant = await Tenant.findOne({ customDomain: candidate.value });
    } else if (candidate.kind === 'name') {
      tenant = await Tenant.findOne({ name: candidate.value });
    }

    if (tenant) {
      return { tenant, created: false, matchedBy: candidate.kind };
    }
  }

  const metadata = entry.tenant || {};
  const snapshot = entry.backup?.data?.tenantSnapshot || {};
  tenant = await Tenant.create({
    name: metadata.name || snapshot.name || `Restored Tenant ${Date.now()}`,
    slug: metadata.slug || snapshot.slug || undefined,
    customDomain: metadata.customDomain || snapshot.customDomain || undefined,
    customDomainStatus: metadata.customDomainStatus || snapshot.customDomainStatus || undefined,
    settings: {
      categories: getStarterCategorySettings(),
    },
    subscription: {
      status: metadata.subscriptionStatus || snapshot.subscription?.status || 'trial',
      plan: metadata.plan || snapshot.subscription?.plan || null,
    },
    isActive: metadata.isActive !== false,
  });

  return { tenant, created: true, matchedBy: 'created' };
}

async function invokeTenantBackupRestore(tenantId, tenantBackup) {
  const req = {
    tenantId,
    file: {
      buffer: Buffer.from(JSON.stringify(tenantBackup)),
    },
  };

  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return payload;
      },
    };
    const finalize = () => resolve({
      statusCode: res.statusCode,
      payload: res.payload,
    });

    Promise.resolve(
      backupController.restoreJSON(req, res, (error) => {
        if (error) {
          reject(error);
          return;
        }
        finalize();
      })
    )
      .then(finalize)
      .catch(reject);
  });
}

async function buildFullPlatformJsonBackup() {
  const [platform, tenants] = await Promise.all([
    buildPlatformJsonBackup(),
    Tenant.find({ isActive: true })
      .select('name slug isActive subscription.status subscription.plan customDomain customDomainStatus createdAt updatedAt')
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const tenantBackups = [];
  for (const tenant of tenants) {
    const snapshot = await buildTenantJsonBackup(tenant._id);
    tenantBackups.push({
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        slug: tenant.slug || null,
        isActive: tenant.isActive !== false,
        customDomain: tenant.customDomain || null,
        customDomainStatus: tenant.customDomainStatus || 'not_configured',
        subscriptionStatus: tenant.subscription?.status || null,
        plan: tenant.subscription?.plan || null,
        createdAt: tenant.createdAt || null,
        updatedAt: tenant.updatedAt || null,
      },
      backup: snapshot,
    });
  }

  return {
    version: 'platform-full-backup-v1',
    appName: 'PayQusta',
    scope: 'platform_full',
    exportedAt: new Date().toISOString(),
    counts: {
      platformPlans: platform.counts.plans,
      platformSystemConfigs: platform.counts.systemConfigs,
      platformPublicLeads: platform.counts.publicLeads,
      tenants: tenantBackups.length,
      tenantRecords: tenantBackups.reduce((sum, entry) => sum + Number(entry.backup?.counts?.total || 0), 0),
    },
    platform: platform.data,
    tenants: tenantBackups,
  };
}

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

  /**
   * GET /api/v1/super-admin/backup/stats
   * Lightweight platform-level backup preview counts
   */
  getPlatformBackupStats = catchAsync(async (req, res) => {
    const [plans, systemConfigs, publicLeads] = await Promise.all([
      Plan.countDocuments(),
      SystemConfig.countDocuments(),
      PublicLead.countDocuments(),
    ]);

    ApiResponse.success(res, {
      counts: { plans, systemConfigs, publicLeads },
      supportedDomains: PLATFORM_BACKUP_DOMAINS,
      knownGaps: PLATFORM_BACKUP_KNOWN_GAPS,
    });
  });

  /**
   * GET /api/v1/super-admin/backup/export-json
   * Export platform-level non-tenant configuration snapshot
   */
  exportPlatformBackupJSON = catchAsync(async (req, res) => {
    const backup = await buildPlatformJsonBackup();
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="payqusta-platform-backup-${stamp}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  });

  /**
   * GET /api/v1/super-admin/backup/export-full-json
   * Export a full-platform snapshot that embeds every active tenant backup
   */
  exportFullPlatformBackupJSON = catchAsync(async (req, res) => {
    const backup = await buildFullPlatformJsonBackup();
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="payqusta-full-platform-backup-${stamp}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  });

  /**
   * POST /api/v1/super-admin/backup/restore-json
   * Restore platform-level non-tenant configuration snapshot
   */
  restorePlatformBackupJSON = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(AppError.badRequest('Backup file is required'));
    }

    let backup;
    try {
      backup = JSON.parse(String(req.file.buffer || '').trim());
    } catch (error) {
      return next(AppError.badRequest('Invalid platform backup JSON file'));
    }

    if (!backup?.data || backup.scope !== 'platform') {
      return next(AppError.badRequest('This file is not a valid platform backup'));
    }
    const { results, validationReport } = await restorePlatformBackupObject(backup);

    ApiResponse.success(res, {
      results,
      validationReport,
    }, 'Platform backup restored successfully');
  });

  /**
   * POST /api/v1/super-admin/backup/restore-full-json
   * Restore platform control-plane data and tenant backups from one full snapshot
   */
  restoreFullPlatformBackupJSON = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(AppError.badRequest('Backup file is required'));
    }

    let backup;
    try {
      backup = JSON.parse(String(req.file.buffer || '').trim());
    } catch {
      return next(AppError.badRequest('Invalid full platform backup JSON file'));
    }

    if (!backup?.platform || !Array.isArray(backup.tenants) || backup.scope !== 'platform_full') {
      return next(AppError.badRequest('This file is not a valid full platform backup'));
    }

    const platformPayload = {
      version: backup.version || 'platform-backup-v1',
      appName: backup.appName || 'PayQusta',
      scope: 'platform',
      exportedAt: backup.exportedAt || new Date().toISOString(),
      data: backup.platform,
    };

    const platformRestore = await restorePlatformBackupObject(platformPayload);
    const tenantResults = [];

    for (const entry of backup.tenants) {
      const tenantBackup = entry?.backup;
      if (!tenantBackup?.data || !tenantBackup?.appName) {
        tenantResults.push({
          tenant: entry?.tenant || null,
          success: false,
          error: 'invalid_tenant_backup_payload',
        });
        continue;
      }

      try {
        const { tenant, created, matchedBy } = await resolveOrCreateTargetTenant(entry);
        const restoreResult = await invokeTenantBackupRestore(String(tenant._id), tenantBackup);
        tenantResults.push({
          tenant: {
            _id: tenant._id,
            name: tenant.name,
            slug: tenant.slug || null,
          },
          success: true,
          created,
          matchedBy,
          restore: restoreResult.payload?.data || null,
        });
      } catch (error) {
        tenantResults.push({
          tenant: entry?.tenant || null,
          success: false,
          error: error.message || 'tenant_restore_failed',
        });
      }
    }

    const summary = {
      platform: platformRestore.results,
      tenants: {
        total: tenantResults.length,
        restored: tenantResults.filter((entry) => entry.success).length,
        failed: tenantResults.filter((entry) => !entry.success).length,
        created: tenantResults.filter((entry) => entry.success && entry.created).length,
      },
    };

    ApiResponse.success(res, {
      summary,
      platformValidationReport: platformRestore.validationReport,
      tenantResults,
      knownGaps: [
        'environment_secrets_and_runtime_state',
        'single-transaction_cross_tenant_restore',
        'one-click_infrastructure_rebuild',
      ],
    }, 'Full platform backup restore completed');
  });
}

module.exports = new SuperAdminController();
