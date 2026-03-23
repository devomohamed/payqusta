/**
 * Super Admin Routes
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const planController = require('../controllers/planController');
const paymentMethodController = require('../controllers/paymentMethodController');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const { requireSystemOwner } = require('../middleware/requireSystemOwner');
const { isAllowedJsonFile } = require('../utils/fileValidation');
const AppError = require('../utils/AppError');

const platformBackupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedJsonFile(file)) {
      return cb(null, true);
    }
    return cb(AppError.badRequest('Only JSON backup files are allowed'), false);
  },
});

// All routes require Super Admin access
router.use(requireSuperAdmin);

router.get('/tenants', superAdminController.getAllTenants);
router.get('/analytics', superAdminController.getSystemAnalytics);
router.get('/tenants/:id/details', superAdminController.getTenantDetails);
router.post('/tenants', superAdminController.createTenant);
router.put('/tenants/:id', superAdminController.updateTenant);
router.delete('/tenants/:id', superAdminController.deleteTenant);
router.post('/tenants/:id/impersonate', superAdminController.impersonateTenant);

// Plans management
router.get('/plans', planController.getAllAdminPlans);
router.post('/plans', requireSystemOwner, planController.createPlan);
router.put('/plans/:id', requireSystemOwner, planController.updatePlan);
router.delete('/plans/:id', requireSystemOwner, planController.deletePlan);

// Payment Methods Config
router.get('/payment-methods', paymentMethodController.getSuperPaymentMethods);
router.put('/payment-methods', paymentMethodController.updateSuperPaymentMethods);

// Subscription Requests (Manual Approvals)
router.get('/subscription-requests', superAdminController.getSubscriptionRequests);
router.post('/subscription-requests/:id/approve', superAdminController.approveSubscriptionRequest);
router.post('/subscription-requests/:id/reject', superAdminController.rejectSubscriptionRequest);

router.get('/leads', superAdminController.getPublicLeads);
router.patch('/leads/:id', superAdminController.updatePublicLead);
router.get('/notifications', requireSystemOwner, superAdminController.getNotificationSettings);
router.put('/notifications', requireSystemOwner, superAdminController.updateNotificationSettings);
router.post('/notifications/test-email', requireSystemOwner, superAdminController.testNotificationEmail);
router.post('/notifications/test-sms', requireSystemOwner, superAdminController.testNotificationSms);

router.get('/backup/stats', requireSystemOwner, superAdminController.getPlatformBackupStats);
router.get('/backup/export-json', requireSystemOwner, superAdminController.exportPlatformBackupJSON);
router.get('/backup/export-full-json', requireSystemOwner, superAdminController.exportFullPlatformBackupJSON);
router.post('/backup/restore-json', requireSystemOwner, platformBackupUpload.single('file'), superAdminController.restorePlatformBackupJSON);
router.post('/backup/restore-full-json', requireSystemOwner, platformBackupUpload.single('file'), superAdminController.restoreFullPlatformBackupJSON);

module.exports = router;
