/**
 * Product Controller — CRUD + Stock Management
 * Handles product lifecycle, stock alerts, and auto-restock
 */

const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const catchAsync = require('../utils/catchAsync');
const { STOCK_STATUS } = require('../config/constants');

class ProductController {
  /**
   * GET /api/v1/products
   * List all products with pagination, search, and filters
   */
  getAll = catchAsync(async (req, res, next) => {
    const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);

    // Build filter
    const filter = { ...req.tenantFilter, isActive: true };

    // Search
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Category filter
    if (req.query.category) filter.category = req.query.category;

    // Stock status filter
    if (req.query.stockStatus) filter.stockStatus = req.query.stockStatus;

    // Supplier filter
    if (req.query.supplier) filter.supplier = req.query.supplier;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('supplier', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, products, { page, limit, total });
  });

  /**
   * GET /api/v1/products/:id
   */
  getById = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    }).populate('supplier', 'name contactPerson phone');

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    ApiResponse.success(res, product);
  });

  /**
   * POST /api/v1/products
   * Create a new product
   */
  create = catchAsync(async (req, res, next) => {
    const productData = {
      ...req.body,
      tenant: req.tenantId,
      stock: {
        quantity: req.body.stockQuantity || 0,
        minQuantity: req.body.minQuantity || 5,
        unit: req.body.unit || 'قطعة',
      },
    };

    // Check for uniqueness manually
    if (req.body.sku || req.body.barcode) {
      const existing = await Product.findOne({
        tenant: req.tenantId,
        $or: [
          ...(req.body.sku ? [{ sku: req.body.sku }, { 'variants.sku': req.body.sku }] : []),
          ...(req.body.barcode ? [{ barcode: req.body.barcode }, { 'variants.barcode': req.body.barcode }] : []),
        ],
      });

      if (existing) {
        const field = (req.body.sku && (existing.sku === req.body.sku || existing.variants?.some(v => v.sku === req.body.sku))) ? 'كود SKU' : 'الباركود';
        return next(new AppError(`${field} مستخدم بالفعل لمُنتج آخر في هذا المتجر`, 409));
      }
    }

    const product = await Product.create(productData);

    ApiResponse.created(res, product, 'تم إضافة المنتج بنجاح');
  });

  /**
   * PUT /api/v1/products/:id
   */
  update = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    });

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    // Update fields
    const allowedFields = [
      'name', 'sku', 'description', 'category', 'price', 'cost',
      'images', 'thumbnail', 'barcode', 'tags', 'isActive', 'supplier',
      'expiryDate',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    // Update stock separately
    if (req.body.stockQuantity !== undefined) product.stock.quantity = req.body.stockQuantity;
    if (req.body.minQuantity !== undefined) product.stock.minQuantity = req.body.minQuantity;

    // Update auto-restock
    // Check for uniqueness if SKU or Barcode is changing
    const newSku = req.body.sku;
    const newBarcode = req.body.barcode;

    if ((newSku && newSku !== product.sku) || (newBarcode && newBarcode !== product.barcode)) {
      const existing = await Product.findOne({
        tenant: req.tenantId,
        _id: { $ne: product._id },
        $or: [
          ...(newSku ? [{ sku: newSku }, { 'variants.sku': newSku }] : []),
          ...(newBarcode ? [{ barcode: newBarcode }, { 'variants.barcode': newBarcode }] : []),
        ],
      });

      if (existing) {
        const field = (newSku && (existing.sku === newSku || existing.variants?.some(v => v.sku === newSku))) ? 'كود SKU' : 'الباركود';
        return next(new AppError(`${field} مستخدم بالفعل لمُنتج آخر في هذا المتجر`, 409));
      }
    }

    await product.save();

    ApiResponse.success(res, product, 'تم تحديث المنتج بنجاح');
  });

  /**
   * DELETE /api/v1/products/:id (soft delete)
   */
  delete = catchAsync(async (req, res, next) => {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      { isActive: false },
      { new: true }
    );

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    ApiResponse.success(res, null, 'تم حذف المنتج بنجاح');
  });

  /**
   * PATCH /api/v1/products/:id/stock
   * Update stock quantity (add/subtract)
   */
  updateStock = catchAsync(async (req, res, next) => {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'

    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    });

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    if (operation === 'add') {
      product.stock.quantity += quantity;
    } else if (operation === 'subtract') {
      if (product.stock.quantity < quantity) {
        return next(AppError.badRequest('الكمية المطلوبة أكبر من المخزون المتاح'));
      }
      product.stock.quantity -= quantity;
    } else {
      product.stock.quantity = quantity;
    }

    // Reset alert flags if stock is restored
    if (product.stock.quantity > product.stock.minQuantity) {
      product.lowStockAlertSent = false;
      product.outOfStockAlertSent = false;
    }

    await product.save();

    ApiResponse.success(res, product, 'تم تحديث المخزون بنجاح');
  });

  /**
   * GET /api/v1/products/low-stock
   * Get all low stock and out of stock products
   */
  getLowStock = catchAsync(async (req, res, next) => {
    const products = await Product.findLowStock(req.tenantId);

    ApiResponse.success(res, products, 'المنتجات منخفضة المخزون');
  });

  /**
   * GET /api/v1/products/summary
   * Stock summary statistics
   */
  getStockSummary = catchAsync(async (req, res, next) => {
    const summary = await Product.getStockSummary(req.tenantId);

    ApiResponse.success(res, summary);
  });

  /**
   * GET /api/v1/products/categories
   * Get all unique categories for the tenant
   */
  getCategories = catchAsync(async (req, res, next) => {
    const productCategories = await Product.distinct('category', {
      ...req.tenantFilter,
      isActive: true,
    });

    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);

    let tenantCategories = [];
    if (tenant && tenant.settings && Array.isArray(tenant.settings.categories)) {
      tenantCategories = tenant.settings.categories
        .filter(c => c.isVisible !== false)
        .map(c => c.name || c);
    }

    const allCategories = [...new Set([...tenantCategories, ...productCategories])];

    ApiResponse.success(res, allCategories);
  });

  /**
   * POST /api/v1/products/:id/request-restock
   * Send restock request to supplier via WhatsApp
   */
  requestRestock = catchAsync(async (req, res, next) => {
    const { quantity } = req.body;
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter })
      .populate('supplier', 'name phone email');

    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    if (!product.supplier) return next(AppError.badRequest('هذا المنتج ليس له مورد محدد'));

    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);

    // Calculate needed quantity
    const currentStock = product.stock?.quantity || 0;
    const minStock = product.stock?.minQuantity || 5;
    const neededQty = quantity || Math.max(10, minStock * 2 - currentStock);

    // Send via WhatsApp using Template
    const WhatsAppService = require('../services/WhatsAppService');
    const result = await WhatsAppService.sendRestockTemplate(
      product.supplier.phone,
      tenant?.name || 'PayQusta',
      product,
      neededQty,
      tenant?.whatsapp,
      'payqusta_restock' // Force correct template name
    );

    // Create notification
    const NotificationService = require('../services/NotificationService');
    await NotificationService.notifyVendor(req.tenantId, {
      type: 'restock_request',
      title: 'طلب إعادة تخزين',
      message: `تم إرسال طلب ${neededQty} قطعة من "${product.name}" للمورد ${product.supplier.name}`,
      relatedModel: 'Product',
      relatedId: product._id,
    });

    ApiResponse.success(res, {
      success: result.success || !result.failed,
      product: { name: product.name, sku: product.sku },
      supplier: { name: product.supplier.name, phone: product.supplier.phone },
      requestedQuantity: neededQty,
      whatsappResult: result,
    }, result.success ? 'تم إرسال طلب إعادة التخزين للمورد ✅' : 'تم حفظ الطلب (WhatsApp غير متصل)');
  });

  /**
   * POST /api/v1/products/request-restock-bulk
   * Send bulk restock request for all low stock products to their suppliers
   */
  requestRestockBulk = catchAsync(async (req, res, next) => {
    const lowStockProducts = await Product.find({
      ...req.tenantFilter,
      isActive: true,
      $or: [
        { 'stock.quantity': { $lte: 0 } },
        { $expr: { $lte: ['$stock.quantity', '$stock.minQuantity'] } },
      ],
      supplier: { $ne: null },
    }).populate('supplier', 'name phone');

    if (lowStockProducts.length === 0) {
      return ApiResponse.success(res, { sent: 0 }, 'لا توجد منتجات منخفضة المخزون لها موردين');
    }

    // Group by supplier
    const bySupplier = {};
    lowStockProducts.forEach(p => {
      const supplierId = p.supplier._id.toString();
      if (!bySupplier[supplierId]) {
        bySupplier[supplierId] = { supplier: p.supplier, products: [] };
      }
      bySupplier[supplierId].products.push(p);
    });

    const WhatsAppService = require('../services/WhatsAppService');
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);

    const results = [];

    for (const supplierId in bySupplier) {
      const { supplier, products } = bySupplier[supplierId];

      let message = `📦 *طلب إعادة تخزين*\n`;
      message += `━━━━━━━━━━━━━━━\n`;
      message += `من: ${tenant?.name || 'PayQusta'}\n`;
      message += `━━━━━━━━━━━━━━━\n\n`;
      message += `مرحباً ${supplier.name} 👋\n\n`;
      message += `نرجو توفير المنتجات التالية:\n\n`;

      products.forEach((p, i) => {
        const needed = Math.max(10, (p.stock?.minQuantity || 5) * 2 - (p.stock?.quantity || 0));
        message += `${i + 1}. *${p.name}*\n`;
        message += `   📊 الحالي: ${p.stock?.quantity || 0} | المطلوب: ${needed}\n\n`;
      });

      message += `━━━━━━━━━━━━━━━\n`;
      message += `📅 ${new Date().toLocaleDateString('ar-EG')}\n`;
      message += `🙏 شكراً لتعاونكم`;

      const result = await WhatsAppService.sendMessage(supplier.phone, message);
      results.push({ supplier: supplier.name, productsCount: products.length, success: result.success });
    }

    ApiResponse.success(res, {
      totalSuppliers: Object.keys(bySupplier).length,
      totalProducts: lowStockProducts.length,
      results,
    }, `تم إرسال طلبات إعادة التخزين لـ ${Object.keys(bySupplier).length} مورد`);
  });

  /**
   * GET /api/v1/products/barcode/:code
   * Find product by barcode or SKU
   */
  getByBarcode = catchAsync(async (req, res, next) => {
    const { code } = req.params;

    if (!code) {
      return next(AppError.badRequest('الباركود مطلوب'));
    }

    // Search by barcode OR sku
    const product = await Product.findOne({
      ...req.tenantFilter,
      isActive: true,
      $or: [
        { barcode: code },
        { sku: code },
        { 'variants.barcode': code },
        { 'variants.sku': code }
      ],
    }).populate('supplier', 'name contactPerson phone');

    if (!product) {
      return next(AppError.notFound('المنتج غير موجود'));
    }

    ApiResponse.success(res, product);
  });

  /**
   * POST /api/v1/products/:id/upload-image
   * Upload product image
   */
  uploadImage = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    });

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    // Handle both single file (req.file) and multiple files (req.files)
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) return next(AppError.badRequest('الصورة مطلوبة'));

    const { processImage } = require('../middleware/upload');
    const uploadedImages = [];

    // Process all files
    for (const file of files) {
      const filename = `product-${product._id}-${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
      const imagePath = await processImage(file.buffer, filename, 'products', file.mimetype);
      uploadedImages.push(imagePath);
    }

    // Add to product images array
    if (!product.images) product.images = [];
    product.images.push(...uploadedImages);

    // Set thumbnail if not set or requested
    if (req.body.setAsThumbnail === 'true' || !product.thumbnail) {
      product.thumbnail = uploadedImages[0];
    }

    await product.save();

    ApiResponse.success(res, { images: uploadedImages, product }, 'تم رفع الصور بنجاح');
  });

  /**
   * DELETE /api/v1/products/:id/images/:imageUrl
   * Delete product image
   */
  deleteImage = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    });

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    const { imageUrl } = req.params;
    const decodedUrl = decodeURIComponent(imageUrl);

    // Remove from images array
    product.images = (product.images || []).filter(img => img !== decodedUrl);

    // Clear thumbnail if it matches
    if (product.thumbnail === decodedUrl) {
      product.thumbnail = product.images[0] || null;
    }

    await product.save();

    // Delete file from disk
    const { deleteFile } = require('../middleware/upload');
    deleteFile(decodedUrl);

    ApiResponse.success(res, product, 'تم حذف الصورة بنجاح');
  });


}

module.exports = new ProductController();

