const express = require('express');
const stockTransferController = require('../controllers/stockTransferController');
const { authorize, auditLog } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

const router = express.Router();

router.get(
  '/',
  authorize('vendor', 'admin', 'coordinator'),
  checkPermission('invoices', 'update'),
  stockTransferController.list
);

router.post(
  '/',
  authorize('vendor', 'admin', 'coordinator'),
  checkPermission('invoices', 'update'),
  auditLog('create', 'stock_transfer'),
  stockTransferController.create
);

router.get(
  '/:id',
  authorize('vendor', 'admin', 'coordinator'),
  checkPermission('invoices', 'update'),
  stockTransferController.getById
);

router.patch(
  '/:id/status',
  authorize('vendor', 'admin', 'coordinator'),
  checkPermission('invoices', 'update'),
  auditLog('update', 'stock_transfer'),
  stockTransferController.updateStatus
);

module.exports = router;
