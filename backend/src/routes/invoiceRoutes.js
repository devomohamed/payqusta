const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const paymentLinkController = require('../controllers/paymentLinkController');
const { authorize, auditLog } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

// --- Invoices --- (coordinator can view and create)
router.get('/', authorize('vendor', 'admin', 'coordinator', 'cashier'), checkPermission('invoices', 'read'), invoiceController.getAll);
router.get('/overdue', authorize('vendor', 'admin', 'coordinator', 'cashier'), checkPermission('invoices', 'read'), invoiceController.getOverdue);
router.get('/upcoming-installments', authorize('vendor', 'admin', 'coordinator', 'cashier'), checkPermission('invoices', 'read'), invoiceController.getUpcomingInstallments);
router.get('/sales-summary', authorize('vendor', 'admin', 'coordinator', 'cashier'), checkPermission('invoices', 'read'), invoiceController.getSalesSummary);
router.get('/:id', authorize('vendor', 'admin', 'coordinator', 'cashier'), checkPermission('invoices', 'read'), invoiceController.getById);
router.get('/:id/fulfillment-analysis', authorize('vendor', 'admin', 'coordinator', 'cashier'), checkPermission('invoices', 'read'), invoiceController.getFulfillmentAnalysis);

// Public/Conditional creation handled in index.js middleware wrapper or here if moved entirely
// For now, keeping the protected create here if it's direct API usage
// router.post('/', ... ) 

router.post('/send-whatsapp-message', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), invoiceController.sendWhatsAppMessage);
router.post('/:id/pay', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), auditLog('payment', 'invoice'), invoiceController.recordPayment);
router.post('/:id/pay-all', authorize('vendor', 'admin'), checkPermission('invoices', 'update'), auditLog('payment', 'invoice'), invoiceController.payAll);
router.post('/:id/send-whatsapp', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), invoiceController.sendWhatsApp);
router.post('/:id/refund', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), auditLog('refund', 'invoice'), invoiceController.processRefund);
router.patch('/:id/order-status', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), invoiceController.updateOrderStatus);
router.patch('/:id/operational-review', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), invoiceController.resolveOperationalReview);

// --- Shipping (Bosta) ---
router.post('/:id/shipping/bosta', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), invoiceController.createBostaWaybill);
router.get('/:id/shipping/bosta/track', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'read'), invoiceController.trackBostaWaybill);

// --- Payment Links ---
router.post('/:id/payment-link', authorize('vendor', 'admin', 'coordinator'), checkPermission('invoices', 'update'), paymentLinkController.generateLink);

module.exports = router;
