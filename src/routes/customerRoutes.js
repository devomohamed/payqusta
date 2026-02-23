const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authorize, auditLog } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

// --- Customers --- (coordinator can view)
router.get('/', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'read'), customerController.getAll);
router.get('/top', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'read'), customerController.getTopCustomers);
router.get('/debtors', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'read'), customerController.getDebtors);
router.get('/:id', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'read'), customerController.getById);
router.get('/:id/transactions', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'read'), customerController.getTransactionHistory);
router.get('/:id/statement-pdf', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'read'), customerController.getStatementPDF);
router.get('/:id/credit-assessment', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'read'), customerController.getCreditAssessment);

// router.post('/', ... ) // Public/Conditional in index.js or check header here if moved completely

router.post('/:id/send-statement', authorize('vendor', 'admin'), checkPermission('customers', 'update'), customerController.sendStatement);
router.post('/:id/send-statement-pdf', authorize('vendor', 'admin', 'coordinator'), checkPermission('customers', 'update'), customerController.sendStatementPDF);
router.post('/:id/block-sales', authorize('vendor', 'admin'), checkPermission('customers', 'update'), customerController.blockSales);
router.post('/:id/unblock-sales', authorize('vendor', 'admin'), checkPermission('customers', 'update'), customerController.unblockSales);
router.put('/:id', authorize('vendor', 'admin'), checkPermission('customers', 'update'), auditLog('update', 'customer'), customerController.update);
router.put('/:id/whatsapp-preferences', authorize('vendor', 'admin'), checkPermission('customers', 'update'), customerController.updateWhatsAppPreferences);
router.delete('/:id', authorize('vendor', 'admin'), checkPermission('customers', 'delete'), auditLog('delete', 'customer'), customerController.delete);

// Bulk Ops
router.post('/bulk-delete', authorize('vendor', 'admin'), checkPermission('customers', 'delete'), auditLog('bulk_delete', 'customer'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return next(require('../utils/AppError').badRequest('يرجى تحديد العملاء'));
    const Customer = require('../models/Customer');
    const result = await Customer.updateMany({ _id: { $in: ids }, ...req.tenantFilter }, { isActive: false });
    require('../utils/ApiResponse').success(res, { deletedCount: result.modifiedCount }, `تم حذف ${result.modifiedCount} عميل`);
  } catch (error) { next(error); }
});

module.exports = router;
