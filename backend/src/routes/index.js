/**
 * API Routes — Central Router
 */

const router = require('express').Router();
const checkLimit = require('../middleware/checkLimit');
const { protect, protectOps, authorize, tenantScope, publicTenantScope, auditLog } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const notificationController = require('../controllers/notificationController');
const expenseController = require('../controllers/expenseController');
const settingsController = require('../controllers/settingsController');
const adminController = require('../controllers/adminController');
const tenantController = require('../controllers/tenantController');
const supplierController = require('../controllers/supplierController');
const supplierPurchaseInvoiceController = require('../controllers/supplierPurchaseInvoiceController');
const productController = require('../controllers/productController');
const customerController = require('../controllers/customerController');
const invoiceController = require('../controllers/invoiceController');
const paymentController = require('../controllers/paymentController');
const couponController = require('../controllers/couponController');
const addonController = require('../controllers/addonController');
const referralController = require('../controllers/referralController');
const affiliateController = require('../controllers/affiliateController');
const purchaseReturnController = require('../controllers/purchaseReturnController');
const ownerMgmt = require('../controllers/ownerManagementController');
const roleController = require('../controllers/roleController');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const revenueAnalyticsController = require('../controllers/revenueAnalyticsController');
const planController = require('../controllers/planController');
const reviewController = require('../controllers/reviewController');
const opsController = require('../controllers/opsController');
const { uploadSingle, uploadAvatar, upload } = require('../middleware/upload');
const { uploadLimiter, webhookLimiter } = require('../middleware/security');
const { isAllowedImportFile, isAllowedJsonFile } = require('../utils/fileValidation');
const AppError = require('../utils/AppError');
const { authValidations, supplierValidations } = require('../middleware/validation');

// ============ APP INFO ============
router.get('/health', (req, res) => opsController.getPublicHealth(req, res));
router.get('/health/live', (req, res) => opsController.getLiveness(req, res));
router.get('/health/ready', (req, res) => opsController.getReadiness(req, res));
router.post('/shipping/webhooks/bosta', webhookLimiter, invoiceController.handleBostaWebhook);
router.get('/payments/public/:id', paymentController.getPublicTransaction);
router.post('/payments/webhook/paymob', webhookLimiter, paymentController.paymobWebhook);
router.post('/payments/webhook/fawry', webhookLimiter, paymentController.fawryWebhook);
router.post('/payments/webhook/vodafone', webhookLimiter, paymentController.vodafoneWebhook);
router.post('/payments/webhook/instapay', webhookLimiter, paymentController.instapayWebhook);

// ============ PORTAL ROUTES (Customer App) ============
router.use('/portal', require('./portal/authRoutes'));

// ============ AUTH ROUTES (Public) ============
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authValidations.forgotPassword, authController.forgotPassword);
router.post('/auth/reset-password/:token', authValidations.resetPassword, authController.resetPassword);
router.get('/auth/activate-account/:token', authController.getActivationDetails);
router.post('/auth/activate-account/:token', authController.activateAccount);
router.post('/auth/logout', protect, authController.logout);
router.post('/auth/logout-all', protect, authController.logoutAll);

const { requireFeature } = require('../middleware/requireFeature');
const reportsController = require('../controllers/reportsController');
const searchController = require('../controllers/searchController');
const importController = require('../controllers/importController');
const backupController = require('../controllers/backupController');
const publicLeadController = require('../controllers/publicLeadController');

router.get('/storefront/settings', settingsController.getStorefrontSettings);
router.get('/settings', publicTenantScope, settingsController.getSettings);
router.use('/plans', require('./planRoutes'));
router.post('/public/leads', publicLeadController.createLead);

// Product Public Routes
router.get('/products', publicTenantScope, productController.getAll);
router.get('/products/categories', publicTenantScope, productController.getCategories);
router.get('/products/barcode/:code', publicTenantScope, productController.getByBarcode);
router.get('/products/:id([0-9a-fA-F]{24})', publicTenantScope, productController.getById);
router.post('/products/:id([0-9a-fA-F]{24})/notify-stock', publicTenantScope, productController.subscribeStockNotification);

// Public Checkout Routes
router.get('/customers', (req, res, next) => {
  if (req.headers['x-source'] === 'online_store') return next();
  protect(req, res, next);
}, publicTenantScope, customerController.getAll);

router.post('/customers', (req, res, next) => {
  if (req.headers['x-source'] === 'online_store') return next();
  protect(req, res, next);
}, publicTenantScope, customerController.create);

router.get('/orders/track', publicTenantScope, invoiceController.trackPublicOrder);
router.get('/orders/:id([0-9a-fA-F]{24})/confirmation', publicTenantScope, invoiceController.getPublicOrderConfirmation);

router.post('/invoices', (req, res, next) => {
  if (req.body.source === 'online_store') return next();
  protect(req, res, next);
}, publicTenantScope, invoiceController.create);
router.post('/coupons/validate', publicTenantScope, couponController.validate);
router.post('/storefront/payments/create-link', publicTenantScope, paymentController.createStorefrontLink);

// ============ SUPER ADMIN ROUTES ============
router.use('/super-admin', protect, require('./superAdminRoutes'));

router.get('/ops/status', protectOps, authorize('vendor', 'admin'), (req, res) => opsController.getOpsStatus(req, res));
router.get('/ops/metrics', protectOps, authorize('vendor', 'admin'), (req, res) => opsController.getOpsMetrics(req, res));
// ============ PROTECTED ROUTES ============
router.use(protect); // All routes below require authentication
router.use(tenantScope); // All routes below are tenant-scoped

// --- Auth ---
router.get('/auth/me', authController.getMe);
router.put('/auth/update-password', authController.updatePassword);
router.put('/auth/update-profile', authController.updateProfile);
router.put('/auth/update-avatar', uploadLimiter, uploadAvatar, authController.updateAvatar);
router.delete('/auth/remove-avatar', authController.removeAvatar);
router.get('/auth/users', authorize('vendor', 'admin'), checkPermission('users', 'read'), authController.getTenantUsers);
router.post('/auth/users', authorize('vendor', 'admin'), checkPermission('users', 'create'), checkLimit('user'), auditLog('create', 'user'), authController.addUser);
router.post('/auth/users/:id/resend-invitation', authorize('vendor', 'admin'), checkPermission('users', 'create'), authController.resendTenantUserInvitation);
router.put('/auth/users/:id', authorize('vendor', 'admin'), checkPermission('users', 'update'), auditLog('update', 'user'), authController.updateTenantUser);
router.delete('/auth/users/:id', authorize('vendor', 'admin'), checkPermission('users', 'delete'), auditLog('delete', 'user'), authController.deleteTenantUser);
router.post('/auth/add-user', authorize('vendor', 'admin'), checkPermission('users', 'create'), checkLimit('user'), auditLog('create', 'user'), authController.addUser);
router.post('/auth/switch-tenant', tenantController.switchTenant);
router.post('/auth/create-store', authorize('vendor', 'admin'), tenantController.createMyTenant);

// --- Tenant / Branches ---
// Note: /tenants/branch removed - use /branches instead (branchController is more complete)
router.use('/branches', require('./branchRoutes'));

// --- Dashboard ---
router.get('/dashboard/overview', authorize('vendor', 'admin', 'coordinator'), dashboardController.getOverview);
router.get('/dashboard/sales-report', authorize('vendor', 'admin', 'coordinator'), dashboardController.getSalesReport);
router.get('/dashboard/profit-intelligence', authorize('vendor', 'admin'), dashboardController.getProfitIntelligence);
router.get('/dashboard/risk-scoring', authorize('vendor', 'admin'), dashboardController.getRiskScoring);
router.get('/dashboard/daily-collections', authorize('vendor', 'admin', 'coordinator'), dashboardController.getDailyCollections);
router.get('/dashboard/aging-report', authorize('vendor', 'admin', 'coordinator'), dashboardController.getAgingReport);
router.get('/dashboard/supplier-aging-report', authorize('vendor', 'admin', 'coordinator'), dashboardController.getSupplierAgingReport);
router.get('/dashboard/business-health', authorize('vendor', 'admin'), dashboardController.getBusinessHealth);
router.get('/dashboard/cash-flow-forecast', authorize('vendor', 'admin'), dashboardController.getCashFlowForecast);
router.get('/dashboard/smart-assistant', authorize('vendor', 'admin'), dashboardController.getSmartAssistant);
router.get('/dashboard/real-profit', authorize('vendor', 'admin'), dashboardController.getRealProfit);
router.get('/dashboard/credit-engine', authorize('vendor', 'admin'), dashboardController.getCreditEngine);
router.get('/dashboard/customer-lifetime-value', authorize('vendor', 'admin'), dashboardController.getCustomerLifetimeValue);

// ============ MODULAR ROUTES ============
router.use('/products', require('./productRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/customers', require('./customerRoutes'));
router.use('/invoices', require('./invoiceRoutes'));
router.use('/bi', require('./biRoutes'));

// --- Suppliers --- (coordinator can view)
router.get('/suppliers', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'read'), supplierController.getAll);
router.get('/suppliers/upcoming-payments', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'read'), supplierController.getUpcomingPayments);
router.get('/suppliers/:id', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'read'), supplierController.getById);
router.get('/suppliers/:id/statement', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'read'), supplierController.getStatement);
router.get('/suppliers/:id/low-stock-products', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'read'), supplierController.getLowStockProducts);
router.post('/suppliers', authorize('vendor', 'admin'), checkPermission('suppliers', 'create'), supplierValidations.create, auditLog('create', 'supplier'), supplierController.create);
router.put('/suppliers/:id', authorize('vendor', 'admin'), checkPermission('suppliers', 'update'), auditLog('update', 'supplier'), supplierController.update);
router.delete('/suppliers/:id', authorize('vendor', 'admin'), checkPermission('suppliers', 'delete'), auditLog('delete', 'supplier'), supplierController.delete);
router.post('/suppliers/:id/purchase', authorize('vendor', 'admin'), checkPermission('suppliers', 'update'), auditLog('payment', 'supplier'), supplierController.recordPurchase);
router.post('/suppliers/:id/payments/:paymentId/pay', authorize('vendor', 'admin'), checkPermission('suppliers', 'update'), auditLog('payment', 'supplier'), supplierController.recordPayment);
router.post('/suppliers/:id/pay-all', authorize('vendor', 'admin'), checkPermission('suppliers', 'update'), auditLog('payment', 'supplier'), supplierController.payAllOutstanding);
router.post('/suppliers/:id/send-reminder', authorize('vendor', 'admin'), checkPermission('suppliers', 'read'), supplierController.sendReminder);
router.post('/suppliers/:id/request-restock', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'update'), supplierController.requestRestock);

// --- Purchase Returns ---
router.get('/purchase-returns', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'read'), purchaseReturnController.getAll);
router.get('/purchase-returns/:id', authorize('vendor', 'admin', 'coordinator'), checkPermission('suppliers', 'read'), purchaseReturnController.getById);
router.post('/purchase-returns', authorize('vendor', 'admin'), checkPermission('suppliers', 'update'), purchaseReturnController.create);

// --- Supplier Purchase Invoices ---
router.get(
  '/supplier-purchase-invoices/upcoming-installments',
  authorize('vendor', 'admin', 'coordinator'),
  checkPermission('suppliers', 'read'),
  supplierPurchaseInvoiceController.getUpcomingInstallments
);
router.post(
  '/supplier-purchase-invoices/sync-from-purchase-orders',
  authorize('vendor', 'admin'),
  checkPermission('suppliers', 'update'),
  auditLog('sync', 'supplier_purchase_invoice'),
  supplierPurchaseInvoiceController.syncFromPurchaseOrders
);
router.get(
  '/supplier-purchase-invoices',
  authorize('vendor', 'admin', 'coordinator'),
  checkPermission('suppliers', 'read'),
  supplierPurchaseInvoiceController.getAll
);
router.get(
  '/supplier-purchase-invoices/:id',
  authorize('vendor', 'admin', 'coordinator'),
  checkPermission('suppliers', 'read'),
  supplierPurchaseInvoiceController.getById
);
router.post(
  '/supplier-purchase-invoices/:id/pay',
  authorize('vendor', 'admin'),
  checkPermission('suppliers', 'update'),
  auditLog('payment', 'supplier_purchase_invoice'),
  supplierPurchaseInvoiceController.pay
);

// --- Notifications ---
router.get('/notifications', notificationController.getAll);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.get('/notifications/stream', notificationController.stream);
router.patch('/notifications/read-all', notificationController.markAllAsRead);
router.patch('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications/:id', notificationController.deleteOne);

// --- Stock Adjustments ---
router.use('/stock-adjustments', require('./stockAdjustmentRoutes'));

// --- Cash Shifts ---
router.use('/cash-shifts', require('./cashShiftRoutes'));

// --- Expenses ---
router.get('/expenses', authorize('vendor', 'admin', 'coordinator'), checkPermission('expenses', 'read'), expenseController.getAll);
router.get('/expenses/summary', authorize('vendor', 'admin', 'coordinator'), checkPermission('expenses', 'read'), expenseController.getSummary);
router.get('/expenses/categories', authorize('vendor', 'admin', 'coordinator'), checkPermission('expenses', 'read'), expenseController.getCategories);
router.post('/expenses', authorize('vendor', 'admin'), checkPermission('expenses', 'create'), auditLog('create', 'expense'), expenseController.create);
router.put('/expenses/:id', authorize('vendor', 'admin'), checkPermission('expenses', 'update'), auditLog('update', 'expense'), expenseController.update);
router.delete('/expenses/:id', authorize('vendor', 'admin'), checkPermission('expenses', 'delete'), auditLog('delete', 'expense'), expenseController.delete);

// --- Settings ---
router.put('/settings/store', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.updateStore);
router.put('/settings/whatsapp', authorize('admin'), requireFeature('whatsapp_notifications'), settingsController.updateWhatsApp);
router.post('/settings/whatsapp/test', authorize('admin'), requireFeature('whatsapp_notifications'), settingsController.testWhatsApp);
router.post('/settings/whatsapp/topup', authorize('admin'), requireFeature('whatsapp_notifications'), settingsController.topupWhatsApp);
router.get('/settings/whatsapp/templates', authorize('admin'), requireFeature('whatsapp_notifications'), settingsController.checkWhatsAppTemplates);
router.post('/settings/whatsapp/create-templates', authorize('admin'), requireFeature('whatsapp_notifications'), settingsController.createWhatsAppTemplates);
router.post('/settings/whatsapp/detect-templates', authorize('admin'), requireFeature('whatsapp_notifications'), settingsController.detectTemplates);
router.post('/settings/whatsapp/apply-templates', authorize('admin'), requireFeature('whatsapp_notifications'), settingsController.applyTemplateMapping);
router.put('/settings/branding', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.updateBranding);
router.get('/settings/notification-channels', authorize('vendor', 'admin'), checkPermission('settings', 'read'), settingsController.getNotificationChannelsStatus);
router.put('/settings/notification-channels', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.updateNotificationChannels);
router.post('/settings/notification-channels/test-email', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.testNotificationEmail);
router.post('/settings/notification-channels/test-sms', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.testNotificationSms);
router.post('/settings/logo', authorize('vendor', 'admin'), checkPermission('settings', 'update'), uploadLimiter, upload.single('logo'), settingsController.uploadLogo);
router.get('/settings/subdomain-availability', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.checkSubdomainAvailability);
router.put('/settings/subdomain', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.updateSubdomain);
router.put('/settings/user', settingsController.updateUser);
router.put('/settings/password', settingsController.changePassword);
router.put('/settings/installments', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.updateInstallments);
router.put('/settings/categories', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.updateCategories);
router.get('/settings/cameras/proxy', settingsController.proxyCamera);
router.delete('/settings/categories/:name', authorize('vendor', 'admin'), checkPermission('settings', 'delete'), settingsController.deleteCategory);
router.post('/settings/watermark/apply-to-all', authorize('vendor', 'admin'), checkPermission('settings', 'update'), settingsController.applyWatermarkToAll);

// --- Subscriptions & Billing ---
router.use('/subscriptions', require('./subscriptionRoutes'));

// --- Addons Marketplace ---
router.get('/addons', authorize('vendor', 'admin'), addonController.getAllAddons);
router.post('/addons/:key/purchase', authorize('vendor', 'admin'), addonController.purchaseAddon);

// --- Referral Program ---
router.get('/referrals/my-code', authorize('vendor', 'admin'), referralController.getMyCode);
router.get('/referrals/stats', authorize('vendor', 'admin'), referralController.getStats);
router.post('/referrals/apply', referralController.applyCode);

// --- Affiliate Program ---
router.get('/affiliates', authorize('vendor', 'admin'), affiliateController.getAll);
router.get('/affiliates/stats', authorize('vendor', 'admin'), affiliateController.getStats);
router.get('/affiliates/:id', authorize('vendor', 'admin'), affiliateController.getById);
router.get('/affiliates/:id/conversions', authorize('vendor', 'admin'), affiliateController.getConversions);
router.get('/affiliates/:id/link', authorize('vendor', 'admin'), affiliateController.getLink);
router.post('/affiliates', authorize('vendor', 'admin'), auditLog('create', 'affiliate'), affiliateController.create);
router.put('/affiliates/:id', authorize('vendor', 'admin'), auditLog('update', 'affiliate'), affiliateController.update);
router.patch('/affiliates/:id/status', authorize('vendor', 'admin'), auditLog('update', 'affiliate'), affiliateController.updateStatus);

// --- Owner Management (Returns, KYC, Support) ---
router.get('/manage/returns', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getReturns);
router.patch('/manage/returns/:id', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.updateReturn);
router.get('/manage/documents', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getDocuments);
router.patch('/manage/documents/:customerId/:docId', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.reviewDocument);
router.get('/manage/support', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getSupportMessages);
router.get('/manage/support/:id', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.getSupportMessage);
router.post('/manage/support/:id/reply', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.replySupportMessage);
router.patch('/manage/support/:id/close', authorize('vendor', 'admin', 'coordinator'), ownerMgmt.closeSupportMessage);

// --- Roles & Permissions ---
router.get('/roles', authorize('vendor', 'admin'), roleController.getAll);
router.get('/roles/:id', authorize('vendor', 'admin'), roleController.getById);
router.post('/roles', authorize('vendor', 'admin'), roleController.create);
router.put('/roles/:id', authorize('vendor', 'admin'), roleController.update);
router.delete('/roles/:id', authorize('vendor', 'admin'), roleController.delete);

// --- Purchase Orders ---
router.get('/purchase-orders', authorize('vendor', 'admin'), checkPermission('purchase_orders', 'read'), purchaseOrderController.getAll);
router.get('/purchase-orders/:id', authorize('vendor', 'admin'), checkPermission('purchase_orders', 'read'), purchaseOrderController.getById);
router.get('/purchase-orders/:id/pdf', authorize('vendor', 'admin'), checkPermission('purchase_orders', 'read'), purchaseOrderController.generatePDF);
router.post('/purchase-orders', authorize('vendor', 'admin'), checkPermission('purchase_orders', 'create'), purchaseOrderController.create);
router.put('/purchase-orders/:id', authorize('vendor', 'admin'), checkPermission('purchase_orders', 'update'), purchaseOrderController.update);
router.post('/purchase-orders/:id/receive', authorize('vendor', 'admin'), checkPermission('purchase_orders', 'update'), purchaseOrderController.receive);
router.delete('/purchase-orders/:id', authorize('vendor', 'admin'), checkPermission('purchase_orders', 'delete'), purchaseOrderController.delete);

// --- Payment Gateway ---
router.use('/payments', require('./paymentRoutes'));

// --- Field Collection ---
router.use('/collection', require('./collectionRoutes'));

// ============ ADMIN ROUTES (Super Admin Only) ============
router.get('/admin/dashboard', authorize('admin'), adminController.getDashboard);
router.get('/admin/statistics', authorize('admin'), adminController.getStatistics);

// Revenue Analytics
router.get('/admin/analytics/revenue', authorize('admin'), revenueAnalyticsController.getRevenueAnalytics);

// Tenant Management
router.get('/admin/tenants', authorize('admin'), adminController.getTenants);
router.post('/admin/tenants', authorize('admin'), auditLog('create', 'tenant'), adminController.createTenant);
router.put('/admin/tenants/:id', authorize('admin'), auditLog('update', 'tenant'), adminController.updateTenant);
router.delete('/admin/tenants/:id', authorize('admin'), auditLog('delete', 'tenant'), adminController.deleteTenant);
router.post('/admin/tenants/:id/reset-password', authorize('admin'), adminController.resetTenantPassword);

// Plans Management (Super Admin)
router.post('/admin/plans', authorize('admin'), planController.createPlan);
router.put('/admin/plans/:id', authorize('admin'), planController.updatePlan);
router.delete('/admin/plans/:id', authorize('admin'), planController.deletePlan);

// User Management
router.get('/admin/users', authorize('admin'), adminController.getUsers);
router.post('/admin/users', authorize('admin'), auditLog('create', 'user'), adminController.createUser);
router.post('/admin/users/:id/resend-invitation', authorize('admin'), auditLog('update', 'user'), adminController.resendUserInvitation);
router.put('/admin/users/:id', authorize('admin'), auditLog('update', 'user'), adminController.updateUser);
router.delete('/admin/users/:id', authorize('admin'), auditLog('delete', 'user'), adminController.deleteUser);

// Audit Logs
router.get('/admin/audit-logs', authorize('admin'), adminController.getAuditLogs);
router.use('/audit-logs', require('./auditLogRoutes'));

// ============ REPORTS ROUTES ============
router.get('/reports/sales', authorize('vendor', 'admin', 'coordinator'), reportsController.getSalesReport);
router.get('/reports/profit', authorize('vendor', 'admin'), reportsController.getProfitReport);
router.get('/reports/inventory', authorize('vendor', 'admin', 'coordinator'), reportsController.getInventoryReport);
router.get('/reports/customers', authorize('vendor', 'admin', 'coordinator'), reportsController.getCustomerReport);
router.get('/reports/products', authorize('vendor', 'admin', 'coordinator'), reportsController.getProductPerformanceReport);
router.get('/reports/ledger', authorize('vendor', 'admin'), reportsController.getGeneralLedger);
router.get('/reports/pnl', authorize('vendor', 'admin'), reportsController.getProfitAndLoss);
router.get('/reports/cash-flow-forecast', authorize('vendor', 'admin'), reportsController.getCashFlowForecast);

// Export Reports
router.get('/reports/export/sales', authorize('vendor', 'admin', 'coordinator'), reportsController.exportSalesReport);
router.get('/reports/export/profit', authorize('vendor', 'admin'), reportsController.exportProfitReport);
router.get('/reports/export/inventory', authorize('vendor', 'admin', 'coordinator'), reportsController.exportInventoryReport);
router.get('/reports/export/customers', authorize('vendor', 'admin', 'coordinator'), reportsController.exportCustomerReport);
router.get('/reports/export/products', authorize('vendor', 'admin', 'coordinator'), reportsController.exportProductPerformanceReport);

// ============ SEARCH ROUTES ============
router.get('/search', searchController.globalSearch);
router.get('/search/suggestions', searchController.getSearchSuggestions);
router.get('/search/quick', searchController.quickSearchByBarcode);

// ============ IMPORT ROUTES ============
const multer = require('multer');
const importUpload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 50 * 1024 * 1024 }, // Increased to 50MB
  fileFilter: (req, file, cb) => {
    if (isAllowedImportFile(file)) {
      return cb(null, true);
    }
    return cb(AppError.badRequest('Only CSV, XLS, and XLSX files are allowed'), false);
  },
});

router.post('/import/products', authorize('vendor', 'admin'), uploadLimiter, checkLimit('product'), importUpload.single('file'), auditLog('import', 'product'), importController.importProducts);
router.post('/import/customers', authorize('vendor', 'admin'), uploadLimiter, importUpload.single('file'), auditLog('import', 'customer'), importController.importCustomers);
router.post('/import/preview', authorize('vendor', 'admin'), uploadLimiter, importUpload.single('file'), importController.previewFile);
router.get('/import/template/:type', authorize('vendor', 'admin'), importController.downloadTemplate);

// ============ REVIEWS ROUTES ============
router.get('/reviews', authorize('vendor', 'admin', 'coordinator'), reviewController.getAll);
router.get('/reviews/stats', authorize('vendor', 'admin'), reviewController.getStats);
router.get('/reviews/product/:productId', reviewController.getProductReviews);
router.get('/reviews/:id', authorize('vendor', 'admin', 'coordinator'), reviewController.getById);
router.patch('/reviews/:id/status', authorize('vendor', 'admin'), reviewController.updateStatus);
router.post('/reviews/:id/reply', authorize('vendor', 'admin'), reviewController.addReply);
router.delete('/reviews/:id', authorize('vendor', 'admin'), reviewController.delete);

// ============ COUPON ROUTES ============
router.get('/coupons', authorize('vendor', 'admin'), couponController.getAll);
router.get('/coupons/stats', authorize('vendor', 'admin'), couponController.getStats);
router.get('/coupons/:id', authorize('vendor', 'admin'), couponController.getById);
router.post('/coupons', authorize('vendor', 'admin'), auditLog('create', 'coupon'), couponController.create);
router.put('/coupons/:id', authorize('vendor', 'admin'), couponController.update);
router.delete('/coupons/:id', authorize('vendor', 'admin'), auditLog('delete', 'coupon'), couponController.delete);

// ============ BACKUP ROUTES ============
router.get('/backup/export', authorize('vendor', 'admin'), backupController.exportData);
router.get('/backup/export-json', authorize('vendor', 'admin'), backupController.exportJSON);
router.get('/backup/stats', authorize('vendor', 'admin'), backupController.getStats);
router.get('/backup/auto-settings', authorize('vendor', 'admin'), backupController.getAutoSettings);
router.put('/backup/auto-settings', authorize('vendor', 'admin'), backupController.updateAutoSettings);
router.post('/backup/restore', authorize('vendor', 'admin'), uploadLimiter, importUpload.single('file'), auditLog('restore', 'backup'), backupController.restoreData);

const backupUpload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for JSON
  fileFilter: (req, file, cb) => {
    if (isAllowedJsonFile(file)) {
      return cb(null, true);
    }
    return cb(AppError.badRequest('Only JSON backup files are allowed'), false);
  },
});
router.post('/backup/restore-json', authorize('vendor', 'admin'), uploadLimiter, backupUpload.single('file'), auditLog('restore', 'backup'), backupController.restoreJSON);

module.exports = router;


