/**
 * Backup Controller — Data Backup & Restore
 */

const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');

// Models
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const Role = require('../models/Role');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const StoredUpload = require('../models/StoredUpload');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const {
  buildTenantJsonBackup,
  countTenantReferencedUploadBinaries,
} = require('../services/backupExportService');
const {
  listTenantBackups,
  countTenantBackups,
} = require('../services/autoBackupStorageService');

const EXCEL_SHEET_NAMES = {
  products: 'المنتجات',
  customers: 'العملاء',
  suppliers: 'الموردين',
};

const EXCEL_HEADERS = {
  name: 'الاسم',
  barcode: 'الباركود',
  category: 'الفئة',
  salePrice: 'سعر البيع',
  costPrice: 'سعر الشراء',
  quantity: 'الكمية',
  minQuantity: 'الحد الأدنى',
  phone: 'الهاتف',
  email: 'البريد',
  address: 'العنوان',
  totalPurchases: 'إجمالي المشتريات',
  remaining: 'المتبقي',
  points: 'نقاط الولاء',
  tier: 'المستوى',
  contactPerson: 'جهة الاتصال',
  paymentTerms: 'شروط الدفع',
  supplierPurchases: 'المشتريات',
  outstandingBalance: 'المستحق',
};

const JSON_BACKUP_SUPPORTED_DOMAINS = [
  'products',
  'customers',
  'suppliers',
  'invoices',
  'expenses',
  'branches',
  'roles',
  'users',
  'subscriptionRequests',
  'notifications',
  'auditLogs',
  'uploadBinaries',
  'tenantConfig',
];

const EXCEL_BACKUP_SUPPORTED_DOMAINS = [
  'products',
  'customers',
  'suppliers',
];

const BACKUP_DOMAIN_LABELS = {
  products: 'products',
  customers: 'customers',
  suppliers: 'suppliers',
  invoices: 'invoices',
  expenses: 'expenses',
  branches: 'branches',
  roles: 'roles',
  users: 'users',
  subscriptionRequests: 'subscriptionRequests',
  notifications: 'notifications',
  auditLogs: 'auditLogs',
  uploadBinaries: 'uploadBinaries',
  tenantConfig: 'tenantConfig',
};

const BACKUP_KNOWN_GAPS = [
  'platform_level_config',
  'full_multi_tenant_snapshot',
];

function extractWorksheetValue(cellValue) {
  if (cellValue == null) return '';
  if (cellValue instanceof Date) return cellValue;

  if (typeof cellValue === 'object') {
    if (typeof cellValue.text === 'string') return cellValue.text.trim();
    if (typeof cellValue.result !== 'undefined') return cellValue.result;
    if (Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((item) => item?.text || '').join('').trim();
    }
  }

  return cellValue;
}

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function readWorksheetRows(worksheet) {
  if (!worksheet) return [];

  const headers = [];
  worksheet.getRow(1).eachCell((cell, col) => {
    headers[col] = normalizeString(extractWorksheetValue(cell.value));
  });

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const record = {};
    row.eachCell((cell, col) => {
      const header = headers[col];
      if (!header) return;
      record[header] = extractWorksheetValue(cell.value);
    });

    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  });

  return rows;
}

function withOptionalSession(query, session) {
  return session ? query.session(session) : query;
}

async function createWithOptionalSession(Model, payload, session) {
  if (session) {
    await Model.create([payload], { session });
    return;
  }

  await Model.create(payload);
}

async function insertRawWithOptionalSession(Model, payload, session) {
  if (session) {
    await Model.collection.insertOne(payload, { session });
    return;
  }

  await Model.collection.insertOne(payload);
}

function supportsTransactions() {
  try {
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    return topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';
  } catch {
    return false;
  }
}

async function startRestoreSession() {
  if (!supportsTransactions()) return null;

  const session = await mongoose.startSession();
  session.startTransaction();
  return session;
}

function buildSupplierDuplicateQuery(tenantId, supplier) {
  const filters = [];
  const phone = normalizeString(supplier.phone);
  const name = normalizeString(supplier.name);

  if (phone) filters.push({ phone });
  if (name) filters.push({ name });

  if (filters.length === 0) return null;

  return {
    tenant: tenantId,
    $or: filters,
  };
}

function stripRestoreMeta(payload = {}) {
  const clean = { ...payload };
  delete clean._id;
  delete clean.__v;
  return clean;
}

function buildTenantSnapshotUpdate(snapshot = {}) {
  return {
    name: snapshot.name,
    slug: snapshot.slug,
    customDomain: snapshot.customDomain || undefined,
    customDomainStatus: snapshot.customDomainStatus,
    customDomainLastCheckedAt: snapshot.customDomainLastCheckedAt || null,
    branding: snapshot.branding || {},
    businessInfo: snapshot.businessInfo || {},
    settings: snapshot.settings || {},
    whatsapp: snapshot.whatsapp || {},
    subscription: snapshot.subscription || {},
    dashboardWidgets: snapshot.dashboardWidgets || [],
    cameras: snapshot.cameras || [],
    addons: snapshot.addons || [],
    isActive: snapshot.isActive !== false,
  };
}

function resolveMappedId(legacyId, ...maps) {
  if (!legacyId) return null;
  const key = String(legacyId);
  for (const map of maps) {
    if (map?.has(key)) return map.get(key);
  }
  return null;
}

function buildNotificationDuplicateQuery(tenantId, notification, recipientId, customerRecipientId) {
  const query = {
    tenant: tenantId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt,
  };

  if (recipientId) query.recipient = recipientId;
  if (customerRecipientId) query.customerRecipient = customerRecipientId;

  return query;
}

function buildAuditLogDuplicateQuery(tenantId, auditLog, userId) {
  const query = {
    tenant: tenantId,
    action: auditLog.action,
    resource: auditLog.resource,
    createdAt: auditLog.createdAt,
  };

  if (userId) query.user = userId;

  return query;
}

function buildSubscriptionRequestDuplicateQuery(tenantId, request, planId) {
  return {
    tenant: tenantId,
    gateway: request.gateway,
    status: request.status,
    createdAt: request.createdAt,
    ...(planId ? { plan: planId } : {}),
  };
}

function summarizeRestoreResults(results) {
  return Object.values(results).reduce(
    (summary, current) => ({
      imported: summary.imported + Number(current.imported || 0),
      skipped: summary.skipped + Number(current.skipped || 0),
    }),
    { imported: 0, skipped: 0 }
  );
}

function buildRestoreValidationReport({ format, backup = null, results, supportedDomains, warnings = [] }) {
  const summary = summarizeRestoreResults(results);
  const backupData = backup?.data || {};
  const includedDomains = supportedDomains.filter((domain) => {
    if (domain === 'tenantConfig') return Boolean(backupData.tenantSnapshot);
    return Array.isArray(backupData[domain]) ? backupData[domain].length > 0 : Boolean(backupData[domain]);
  });
  const missingDomains = supportedDomains.filter((domain) => !includedDomains.includes(domain));

  return {
    format,
    backupMetadata: backup ? {
      version: backup.version || null,
      appName: backup.appName || null,
      exportedAt: backup.exportedAt || null,
      sourceTenant: backup.tenant || null,
    } : null,
    summary: {
      imported: summary.imported,
      skipped: summary.skipped,
      failed: 0,
      restoredDomains: Object.entries(results).map(([key, value]) => ({
        key,
        label: BACKUP_DOMAIN_LABELS[key] || key,
        imported: Number(value.imported || 0),
        skipped: Number(value.skipped || 0),
      })),
    },
    coverage: {
      supportedDomains,
      includedDomains,
      missingDomains,
      knownGaps: BACKUP_KNOWN_GAPS,
    },
    warnings,
  };
}

function buildAutoBackupStatus(autoBackup = {}) {
  if (!autoBackup.enabled) return 'disabled';
  if (autoBackup.lastFailureAt && (!autoBackup.lastSuccessAt || new Date(autoBackup.lastFailureAt) > new Date(autoBackup.lastSuccessAt))) {
    return 'error';
  }
  if (autoBackup.lastSuccessAt) return 'ok';
  return 'pending';
}

async function buildAutoBackupResponse(tenantId, autoBackup = {}) {
  const [storedCount, recentBackups] = await Promise.all([
    countTenantBackups(tenantId),
    listTenantBackups(tenantId, { limit: 5 }),
  ]);

  return {
    enabled: Boolean(autoBackup.enabled),
    consentAcceptedAt: autoBackup.consentAcceptedAt || null,
    consentAcceptedBy: autoBackup.consentAcceptedBy || null,
    frequency: autoBackup.frequency || 'daily',
    format: autoBackup.format || 'json',
    destination: {
      type: autoBackup.destination?.type || 'platform_storage',
    },
    retentionPolicy: {
      keepLast: Math.max(1, Number(autoBackup.retention?.keepLast || 14)),
    },
    lastRunAt: autoBackup.lastRunAt || null,
    lastSuccessAt: autoBackup.lastSuccessAt || null,
    lastFailureAt: autoBackup.lastFailureAt || null,
    lastError: autoBackup.lastError || '',
    lastBackupKey: autoBackup.lastBackupKey || '',
    status: buildAutoBackupStatus(autoBackup),
    storedCount,
    recentBackups,
  };
}


class BackupController {
  /**
   * GET /api/v1/backup/export
   * Export all tenant data as Excel file
   */
  async exportData(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses] = await Promise.all([
        Product.find({ tenant: tenantId }).lean(),
        Customer.find({ tenant: tenantId }).lean(),
        Supplier.find({ tenant: tenantId }).lean(),
        Invoice.find({ tenant: tenantId }).populate('customer', 'name phone').lean(),
        Expense.find({ tenant: tenantId }).lean(),
      ]);

      const workbook = new ExcelJS.Workbook();
      workbook.views = [{ rightToLeft: true }];

      // Products sheet
      const prodWs = workbook.addWorksheet('المنتجات');
      prodWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'الباركود', key: 'barcode', width: 18 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'سعر البيع', key: 'price', width: 12 },
        { header: 'سعر الشراء', key: 'cost', width: 12 },
        { header: 'الكمية', key: 'quantity', width: 10 },
        { header: 'الحد الأدنى', key: 'minQuantity', width: 12 },
        { header: 'الحالة', key: 'stockStatus', width: 12 },
      ];
      products.forEach(p => prodWs.addRow({
        name: p.name, sku: p.sku, barcode: p.barcode, category: p.category,
        price: p.price, cost: p.cost,
        quantity: p.stock?.quantity || 0, minQuantity: p.stock?.minQuantity || 0,
        stockStatus: p.stockStatus,
      }));

      // Customers sheet
      const custWs = workbook.addWorksheet('العملاء');
      custWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'العنوان', key: 'address', width: 25 },
        { header: 'إجمالي المشتريات', key: 'totalPurchases', width: 18 },
        { header: 'المتبقي', key: 'totalRemaining', width: 15 },
        { header: 'نقاط الولاء', key: 'points', width: 12 },
        { header: 'المستوى', key: 'tier', width: 12 },
      ];
      customers.forEach(c => custWs.addRow({
        name: c.name, phone: c.phone, email: c.email, address: c.address,
        totalPurchases: c.financials?.totalPurchases || 0,
        totalRemaining: c.financials?.outstandingBalance || 0,
        points: c.gamification?.points || 0, tier: c.tier || 'normal',
      }));

      // Suppliers sheet
      const suppWs = workbook.addWorksheet('الموردين');
      suppWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'جهة الاتصال', key: 'contactPerson', width: 20 },
        { header: 'الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'شروط الدفع', key: 'paymentTerms', width: 15 },
        { header: 'المشتريات', key: 'totalPurchases', width: 15 },
        { header: 'المستحق', key: 'outstandingBalance', width: 15 },
      ];
      suppliers.forEach(s => suppWs.addRow({
        name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email,
        paymentTerms: s.paymentTerms,
        totalPurchases: s.financials?.totalPurchases || 0,
        outstandingBalance: s.financials?.outstandingBalance || 0,
      }));

      // Invoices sheet
      const invWs = workbook.addWorksheet('الفواتير');
      invWs.columns = [
        { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 20 },
        { header: 'العميل', key: 'customer', width: 25 },
        { header: 'المبلغ', key: 'totalAmount', width: 15 },
        { header: 'المدفوع', key: 'paidAmount', width: 15 },
        { header: 'المتبقي', key: 'remainingAmount', width: 15 },
        { header: 'الحالة', key: 'status', width: 12 },
        { header: 'التاريخ', key: 'createdAt', width: 15 },
      ];
      invoices.forEach(inv => invWs.addRow({
        invoiceNumber: inv.invoiceNumber, customer: inv.customer?.name || '-',
        totalAmount: inv.totalAmount, paidAmount: inv.paidAmount, remainingAmount: inv.remainingAmount,
        status: inv.status, createdAt: inv.createdAt?.toLocaleDateString('ar-EG'),
      }));

      // Expenses sheet
      const expWs = workbook.addWorksheet('المصروفات');
      expWs.columns = [
        { header: 'الوصف', key: 'description', width: 30 },
        { header: 'المبلغ', key: 'amount', width: 15 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'التاريخ', key: 'date', width: 15 },
      ];
      expenses.forEach(e => expWs.addRow({
        description: e.description, amount: e.amount, category: e.category,
        date: e.date?.toLocaleDateString('ar-EG'),
      }));

      // Style all headers
      workbook.worksheets.forEach(ws => {
        ws.getRow(1).eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      const fileName = `PayQusta_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/backup/stats
   * Get data counts for backup preview
   */
  async getStats(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses, branches, roles, users, subscriptionRequests, notifications, auditLogs, tenant, uploadBinaries] = await Promise.all([
        Product.countDocuments({ tenant: tenantId }),
        Customer.countDocuments({ tenant: tenantId }),
        Supplier.countDocuments({ tenant: tenantId }),
        Invoice.countDocuments({ tenant: tenantId }),
        Expense.countDocuments({ tenant: tenantId }),
        Branch.countDocuments({ tenant: tenantId }),
        Role.countDocuments({ tenant: tenantId }),
        User.countDocuments({ tenant: tenantId }),
        SubscriptionRequest.countDocuments({ tenant: tenantId }),
        Notification.countDocuments({ tenant: tenantId }),
        AuditLog.countDocuments({ tenant: tenantId }),
        Tenant.exists({ _id: tenantId }),
        countTenantReferencedUploadBinaries(tenantId),
      ]);

      ApiResponse.success(res, {
        products, customers, suppliers, invoices, expenses, branches, roles, users, subscriptionRequests, notifications, auditLogs, uploadBinaries,
        tenantConfig: tenant ? 1 : 0,
        total: products + customers + suppliers + invoices + expenses + branches + roles + users + subscriptionRequests + notifications + auditLogs + uploadBinaries + (tenant ? 1 : 0),
        lastBackup: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/backup/auto-settings
   * Get automatic backup settings and runtime status
   */
  async getAutoSettings(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.tenantId).select('settings.autoBackup');
      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      const autoBackup = await buildAutoBackupResponse(req.tenantId, tenant.settings?.autoBackup || {});
      ApiResponse.success(res, autoBackup);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/backup/auto-settings
   * Enable / disable automatic tenant backups
   */
  async updateAutoSettings(req, res, next) {
    try {
      const tenant = await Tenant.findById(req.tenantId);
      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      const requestedEnabled = req.body?.enabled !== undefined
        ? Boolean(req.body.enabled)
        : Boolean(tenant.settings?.autoBackup?.enabled);
      const requestedKeepLast = Number(req.body?.retentionPolicy?.keepLast ?? req.body?.keepLast ?? tenant.settings?.autoBackup?.retention?.keepLast ?? 14);
      const keepLast = Math.min(90, Math.max(1, Number.isFinite(requestedKeepLast) ? requestedKeepLast : 14));

      if (!tenant.settings) tenant.settings = {};
      if (!tenant.settings.autoBackup) tenant.settings.autoBackup = {};

      tenant.settings.autoBackup.enabled = requestedEnabled;
      tenant.settings.autoBackup.frequency = 'daily';
      tenant.settings.autoBackup.format = 'json';
      tenant.settings.autoBackup.destination = { type: 'platform_storage' };
      tenant.settings.autoBackup.retention = { keepLast };

      if (requestedEnabled && !tenant.settings.autoBackup.consentAcceptedAt) {
        tenant.settings.autoBackup.consentAcceptedAt = new Date();
        tenant.settings.autoBackup.consentAcceptedBy = req.user?._id || null;
      }

      await tenant.save();

      const autoBackup = await buildAutoBackupResponse(req.tenantId, tenant.settings.autoBackup);
      ApiResponse.success(
        res,
        autoBackup,
        requestedEnabled ? 'تم تفعيل النسخ الاحتياطي التلقائي بنجاح' : 'تم إيقاف النسخ الاحتياطي التلقائي'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backup/restore
   * Restore data from Excel backup file
   */
  async restoreData(req, res, next) {
    const fs = require('fs');
    let session = null;

    try {
      if (!req.file) return next(AppError.badRequest('\u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629'));

      const tenantId = req.tenantId;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);

      const productRows = readWorksheetRows(workbook.getWorksheet(EXCEL_SHEET_NAMES.products));
      const customerRows = readWorksheetRows(workbook.getWorksheet(EXCEL_SHEET_NAMES.customers));
      const supplierRows = readWorksheetRows(workbook.getWorksheet(EXCEL_SHEET_NAMES.suppliers));

      const results = {
        products: { imported: 0, skipped: 0 },
        customers: { imported: 0, skipped: 0 },
        suppliers: { imported: 0, skipped: 0 },
      };
      const restoreWarnings = [
        'excel_restore_is_limited_to_products_customers_suppliers',
        'excel_restore_does_not_cover_invoices_expenses_branches_roles_users_or_tenant_config',
      ];

      session = await startRestoreSession();

      for (const row of productRows) {
        const name = normalizeString(row[EXCEL_HEADERS.name]);
        if (!name) continue;

        const existing = await withOptionalSession(Product.findOne({ tenant: tenantId, name }), session);
        if (existing) {
          results.products.skipped++;
          continue;
        }

        const categoryName = normalizeString(row[EXCEL_HEADERS.category]);
        const minQuantityValue = row[EXCEL_HEADERS.minQuantity];

        await createWithOptionalSession(Product, {
          tenant: tenantId,
          name,
          sku: normalizeString(row.SKU),
          barcode: normalizeString(row[EXCEL_HEADERS.barcode]),
          categoryName: categoryName || undefined,
          price: Math.max(0, normalizeNumber(row[EXCEL_HEADERS.salePrice])),
          cost: Math.max(0, normalizeNumber(row[EXCEL_HEADERS.costPrice])),
          stock: {
            quantity: Math.max(0, normalizeNumber(row[EXCEL_HEADERS.quantity])),
            minQuantity: minQuantityValue === '' || minQuantityValue == null ? 5 : Math.max(0, normalizeNumber(minQuantityValue)),
          },
        }, session);

        results.products.imported++;
      }

      for (const row of customerRows) {
        const name = normalizeString(row[EXCEL_HEADERS.name]);
        const phone = normalizeString(row[EXCEL_HEADERS.phone]);
        if (!name || !phone) continue;

        const existing = await withOptionalSession(Customer.findOne({ tenant: tenantId, phone }), session);
        if (existing) {
          results.customers.skipped++;
          continue;
        }

        const totalPurchases = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.totalPurchases]));
        const outstandingBalance = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.remaining]));
        const points = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.points]));
        const tier = normalizeString(row[EXCEL_HEADERS.tier]);

        await createWithOptionalSession(Customer, {
          tenant: tenantId,
          name,
          phone,
          email: normalizeString(row[EXCEL_HEADERS.email]) || undefined,
          address: normalizeString(row[EXCEL_HEADERS.address]) || undefined,
          financials: {
            totalPurchases,
            totalPaid: Math.max(0, totalPurchases - outstandingBalance),
            outstandingBalance,
          },
          tier: tier || undefined,
          gamification: {
            points,
            totalEarnedPoints: points,
          },
        }, session);

        results.customers.imported++;
      }

      for (const row of supplierRows) {
        const name = normalizeString(row[EXCEL_HEADERS.name]);
        const phone = normalizeString(row[EXCEL_HEADERS.phone]);
        if (!name || !phone) continue;

        const duplicateQuery = buildSupplierDuplicateQuery(tenantId, { name, phone });
        const existing = duplicateQuery
          ? await withOptionalSession(Supplier.findOne(duplicateQuery), session)
          : null;

        if (existing) {
          results.suppliers.skipped++;
          continue;
        }

        const totalPurchases = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.supplierPurchases]));
        const outstandingBalance = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.outstandingBalance]));

        await createWithOptionalSession(Supplier, {
          tenant: tenantId,
          name,
          contactPerson: normalizeString(row[EXCEL_HEADERS.contactPerson]) || undefined,
          phone,
          email: normalizeString(row[EXCEL_HEADERS.email]) || undefined,
          paymentTerms: normalizeString(row[EXCEL_HEADERS.paymentTerms]) || undefined,
          financials: {
            totalPurchases,
            totalPaid: Math.max(0, totalPurchases - outstandingBalance),
            outstandingBalance,
          },
        }, session);

        results.suppliers.imported++;
      }

      if (session) {
        await session.commitTransaction();
        session.endSession();
        session = null;
      }

      const summary = summarizeRestoreResults(results);

      ApiResponse.success(res, {
        ...results,
        totalImported: summary.imported,
        totalSkipped: summary.skipped,
        report: buildRestoreValidationReport({
          format: 'excel',
          results,
          supportedDomains: EXCEL_BACKUP_SUPPORTED_DOMAINS,
          warnings: restoreWarnings,
        }),
      }, '\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 ' + summary.imported + ' \u0633\u062C\u0644 \u0628\u0646\u062C\u0627\u062D (\u062A\u0645 \u062A\u062E\u0637\u064A ' + summary.skipped + ' \u0645\u0643\u0631\u0631)');
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      next(error);
    } finally {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
  }
  /**
   * GET /api/v1/backup/export-json
   * Export all tenant data as JSON file (full backup)
   */
  async exportJSON(req, res, next) {
    try {
      const backup = await buildTenantJsonBackup(req.tenantId);

      const fileName = `PayQusta_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backup/restore-json
   * Restore data from JSON backup file
   */
  async restoreJSON(req, res, next) {
    const fs = require('fs');
    let session = null;

    try {
      if (!req.file) return next(AppError.badRequest('\u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629'));

      const raw = fs.readFileSync(req.file.path, 'utf-8');

      let backup;
      try {
        backup = JSON.parse(raw);
      } catch {
        return next(AppError.badRequest('\u0645\u0644\u0641 JSON \u063A\u064A\u0631 \u0635\u0627\u0644\u062D'));
      }

      if (!backup.data || !backup.appName) {
        return next(AppError.badRequest('\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D - \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0644\u0641 PayQusta'));
      }

      const tenantId = req.tenantId;
      const results = {
        products: { imported: 0, skipped: 0 },
        customers: { imported: 0, skipped: 0 },
        suppliers: { imported: 0, skipped: 0 },
        invoices: { imported: 0, skipped: 0 },
        expenses: { imported: 0, skipped: 0 },
        branches: { imported: 0, skipped: 0 },
        roles: { imported: 0, skipped: 0 },
        users: { imported: 0, skipped: 0 },
        subscriptionRequests: { imported: 0, skipped: 0 },
        notifications: { imported: 0, skipped: 0 },
        auditLogs: { imported: 0, skipped: 0 },
        uploadBinaries: { imported: 0, skipped: 0 },
        tenantConfig: { imported: 0, skipped: 0 },
      };
      const exportedBranches = Array.isArray(backup.data.branches) ? backup.data.branches : [];
      const exportedRoles = Array.isArray(backup.data.roles) ? backup.data.roles : [];
      const exportedUsers = Array.isArray(backup.data.users) ? backup.data.users : [];
      const exportedSubscriptionRequests = Array.isArray(backup.data.subscriptionRequests) ? backup.data.subscriptionRequests : [];
      const exportedNotifications = Array.isArray(backup.data.notifications) ? backup.data.notifications : [];
      const exportedAuditLogs = Array.isArray(backup.data.auditLogs) ? backup.data.auditLogs : [];
      const exportedUploadBinaries = Array.isArray(backup.data.uploadBinaries) ? backup.data.uploadBinaries : [];
      const restoredProductIdsByLegacyId = new Map();
      const restoredCustomerIdsByLegacyId = new Map();
      const restoredSupplierIdsByLegacyId = new Map();
      const restoredInvoiceIdsByLegacyId = new Map();
      const restoredExpenseIdsByLegacyId = new Map();
      const restoredBranchIdsByLegacyId = new Map();
      const restoredRoleIdsByLegacyId = new Map();
      const restoredUserIdsByLegacyId = new Map();
      const restoreWarnings = [];

      session = await startRestoreSession();

      if (backup.data.products?.length) {
        for (const product of backup.data.products) {
          const existing = await withOptionalSession(Product.findOne({ tenant: tenantId, name: product.name }), session);
          if (existing) {
            results.products.skipped++;
            if (product._id) restoredProductIdsByLegacyId.set(String(product._id), existing._id);
            continue;
          }

          await createWithOptionalSession(Product, {
            ...product,
            _id: undefined,
            tenant: tenantId,
          }, session);
          const restoredProduct = await withOptionalSession(Product.findOne({ tenant: tenantId, name: product.name }).select('_id'), session);
          if (product._id && restoredProduct?._id) {
            restoredProductIdsByLegacyId.set(String(product._id), restoredProduct._id);
          }
          results.products.imported++;
        }
      }

      if (backup.data.customers?.length) {
        for (const customer of backup.data.customers) {
          const existing = await withOptionalSession(Customer.findOne({ tenant: tenantId, phone: customer.phone }), session);
          if (existing) {
            results.customers.skipped++;
            if (customer._id) restoredCustomerIdsByLegacyId.set(String(customer._id), existing._id);
            continue;
          }

          await createWithOptionalSession(Customer, {
            ...customer,
            _id: undefined,
            tenant: tenantId,
          }, session);
          const restoredCustomer = await withOptionalSession(Customer.findOne({ tenant: tenantId, phone: customer.phone }).select('_id'), session);
          if (customer._id && restoredCustomer?._id) {
            restoredCustomerIdsByLegacyId.set(String(customer._id), restoredCustomer._id);
          }
          results.customers.imported++;
        }
      }

      if (backup.data.suppliers?.length) {
        for (const supplier of backup.data.suppliers) {
          const duplicateQuery = buildSupplierDuplicateQuery(tenantId, supplier);
          const existing = duplicateQuery
            ? await withOptionalSession(Supplier.findOne(duplicateQuery), session)
            : null;

          if (existing) {
            results.suppliers.skipped++;
            if (supplier._id) restoredSupplierIdsByLegacyId.set(String(supplier._id), existing._id);
            continue;
          }

          await createWithOptionalSession(Supplier, {
            ...supplier,
            _id: undefined,
            tenant: tenantId,
          }, session);
          const restoredSupplier = duplicateQuery
            ? await withOptionalSession(Supplier.findOne(duplicateQuery).select('_id'), session)
            : null;
          if (supplier._id && restoredSupplier?._id) {
            restoredSupplierIdsByLegacyId.set(String(supplier._id), restoredSupplier._id);
          }
          results.suppliers.imported++;
        }
      }

      if (exportedBranches.length) {
        for (const branch of exportedBranches) {
          const existing = await withOptionalSession(Branch.findOne({ tenant: tenantId, name: branch.name }), session);
          if (existing) {
            results.branches.skipped++;
            if (branch._id) restoredBranchIdsByLegacyId.set(String(branch._id), existing._id);
            continue;
          }

          const branchPayload = stripRestoreMeta(branch);
          if (branchPayload.currentShift) {
            branchPayload.currentShift = {
              ...branchPayload.currentShift,
              startedBy: undefined,
              endedBy: undefined,
            };
          }
          if (Array.isArray(branchPayload.settlementHistory)) {
            branchPayload.settlementHistory = branchPayload.settlementHistory.map((entry) => ({
              ...entry,
              settledBy: undefined,
            }));
          }

          await createWithOptionalSession(Branch, {
            ...branchPayload,
            tenant: tenantId,
            manager: undefined,
          }, session);

          const restoredBranch = await withOptionalSession(Branch.findOne({ tenant: tenantId, name: branch.name }).select('_id'), session);
          if (branch._id && restoredBranch?._id) {
            restoredBranchIdsByLegacyId.set(String(branch._id), restoredBranch._id);
          }
          results.branches.imported++;
        }
      }

      if (exportedRoles.length) {
        for (const role of exportedRoles) {
          const existing = await withOptionalSession(Role.findOne({ tenant: tenantId, name: role.name }), session);
          if (existing) {
            results.roles.skipped++;
            if (role._id) restoredRoleIdsByLegacyId.set(String(role._id), existing._id);
            continue;
          }

          await createWithOptionalSession(Role, {
            ...stripRestoreMeta(role),
            tenant: tenantId,
          }, session);

          const restoredRole = await withOptionalSession(Role.findOne({ tenant: tenantId, name: role.name }).select('_id'), session);
          if (role._id && restoredRole?._id) {
            restoredRoleIdsByLegacyId.set(String(role._id), restoredRole._id);
          }
          results.roles.imported++;
        }
      }

      if (exportedUsers.length) {
        for (const user of exportedUsers) {
          const existing = await withOptionalSession(User.findOne({ tenant: tenantId, email: user.email }).select('_id'), session);
          if (existing) {
            results.users.skipped++;
            if (user._id) restoredUserIdsByLegacyId.set(String(user._id), existing._id);
            continue;
          }

          if (!normalizeString(user.passwordHash)) {
            results.users.skipped++;
            restoreWarnings.push('user_skipped_missing_password_hash');
            continue;
          }

          const branchId = user.branch ? restoredBranchIdsByLegacyId.get(String(user.branch)) || null : null;
          const customRoleId = user.customRole ? restoredRoleIdsByLegacyId.get(String(user.customRole)) || null : null;
          const userPayload = stripRestoreMeta(user);
          delete userPayload.passwordHash;

          await insertRawWithOptionalSession(User, {
            ...userPayload,
            password: user.passwordHash,
            tenant: tenantId,
            branch: branchId,
            customRole: customRoleId,
            isSuperAdmin: false,
            twoFactorEnabled: false,
            sessionVersion: 0,
          }, session);

          const restoredUser = await withOptionalSession(User.findOne({ tenant: tenantId, email: user.email }).select('_id'), session);
          if (user._id && restoredUser?._id) {
            restoredUserIdsByLegacyId.set(String(user._id), restoredUser._id);
          }
          results.users.imported++;
        }
      }

      if (exportedSubscriptionRequests.length) {
        for (const request of exportedSubscriptionRequests) {
          let planId = null;

          if (request.plan && mongoose.isValidObjectId(String(request.plan))) {
            const existingPlan = await withOptionalSession(Plan.findById(request.plan).select('_id'), session);
            if (existingPlan?._id) planId = existingPlan._id;
          }

          if (!planId && request.planSnapshot?.name) {
            const existingPlan = await withOptionalSession(Plan.findOne({ name: request.planSnapshot.name }).select('_id'), session);
            if (existingPlan?._id) planId = existingPlan._id;
          }

          if (!planId) {
            results.subscriptionRequests.skipped++;
            restoreWarnings.push('subscription_request_skipped_missing_plan');
            continue;
          }

          const duplicateQuery = buildSubscriptionRequestDuplicateQuery(tenantId, request, planId);
          const existing = await withOptionalSession(SubscriptionRequest.findOne(duplicateQuery).select('_id'), session);
          if (existing) {
            results.subscriptionRequests.skipped++;
            continue;
          }

          await createWithOptionalSession(SubscriptionRequest, {
            ...stripRestoreMeta(request),
            tenant: tenantId,
            plan: planId,
            approvedBy: request.approvedBy ? resolveMappedId(request.approvedBy, restoredUserIdsByLegacyId) || undefined : undefined,
            planSnapshot: undefined,
          }, session);
          results.subscriptionRequests.imported++;
        }
      }

      if (backup.data.invoices?.length) {
        for (const invoice of backup.data.invoices) {
          const existing = await withOptionalSession(Invoice.findOne({ tenant: tenantId, invoiceNumber: invoice.invoiceNumber }), session);
          if (existing) {
            results.invoices.skipped++;
            if (invoice._id) restoredInvoiceIdsByLegacyId.set(String(invoice._id), existing._id);
            continue;
          }

          let customerId = null;
          if (invoice.customer?.name) {
            const customer = await withOptionalSession(Customer.findOne({ tenant: tenantId, name: invoice.customer.name }), session);
            if (customer) customerId = customer._id;
          }

          await createWithOptionalSession(Invoice, {
            ...invoice,
            _id: undefined,
            tenant: tenantId,
            customer: customerId || invoice.customer?._id || invoice.customer,
          }, session);
          const restoredInvoice = await withOptionalSession(Invoice.findOne({ tenant: tenantId, invoiceNumber: invoice.invoiceNumber }).select('_id'), session);
          if (invoice._id && restoredInvoice?._id) {
            restoredInvoiceIdsByLegacyId.set(String(invoice._id), restoredInvoice._id);
          }
          results.invoices.imported++;
        }
      }

      if (backup.data.expenses?.length) {
        for (const expense of backup.data.expenses) {
          const existing = await withOptionalSession(Expense.findOne({
            tenant: tenantId,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
          }), session);

          if (existing) {
            results.expenses.skipped++;
            if (expense._id) restoredExpenseIdsByLegacyId.set(String(expense._id), existing._id);
            continue;
          }

          await createWithOptionalSession(Expense, {
            ...expense,
            _id: undefined,
            tenant: tenantId,
          }, session);
          const restoredExpense = await withOptionalSession(Expense.findOne({
            tenant: tenantId,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
          }).select('_id'), session);
          if (expense._id && restoredExpense?._id) {
            restoredExpenseIdsByLegacyId.set(String(expense._id), restoredExpense._id);
          }
          results.expenses.imported++;
        }
      }

      if (exportedNotifications.length) {
        for (const notification of exportedNotifications) {
          const recipientId = resolveMappedId(notification.recipient, restoredUserIdsByLegacyId);
          const customerRecipientId = resolveMappedId(notification.customerRecipient, restoredCustomerIdsByLegacyId);
          let relatedId = null;

          switch (notification.relatedModel) {
            case 'Invoice':
              relatedId = resolveMappedId(notification.relatedId, restoredInvoiceIdsByLegacyId);
              break;
            case 'Product':
              relatedId = resolveMappedId(notification.relatedId, restoredProductIdsByLegacyId);
              break;
            case 'Customer':
              relatedId = resolveMappedId(notification.relatedId, restoredCustomerIdsByLegacyId);
              break;
            case 'Supplier':
              relatedId = resolveMappedId(notification.relatedId, restoredSupplierIdsByLegacyId);
              break;
            default:
              relatedId = notification.relatedId || undefined;
          }

          const duplicateQuery = buildNotificationDuplicateQuery(
            tenantId,
            notification,
            recipientId,
            customerRecipientId
          );
          if (relatedId) duplicateQuery.relatedId = relatedId;

          const existing = await withOptionalSession(Notification.findOne(duplicateQuery), session);
          if (existing) {
            results.notifications.skipped++;
            continue;
          }

          await createWithOptionalSession(Notification, {
            ...stripRestoreMeta(notification),
            tenant: tenantId,
            recipient: recipientId || undefined,
            customerRecipient: customerRecipientId || undefined,
            relatedId: relatedId || undefined,
          }, session);
          results.notifications.imported++;
        }
      }

      if (exportedAuditLogs.length) {
        for (const auditLog of exportedAuditLogs) {
          const userId = resolveMappedId(auditLog.user, restoredUserIdsByLegacyId);
          const branchId = resolveMappedId(auditLog.branch, restoredBranchIdsByLegacyId);
          let resourceId = null;
          const resourceKey = normalizeString(auditLog.resource).toLowerCase();

          if (!userId) {
            results.auditLogs.skipped++;
            restoreWarnings.push('audit_log_skipped_missing_user_mapping');
            continue;
          }

          switch (resourceKey) {
            case 'product':
            case 'products':
              resourceId = resolveMappedId(auditLog.resourceId, restoredProductIdsByLegacyId);
              break;
            case 'customer':
            case 'customers':
              resourceId = resolveMappedId(auditLog.resourceId, restoredCustomerIdsByLegacyId);
              break;
            case 'supplier':
            case 'suppliers':
              resourceId = resolveMappedId(auditLog.resourceId, restoredSupplierIdsByLegacyId);
              break;
            case 'invoice':
            case 'invoices':
              resourceId = resolveMappedId(auditLog.resourceId, restoredInvoiceIdsByLegacyId);
              break;
            case 'expense':
            case 'expenses':
              resourceId = resolveMappedId(auditLog.resourceId, restoredExpenseIdsByLegacyId);
              break;
            case 'branch':
            case 'branches':
              resourceId = resolveMappedId(auditLog.resourceId, restoredBranchIdsByLegacyId);
              break;
            case 'user':
            case 'users':
              resourceId = resolveMappedId(auditLog.resourceId, restoredUserIdsByLegacyId);
              break;
            case 'role':
            case 'roles':
              resourceId = resolveMappedId(auditLog.resourceId, restoredRoleIdsByLegacyId);
              break;
            default:
              resourceId = auditLog.resourceId || undefined;
          }

          const duplicateQuery = buildAuditLogDuplicateQuery(tenantId, auditLog, userId);
          if (resourceId) duplicateQuery.resourceId = resourceId;

          const existing = await withOptionalSession(AuditLog.findOne(duplicateQuery), session);
          if (existing) {
            results.auditLogs.skipped++;
            continue;
          }

          await createWithOptionalSession(AuditLog, {
            ...stripRestoreMeta(auditLog),
            tenant: tenantId,
            user: userId || undefined,
            branch: branchId || undefined,
            resourceId: resourceId || undefined,
          }, session);
          results.auditLogs.imported++;
        }
      }

      if (exportedUploadBinaries.length) {
        for (const uploadBinary of exportedUploadBinaries) {
          const uploadKey = normalizeString(uploadBinary.key);
          const encodedData = normalizeString(uploadBinary.data);

          if (!uploadKey || !encodedData) {
            results.uploadBinaries.skipped++;
            restoreWarnings.push('upload_binary_skipped_invalid_payload');
            continue;
          }

          const existing = await withOptionalSession(StoredUpload.findOne({ key: uploadKey }).select('_id'), session);
          if (existing) {
            results.uploadBinaries.skipped++;
            continue;
          }

          let buffer;
          try {
            buffer = Buffer.from(encodedData, uploadBinary.encoding || 'base64');
          } catch {
            results.uploadBinaries.skipped++;
            restoreWarnings.push('upload_binary_skipped_invalid_payload');
            continue;
          }

          if (!buffer.length) {
            results.uploadBinaries.skipped++;
            restoreWarnings.push('upload_binary_skipped_invalid_payload');
            continue;
          }

          await createWithOptionalSession(StoredUpload, {
            key: uploadKey,
            folder: normalizeString(uploadBinary.folder),
            filename: normalizeString(uploadBinary.filename) || uploadKey.split('/').pop() || uploadKey,
            contentType: normalizeString(uploadBinary.contentType) || 'application/octet-stream',
            size: Math.max(0, Number(uploadBinary.size || buffer.length || 0)),
            data: buffer,
          }, session);
          results.uploadBinaries.imported++;
        }
      }

      if (exportedBranches.length && restoredUserIdsByLegacyId.size > 0) {
        for (const branch of exportedBranches) {
          const restoredBranchId = branch._id ? restoredBranchIdsByLegacyId.get(String(branch._id)) : null;
          if (!restoredBranchId) continue;

          const managerId = branch.manager ? restoredUserIdsByLegacyId.get(String(branch.manager)) || undefined : undefined;
          const currentShift = branch.currentShift
            ? {
              ...branch.currentShift,
              startedBy: branch.currentShift.startedBy ? restoredUserIdsByLegacyId.get(String(branch.currentShift.startedBy)) || undefined : undefined,
              endedBy: branch.currentShift.endedBy ? restoredUserIdsByLegacyId.get(String(branch.currentShift.endedBy)) || undefined : undefined,
            }
            : undefined;

          const settlementHistory = Array.isArray(branch.settlementHistory)
            ? branch.settlementHistory.map((entry) => ({
              ...entry,
              settledBy: entry.settledBy ? restoredUserIdsByLegacyId.get(String(entry.settledBy)) || undefined : undefined,
            }))
            : undefined;

          const branchRefUpdate = {
            ...(managerId ? { manager: managerId } : {}),
            ...(currentShift ? { currentShift } : {}),
            ...(settlementHistory ? { settlementHistory } : {}),
          };

          if (Object.keys(branchRefUpdate).length > 0) {
            await withOptionalSession(Branch.updateOne(
              { _id: restoredBranchId, tenant: tenantId },
              { $set: branchRefUpdate }
            ), session);
          }
        }
      }

      if (!backup.data.tenantSnapshot) {
        restoreWarnings.push('tenant_snapshot_missing_from_backup');
      }

      if (backup.data.tenantSnapshot) {
        const tenant = await withOptionalSession(Tenant.findById(tenantId), session);
        if (tenant) {
          const tenantSnapshot = buildTenantSnapshotUpdate(backup.data.tenantSnapshot);
          tenant.name = tenantSnapshot.name || tenant.name;
          tenant.slug = tenantSnapshot.slug || tenant.slug;
          tenant.customDomain = tenantSnapshot.customDomain || undefined;
          tenant.customDomainStatus = tenantSnapshot.customDomainStatus || tenant.customDomainStatus;
          tenant.customDomainLastCheckedAt = tenantSnapshot.customDomainLastCheckedAt || null;
          tenant.branding = tenantSnapshot.branding;
          tenant.businessInfo = tenantSnapshot.businessInfo;
          tenant.settings = tenantSnapshot.settings;
          tenant.whatsapp = tenantSnapshot.whatsapp;
          tenant.subscription = tenantSnapshot.subscription;
          tenant.dashboardWidgets = tenantSnapshot.dashboardWidgets;
          tenant.cameras = tenantSnapshot.cameras;
          tenant.addons = tenantSnapshot.addons;
          tenant.isActive = tenantSnapshot.isActive;

          await tenant.save(session ? { session } : undefined);
          results.tenantConfig.imported++;
        } else {
          results.tenantConfig.skipped++;
        }
      }

      if (session) {
        await session.commitTransaction();
        session.endSession();
        session = null;
      }

      const summary = summarizeRestoreResults(results);

      ApiResponse.success(res, {
        ...results,
        totalImported: summary.imported,
        totalSkipped: summary.skipped,
        report: buildRestoreValidationReport({
          format: 'json',
          backup,
          results,
          supportedDomains: JSON_BACKUP_SUPPORTED_DOMAINS,
          warnings: Array.from(new Set(restoreWarnings)),
        }),
      }, '\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 ' + summary.imported + ' \u0633\u062C\u0644 \u0628\u0646\u062C\u0627\u062D (\u062A\u0645 \u062A\u062E\u0637\u064A ' + summary.skipped + ' \u0645\u0643\u0631\u0631)');
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      next(error);
    } finally {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
  }
}


module.exports = new BackupController();
