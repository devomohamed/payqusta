const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Branch = require('../models/Branch');
const Role = require('../models/Role');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Plan = require('../models/Plan');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const { readUploadedFile } = require('../middleware/upload');

function stripInternalFields(doc) {
  const { __v, ...rest } = doc;
  return rest;
}

function buildTenantSnapshot(tenant) {
  if (!tenant) return null;

  return {
    name: tenant.name,
    slug: tenant.slug,
    customDomain: tenant.customDomain || null,
    customDomainStatus: tenant.customDomainStatus || 'not_configured',
    customDomainLastCheckedAt: tenant.customDomainLastCheckedAt || null,
    branding: tenant.branding || {},
    businessInfo: tenant.businessInfo || {},
    settings: {
      ...(tenant.settings || {}),
      autoBackup: {
        enabled: Boolean(tenant.settings?.autoBackup?.enabled),
        consentAcceptedAt: tenant.settings?.autoBackup?.consentAcceptedAt || null,
        frequency: tenant.settings?.autoBackup?.frequency || 'daily',
        format: tenant.settings?.autoBackup?.format || 'json',
        destination: {
          type: tenant.settings?.autoBackup?.destination?.type || 'platform_storage',
        },
        retention: {
          keepLast: Math.max(1, Number(tenant.settings?.autoBackup?.retention?.keepLast || 14)),
        },
      },
    },
    whatsapp: tenant.whatsapp || {},
    subscription: tenant.subscription || {},
    dashboardWidgets: tenant.dashboardWidgets || [],
    cameras: tenant.cameras || [],
    addons: tenant.addons || [],
    isActive: tenant.isActive !== false,
    createdAt: tenant.createdAt || null,
    updatedAt: tenant.updatedAt || null,
  };
}

function sanitizeUserForBackup(user) {
  const cleaned = stripInternalFields(user);

  return {
    _id: cleaned._id,
    name: cleaned.name,
    email: cleaned.email,
    phone: cleaned.phone,
    passwordHash: cleaned.password,
    role: cleaned.role,
    branch: cleaned.branch || null,
    isSuperAdmin: Boolean(cleaned.isSuperAdmin),
    customRole: cleaned.customRole || null,
    avatar: cleaned.avatar || null,
    isActive: cleaned.isActive !== false,
    twoFactorEnabled: false,
    lastLogin: cleaned.lastLogin || null,
    passwordChangedAt: cleaned.passwordChangedAt || null,
    gamification: cleaned.gamification || {},
    commissionRate: Number(cleaned.commissionRate || 0),
    createdAt: cleaned.createdAt || null,
    updatedAt: cleaned.updatedAt || null,
  };
}

function sanitizeSubscriptionRequestForBackup(request, planById = new Map()) {
  const cleaned = stripInternalFields(request);
  const plan = cleaned.plan?._id ? cleaned.plan : planById.get(String(cleaned.plan)) || null;

  return {
    ...cleaned,
    plan: cleaned.plan?._id || cleaned.plan || null,
    planSnapshot: plan ? {
      _id: plan._id,
      name: plan.name,
      slug: plan.slug || null,
      billingCycle: plan.billingCycle || null,
      price: Number(plan.price || 0),
      currency: plan.currency || null,
    } : null,
  };
}

function normalizeUploadKey(value = '') {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
}

function extractUploadKey(filepath) {
  if (typeof filepath !== 'string') return null;

  const normalizedPath = filepath.split('?')[0].split('#')[0];
  const uploadsIndex = normalizedPath.indexOf('/uploads/');
  if (uploadsIndex < 0) return null;

  return normalizeUploadKey(normalizedPath.slice(uploadsIndex + '/uploads/'.length));
}

function appendUploadUrl(target, value) {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/uploads/')) return;
  target.push(trimmed);
}

function collectReferencedUploadUrls({ products = [], customers = [], expenses = [], users = [], tenantSnapshot = null }) {
  const uploadUrls = [];

  for (const product of products) {
    for (const image of product.images || []) appendUploadUrl(uploadUrls, image);
    for (const image of product.originalImages || []) appendUploadUrl(uploadUrls, image);
    appendUploadUrl(uploadUrls, product.thumbnail);
    for (const variant of product.variants || []) appendUploadUrl(uploadUrls, variant?.image);
  }

  for (const customer of customers) {
    appendUploadUrl(uploadUrls, customer.profilePhoto);
    for (const document of customer.documents || []) {
      appendUploadUrl(uploadUrls, document?.url);
      appendUploadUrl(uploadUrls, document?.backUrl);
    }
  }

  for (const expense of expenses) {
    for (const attachment of expense.attachments || []) appendUploadUrl(uploadUrls, attachment);
  }

  for (const user of users) {
    appendUploadUrl(uploadUrls, user.avatar);
  }

  appendUploadUrl(uploadUrls, tenantSnapshot?.branding?.logo);

  return Array.from(new Set(uploadUrls));
}

async function buildReferencedUploadBinaries(uploadUrls = []) {
  const uploadBinaries = [];

  for (const url of uploadUrls) {
    const key = extractUploadKey(url);
    if (!key) continue;

    try {
      const uploadData = await readUploadedFile(url);
      if (!uploadData?.buffer?.length) continue;

      const pathParts = key.split('/');
      uploadBinaries.push({
        key,
        folder: pathParts.slice(0, -1).join('/'),
        filename: pathParts[pathParts.length - 1] || key,
        contentType: uploadData.contentType || 'application/octet-stream',
        size: Number(uploadData.size || uploadData.buffer.length || 0),
        encoding: 'base64',
        data: uploadData.buffer.toString('base64'),
        sourceUrl: url,
      });
    } catch {
      // Missing upload payloads should not break the entire tenant backup.
    }
  }

  return uploadBinaries;
}

async function countTenantReferencedUploadBinaries(tenantId) {
  const [products, customers, expenses, users, tenant] = await Promise.all([
    Product.find({ tenant: tenantId }).select('images originalImages thumbnail variants.image').lean(),
    Customer.find({ tenant: tenantId }).select('profilePhoto documents.url documents.backUrl').lean(),
    Expense.find({ tenant: tenantId }).select('attachments').lean(),
    User.find({ tenant: tenantId }).select('avatar').lean(),
    Tenant.findById(tenantId).select('branding.logo').lean(),
  ]);

  return collectReferencedUploadUrls({
    products,
    customers,
    expenses,
    users,
    tenantSnapshot: buildTenantSnapshot(tenant),
  }).length;
}

async function buildTenantJsonBackup(tenantId) {
  const [products, customers, suppliers, invoices, expenses, branches, roles, users, tenant, notifications, auditLogs, plans, subscriptionRequests] = await Promise.all([
    Product.find({ tenant: tenantId }).lean(),
    Customer.find({ tenant: tenantId }).lean(),
    Supplier.find({ tenant: tenantId }).lean(),
    Invoice.find({ tenant: tenantId }).populate('customer', 'name phone').lean(),
    Expense.find({ tenant: tenantId }).lean(),
    Branch.find({ tenant: tenantId }).lean(),
    Role.find({ tenant: tenantId }).lean(),
    User.find({ tenant: tenantId }).select('+password').lean(),
    Tenant.findById(tenantId).lean(),
    Notification.find({ tenant: tenantId }).lean(),
    AuditLog.find({ tenant: tenantId }).lean(),
    Plan.find({ isActive: true }).lean(),
    SubscriptionRequest.find({ tenant: tenantId }).lean(),
  ]);

  const tenantSnapshot = buildTenantSnapshot(tenant);
  const usersForBackup = users.map(sanitizeUserForBackup);
  const planById = new Map(plans.map((plan) => [String(plan._id), plan]));
  const subscriptionRequestsForBackup = subscriptionRequests.map((request) => sanitizeSubscriptionRequestForBackup(request, planById));
  const uploadBinaries = await buildReferencedUploadBinaries(
    collectReferencedUploadUrls({
      products,
      customers,
      expenses,
      users: usersForBackup,
      tenantSnapshot,
    })
  );
  const total = products.length
    + customers.length
    + suppliers.length
    + invoices.length
    + expenses.length
    + branches.length
    + roles.length
    + usersForBackup.length
    + subscriptionRequestsForBackup.length
    + notifications.length
    + auditLogs.length
    + uploadBinaries.length
    + (tenantSnapshot ? 1 : 0);

  return {
    version: '1.0',
    appName: 'PayQusta',
    exportedAt: new Date().toISOString(),
    tenant: tenantId,
    counts: {
      products: products.length,
      customers: customers.length,
      suppliers: suppliers.length,
      invoices: invoices.length,
      expenses: expenses.length,
      branches: branches.length,
      roles: roles.length,
      users: usersForBackup.length,
      subscriptionRequests: subscriptionRequestsForBackup.length,
      notifications: notifications.length,
      auditLogs: auditLogs.length,
      uploadBinaries: uploadBinaries.length,
      tenantConfig: tenantSnapshot ? 1 : 0,
      total,
    },
    data: {
      products: products.map(stripInternalFields),
      customers: customers.map(stripInternalFields),
      suppliers: suppliers.map(stripInternalFields),
      invoices: invoices.map(stripInternalFields),
      expenses: expenses.map(stripInternalFields),
      branches: branches.map(stripInternalFields),
      roles: roles.map(stripInternalFields),
      users: usersForBackup,
      subscriptionRequests: subscriptionRequestsForBackup,
      notifications: notifications.map(stripInternalFields),
      auditLogs: auditLogs.map(stripInternalFields),
      uploadBinaries,
      tenantSnapshot,
    },
  };
}

module.exports = {
  buildTenantJsonBackup,
  countTenantReferencedUploadBinaries,
};
