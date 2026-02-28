const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authorize, auditLog } = require('../middleware/auth');

router.get('/', categoryController.getAll);
router.get('/tree', categoryController.getTree);

router.post('/', authorize('vendor', 'admin'), auditLog('create', 'category'), categoryController.create);
router.put('/:id', authorize('vendor', 'admin'), auditLog('update', 'category'), categoryController.update);
router.delete('/:id', authorize('vendor', 'admin'), auditLog('delete', 'category'), categoryController.delete);

module.exports = router;
