/**
 * Payment Routes
 * Routes for payment gateway integration
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Apply authentication to all remaining routes
router.use(protect);

// Get available gateways
router.get('/gateways', paymentController.getGateways);

// Create payment link
router.post('/create-link', authorize('vendor', 'admin', 'coordinator'), paymentController.createLink);

// Get all transactions
router.get('/transactions', authorize('vendor', 'admin', 'coordinator'), paymentController.getAllTransactions);

// Get single transaction
router.get('/transactions/:id', authorize('vendor', 'admin', 'coordinator'), paymentController.getTransaction);

// Get analytics
router.get('/analytics', authorize('admin'), paymentController.getAnalytics);

// Refund transaction (admin only)
router.post('/transactions/:id/refund', authorize('admin'), paymentController.refund);

module.exports = router;
