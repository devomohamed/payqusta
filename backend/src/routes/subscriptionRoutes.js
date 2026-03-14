const router = require('express').Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/security');

// Public Webhooks (No auth required, relies on gateway signature verification inside)
router.post('/webhook/:gateway', webhookLimiter, subscriptionController.handleWebhook);

// Protected routes for Vendors
router.use(protect);
router.use(authorize('vendor', 'admin')); // Only store owners/admins can manage subscription

router.get('/payment-methods', subscriptionController.getPaymentMethods);
router.get('/my-subscription', subscriptionController.getMySubscription);
router.post('/subscribe', subscriptionController.subscribe);
router.post('/submit-receipt', subscriptionController.submitReceipt);

// We can add Cancel, Upgrade, Downgrade routes here later

module.exports = router;
