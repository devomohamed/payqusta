/**
 * Super Admin Routes
 */

const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const planController = require('../controllers/planController');
const paymentMethodController = require('../controllers/paymentMethodController');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const { requireSystemOwner } = require('../middleware/requireSystemOwner');

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

module.exports = router;
