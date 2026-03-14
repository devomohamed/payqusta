const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authorize, auditLog } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const checkLimit = require('../middleware/checkLimit');
const { uploadMultiple, uploadEditorImages } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/security');

// --- Products --- (coordinator can view and update stock)
router.get('/', checkPermission('products', 'read'), productController.getAll);
router.get('/low-stock', authorize('vendor', 'admin', 'coordinator'), checkPermission('products', 'read'), productController.getLowStock);
router.get('/summary', authorize('vendor', 'admin', 'coordinator'), checkPermission('products', 'read'), productController.getStockSummary);

router.get('/categories', authorize('vendor', 'admin', 'coordinator'), checkPermission('products', 'read'), productController.getCategories);
router.get('/barcode/:code', authorize('vendor', 'admin', 'coordinator'), checkPermission('products', 'read'), productController.getByBarcode);
// router.get('/:id', ... ) // Moved to public

const { productValidations } = require('../middleware/validation');

router.post('/', authorize('vendor', 'admin', 'coordinator'), checkPermission('products', 'create'), uploadLimiter, uploadMultiple, productValidations.create, checkLimit('product'), auditLog('create', 'product'), productController.create);
router.put('/:id', authorize('vendor', 'admin'), checkPermission('products', 'update'), uploadLimiter, uploadMultiple, auditLog('update', 'product'), productController.update);
router.delete('/:id', authorize('vendor', 'admin'), checkPermission('products', 'delete'), auditLog('delete', 'product'), productController.delete);
router.patch('/:id/suspend', authorize('vendor', 'admin'), checkPermission('products', 'update'), auditLog('update', 'product'), productController.setSuspended);
router.patch('/:id/stock', authorize('vendor', 'admin', 'coordinator'), checkPermission('products', 'update'), auditLog('stock_change', 'product'), productController.updateStock);
router.post('/:id/generate-local-barcode', authorize('vendor', 'admin'), checkPermission('products', 'update'), auditLog('update', 'product'), productController.generateLocalBarcode);
router.post('/:id/upload-image', authorize('vendor', 'admin'), checkPermission('products', 'update'), uploadLimiter, uploadMultiple, productController.uploadImage);
router.post('/upload-image', authorize('vendor', 'admin', 'coordinator'), checkPermission('products', 'create'), uploadLimiter, uploadEditorImages, productController.uploadEditorImages);

router.delete('/:id/images/:imageUrl', authorize('vendor', 'admin'), checkPermission('products', 'update'), productController.deleteImage);

// Bulk Ops & Stocktake
router.post('/stocktake', authorize('vendor', 'admin'), checkPermission('products', 'update'), auditLog('stocktake', 'product'), productController.stocktake);

// Restock
router.post('/:id/request-restock', authorize('vendor', 'admin'), checkPermission('products', 'update'), productController.requestRestock);
router.post('/request-restock-bulk', authorize('vendor', 'admin'), checkPermission('products', 'update'), productController.requestRestockBulk);

// Bulk Ops
router.post('/bulk-delete', authorize('vendor', 'admin'), checkPermission('products', 'delete'), auditLog('bulk_delete', 'product'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return next(require('../utils/AppError').badRequest('يرجى تحديد المنتجات'));
    const Product = require('../models/Product');
    const result = await Product.updateMany({ _id: { $in: ids }, ...req.tenantFilter }, { isActive: false });
    require('../utils/ApiResponse').success(res, { deletedCount: result.modifiedCount }, `تم حذف ${result.modifiedCount} منتج`);
  } catch (error) { next(error); }
});

router.post('/:id/notify-stock', productController.subscribeStockNotification);

module.exports = router;

