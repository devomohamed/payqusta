/**
 * Product Controller — CRUD + Stock Management
 * Handles product lifecycle, stock alerts, and auto-restock
 */

const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const catchAsync = require('../utils/catchAsync');
const { STOCK_STATUS } = require('../config/constants');

const UNCATEGORIZED_CATEGORY_NAME = '\u0628\u062f\u0648\u0646 \u062a\u0635\u0646\u064a\u0641';
const UNCATEGORIZED_CATEGORY_SLUG = 'uncategorized';
const UNCATEGORIZED_CATEGORY_ICON = '\u{1F4E6}';

function normalizeNotificationChannel(value = '') {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || '';
}

async function ensureDefaultCategory(tenantId) {
  return Category.findOneAndUpdate(
    {
      tenant: tenantId,
      name: UNCATEGORIZED_CATEGORY_NAME,
      parent: null,
    },
    {
      $setOnInsert: {
        tenant: tenantId,
        name: UNCATEGORIZED_CATEGORY_NAME,
        slug: UNCATEGORIZED_CATEGORY_SLUG,
        icon: UNCATEGORIZED_CATEGORY_ICON,
        parent: null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

class ProductController {
  /**
   * GET /api/v1/products
   * List all products with pagination, search, and filters
   */
  getAll = catchAsync(async (req, res, next) => {
    const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);

    // Build filter
    const filter = { ...req.tenantFilter, isActive: true };
    const queryConditions = [];

    // Search
    if (req.query.search) {
      const searchPattern = String(req.query.search).trim();
      queryConditions.push({
        $or: [
          { name: { $regex: searchPattern, $options: 'i' } },
          { sku: { $regex: searchPattern, $options: 'i' } },
          { barcode: { $regex: searchPattern, $options: 'i' } },
          { description: { $regex: searchPattern, $options: 'i' } },
          { categoryName: { $regex: searchPattern, $options: 'i' } },
          { tags: { $regex: searchPattern, $options: 'i' } },
        ],
      });
    }

    // Category filter (support subcategories recursively)
    if (req.query.category) {
      if (req.query.category === 'null') {
        queryConditions.push({
          $or: [
            { category: { $in: [null, undefined] } },
            { subcategory: { $in: [null, undefined] } }
          ]
        });
      } else {
        const subcategories = await Category.find({
          $or: [{ _id: req.query.category }, { parent: req.query.category }],
          tenant: req.tenantId
        }).select('_id');

        const categoryIds = subcategories.map(c => c._id);
        queryConditions.push({
          $or: [
            { category: { $in: categoryIds } },
            { subcategory: { $in: categoryIds } }
          ]
        });
      }
    }

    if (queryConditions.length > 0) {
      filter.$and = queryConditions;
    }

    // Stock status filter
    if (req.query.stockStatus) filter.stockStatus = req.query.stockStatus;

    // Supplier filter
    if (req.query.supplier) filter.supplier = req.query.supplier;

    const Review = require('../models/Review');

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('supplier', 'name')
        .populate('category', 'name icon')
        .populate('subcategory', 'name icon')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Enrich with review stats in one aggregate
    if (products.length > 0) {
      const productIds = products.map(p => p._id);
      const reviewStats = await Review.aggregate([
        { $match: { product: { $in: productIds }, tenant: req.tenantId, status: 'approved' } },
        { $group: { _id: '$product', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ]);
      const statsMap = {};
      reviewStats.forEach(s => { statsMap[s._id.toString()] = s; });
      products.forEach(p => {
        const s = statsMap[p._id.toString()];
        p.avgRating = s ? parseFloat(s.avgRating.toFixed(1)) : 0;
        p.reviewCount = s ? s.reviewCount : 0;
      });
    }

    ApiResponse.paginated(res, products, { page, limit, total });
  });

  /**
   * GET /api/v1/products/:id
   */
  getById = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    }).populate('supplier', 'name contactPerson phone')
      .populate('category', 'name icon')
      .populate('subcategory', 'name icon');

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    ApiResponse.success(res, product);
  });

  /**
   * POST /api/v1/products/:id/notify-stock
   * Register an email / phone alert when an out-of-stock product returns.
   */
  subscribeStockNotification = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
      isActive: true,
    }).select('name stock stockNotifications');

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    if ((product.stock?.quantity || 0) > 0) {
      return ApiResponse.success(res, { availableNow: true }, 'المنتج متوفر الآن ويمكنك الطلب مباشرة');
    }

    const email = normalizeNotificationChannel(req.body.email).toLowerCase();
    const phone = normalizeNotificationChannel(req.body.phone);

    if (!email && !phone) {
      return next(AppError.badRequest('يرجى إدخال البريد الإلكتروني أو رقم الهاتف'));
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(AppError.badRequest('يرجى إدخال بريد إلكتروني صحيح'));
    }

    if (phone && phone.replace(/[^\d+]/g, '').length < 8) {
      return next(AppError.badRequest('يرجى إدخال رقم هاتف صحيح'));
    }

    const alreadyExists = (product.stockNotifications || []).some((notification) => {
      if (notification?.notifiedAt) return false;
      return (email && notification.email === email) || (phone && notification.phone === phone);
    });

    if (alreadyExists) {
      return ApiResponse.success(res, {}, 'تم تسجيلك مسبقًا، سنبلغك فور توفر المنتج');
    }

    product.stockNotifications = product.stockNotifications || [];
    product.stockNotifications.push({
      email: email || undefined,
      phone: phone || undefined,
    });
    await product.save();

    ApiResponse.success(res, {}, 'تم تسجيل طلب الإشعار بنجاح');
  });

  /**
   * POST /api/v1/products
   * Create a new product
   */
  create = catchAsync(async (req, res, next) => {
    const hasSelectedCategory = Boolean(req.body.category);
    const fallbackCategory = hasSelectedCategory ? null : await ensureDefaultCategory(req.tenantId);

    // Parse variants JSON string sent from FormData
    let variants = [];
    if (req.body.variants) {
      try {
        variants = JSON.parse(req.body.variants);
        // Strip UI-only fields and ensure correct types
        variants = variants.map(({ expanded, ...v }) => ({
          ...v,
          price: v.price !== '' && v.price !== undefined ? Number(v.price) : undefined,
          cost: v.cost !== '' && v.cost !== undefined ? Number(v.cost) : undefined,
          stock: v.stock !== '' && v.stock !== undefined ? Number(v.stock) : undefined,
        }));
      } catch (e) {
        variants = [];
      }
    }

    // Process uploaded images with watermark
    const { processImage } = require('../middleware/upload');
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);
    const watermarkOptions = tenant?.settings?.watermark || {};

    const uploadedImages = [];
    for (const file of (req.files || [])) {
      const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
      const imagePath = await processImage(file.buffer, filename, 'products', file.mimetype, watermarkOptions);
      uploadedImages.push(imagePath);
    }

    const existingImages = req.body.existingImages
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages]).flat(Infinity)
      : [];
    const allImages = [...existingImages, ...uploadedImages];


    // Exclude FormData string fields from the spread; use parsed values instead
    const {
      variants: _rawVariants,
      existingImages: _rawExisting,
      primaryImage: _rawPrimary,
      'stock[quantity]': _sq,
      'stock[minQuantity]': _smq,
      ...restBody
    } = req.body;

    const productData = {
      ...restBody,
      tenant: req.tenantId,
      category: hasSelectedCategory ? req.body.category : fallbackCategory._id,
      subcategory: (hasSelectedCategory && req.body.subcategory) ? req.body.subcategory : undefined,
      stock: {
        quantity: Number(req.body['stock[quantity]'] ?? req.body.stockQuantity ?? 0),
        minQuantity: Number(req.body['stock[minQuantity]'] ?? req.body.minQuantity ?? 5),
        unit: req.body.unit || 'قطعة',
      },
      variants,
      images: allImages,
      thumbnail: req.body.primaryImage || allImages[0] || undefined,
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

    // Initialize inventory for all active branches if inventory not provided
    if ((!req.body.inventory || req.body.inventory.length === 0) && req.body.stockQuantity > 0) {
      const Branch = require('../models/Branch');
      const branches = await Branch.find({ tenant: req.tenantId, isActive: true });

      if (branches.length > 0) {
        // If branchId is provided in body, use it. Otherwise, use user's branch or first branch.
        const targetBranchId = req.body.branchId || (req.user ? req.user.branch : null) || branches[0]._id;

        product.inventory = [{
          branch: targetBranchId,
          quantity: req.body.stockQuantity,
          minQuantity: req.body.minQuantity || 5
        }];
        await product.save();
      }
    }

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

    // Parse variants JSON string if present
    if (req.body.variants) {
      try {
        let variants = JSON.parse(req.body.variants);
        product.variants = variants.map(({ expanded, ...v }) => ({
          ...v,
          price: v.price !== '' && v.price !== undefined ? Number(v.price) : undefined,
          cost: v.cost !== '' && v.cost !== undefined ? Number(v.cost) : undefined,
          stock: v.stock !== '' && v.stock !== undefined ? Number(v.stock) : undefined,
        }));
      } catch (e) { /* keep existing variants */ }
    }

    // Process newly uploaded images with watermark
    const { processImage } = require('../middleware/upload');
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);
    const watermarkOptions = tenant?.settings?.watermark || {};

    const uploadedImages = [];
    for (const file of (req.files || [])) {
      const filename = `product-${product._id}-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
      const imagePath = await processImage(file.buffer, filename, 'products', file.mimetype, watermarkOptions);
      uploadedImages.push(imagePath);
    }

    const existingImages = req.body.existingImages
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages]).flat(Infinity)
      : null;
    if (existingImages !== null || uploadedImages.length > 0) {
      product.images = [...(existingImages || product.images || []), ...uploadedImages];
    }
    if (req.body.primaryImage) {
      product.thumbnail = req.body.primaryImage;
    } else if (uploadedImages.length > 0) {
      // First uploaded image is the primary (frontend sorts it to front)
      product.thumbnail = uploadedImages[0];
    } else if (existingImages && existingImages.length > 0) {
      product.thumbnail = existingImages[0];
    }


    // Update scalar fields
    const allowedFields = [
      'name', 'sku', 'description', 'category', 'price', 'compareAtPrice', 'cost',
      'wholesalePrice', 'shippingCost', 'barcode', 'tags', 'isActive', 'supplier',
      'expiryDate', 'seoTitle', 'seoDescription'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    // Handle hierarchical categories
    let categoryResetToDefault = false;
    if (req.body.category !== undefined) {
      if (req.body.category) {
        product.category = req.body.category;
      } else {
        const fallbackCategory = await ensureDefaultCategory(req.tenantId);
        product.category = fallbackCategory._id;
        product.subcategory = undefined;
        categoryResetToDefault = true;
      }
    }

    if (req.body.subcategory !== undefined && !categoryResetToDefault) {
      product.subcategory = req.body.subcategory || undefined;
    }

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
    const { quantity, operation, branchId } = req.body; // operation: 'add', 'subtract', or 'set'

    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    });

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    if (branchId) {
      // Branch-specific update
      if (!product.inventory) product.inventory = [];
      let branchStock = product.inventory.find(inv => inv.branch.toString() === branchId.toString());

      if (!branchStock) {
        branchStock = { branch: branchId, quantity: 0, minQuantity: 5 };
        product.inventory.push(branchStock);
        // Need to re-find it after push to mutate it? No, push by reference in Mongoose? 
        // Better to re-find or use the ref.
        branchStock = product.inventory[product.inventory.length - 1];
      }

      const currentQty = branchStock.quantity;
      if (operation === 'add') {
        branchStock.quantity += quantity;
      } else if (operation === 'subtract') {
        if (currentQty < quantity) {
          return next(AppError.badRequest('الكمية المطلوبة أكبر من المخزون المتاح في هذا الفرع'));
        }
        branchStock.quantity -= quantity;
      } else {
        branchStock.quantity = quantity;
      }
    } else {
      // Global update (legacy or fallback)
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
    }

    // Reset alert flags if stock is restored (global check)
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
    const Category = require('../models/Category');
    const categories = await Category.find({
      ...req.tenantFilter,
      parent: null,
      isActive: true,
    }).populate({
      path: 'children',
      match: { isActive: true },
      populate: {
        path: 'children',
        match: { isActive: true }
      }
    }).sort({ name: 1 });

    ApiResponse.success(res, categories);
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

    // Fetch tenant to get watermark settings
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);
    const watermarkOptions = tenant?.settings?.watermark || {};

    // Process all files
    for (const file of files) {
      const filename = `product-${product._id}-${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
      const imagePath = await processImage(file.buffer, filename, 'products', file.mimetype, watermarkOptions);
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
    await deleteFile(decodedUrl);

    ApiResponse.success(res, product, 'تم حذف الصورة بنجاح');
  });


  /**
   * POST /api/v1/products/stocktake
   * Perform bulk stocktake updates
   */
  stocktake = catchAsync(async (req, res, next) => {
    const { items, branchId } = req.body; // items: Array of { productId, actualQuantity }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(AppError.badRequest('يجب إرسال قائمة بالمنتجات والكميات الفعلية'));
    }

    const discrepancies = [];
    const updatePromises = items.map(async (item) => {
      const { productId, actualQuantity } = item;
      if (!productId || actualQuantity === undefined || actualQuantity < 0) return null;

      const product = await Product.findOne({ _id: productId, ...req.tenantFilter });
      if (!product) return null;

      let currentQuantity;

      if (branchId) {
        // Branch-specific stocktake
        if (!product.inventory) product.inventory = [];
        let branchStock = product.inventory.find(inv => inv.branch.toString() === branchId.toString());

        if (!branchStock) {
          branchStock = { branch: branchId, quantity: 0, minQuantity: 5 };
          product.inventory.push(branchStock);
          branchStock = product.inventory[product.inventory.length - 1];
        }

        currentQuantity = branchStock.quantity;
        const diff = Number(actualQuantity) - currentQuantity;

        if (diff !== 0) {
          discrepancies.push({
            productId: product._id,
            name: product.name,
            sku: product.sku,
            expectedQuantity: currentQuantity,
            actualQuantity: Number(actualQuantity),
            difference: diff,
            branchId
          });

          branchStock.quantity = Number(actualQuantity);
          await product.save({ validateBeforeSave: false });
        }
      } else {
        // Global stocktake (legacy)
        currentQuantity = product.stock.quantity;
        const diff = Number(actualQuantity) - currentQuantity;

        if (diff !== 0) {
          discrepancies.push({
            productId: product._id,
            name: product.name,
            sku: product.sku,
            expectedQuantity: currentQuantity,
            actualQuantity: Number(actualQuantity),
            difference: diff
          });

          product.stock.quantity = Number(actualQuantity);
          await product.save({ validateBeforeSave: false });
        }
      }

      return product;
    });

    await Promise.all(updatePromises);

    ApiResponse.success(
      res,
      {
        totalProcessed: items.length,
        discrepanciesFound: discrepancies.length,
        discrepancies,
        branchId
      },
      'تم الانتهاء من الجرد بنجاح'
    );
  });

  /**
   * POST /api/v1/products/upload-image
   * Upload image for Rich Text Editor
   */
  uploadEditorImage = catchAsync(async (req, res, next) => {
    if (!req.file) return next(AppError.badRequest('يرجى اختيار صورة'));

    const { processImage } = require('../middleware/upload');
    // Save inside a generic editor folder per tenant, pass mimetype for magic number check
    const imageUrl = await processImage(req.file.buffer, req.file.originalname, `editor/${req.tenantId}`, req.file.mimetype);

    ApiResponse.success(res, { url: imageUrl }, 'تم رفع الصورة بنجاح');
  });
}

module.exports = new ProductController();
