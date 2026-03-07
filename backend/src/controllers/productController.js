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
const { seedStarterCatalogForTenant } = require('../services/starterCatalogService');

const UNCATEGORIZED_CATEGORY_NAME = '\u0628\u062f\u0648\u0646 \u062a\u0635\u0646\u064a\u0641';
const UNCATEGORIZED_CATEGORY_SLUG = 'uncategorized';
const UNCATEGORIZED_CATEGORY_ICON = '\u{1F4E6}';

function normalizeNotificationChannel(value = '') {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || '';
  uploadEditorImages = catchAsync(async (req, res, next) => {
    const files = Array.isArray(req.files)
      ? req.files
      : [
        ...(Array.isArray(req.files?.image) ? req.files.image : req.file ? [req.file] : []),
        ...(Array.isArray(req.files?.images) ? req.files.images : []),
      ];

    if (!files.length) {
      return next(AppError.badRequest('ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø©'));
    }

    const { processImage } = require('../middleware/upload');
    const imageUrls = await Promise.all(
      files.map((file) => (
        processImage(file.buffer, file.originalname, `editor/${req.tenantId}`, file.mimetype)
      ))
    );

    return ApiResponse.success(
      res,
      { url: imageUrls[0], urls: imageUrls },
      imageUrls.length > 1 ? 'ØªÙ… Ø±ÙØ¹ Ø§Ù„ØµÙˆØ± Ø¨Ù†Ø¬Ø§Ø­' : 'ØªÙ… Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­'
    );
  });
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeInventoryItems(rawInventory = [], fallbackMinQuantity = 5) {
  const rows = Array.isArray(rawInventory) ? rawInventory : [];

  return rows
    .map((item) => {
      const branch = item?.branch?._id || item?.branch;
      if (!branch) return null;

      return {
        branch: String(branch),
        quantity: toNonNegativeNumber(item?.quantity, 0),
        minQuantity: toNonNegativeNumber(item?.minQuantity, fallbackMinQuantity),
      };
    })
    .filter(Boolean);
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
    const isPublicStorefrontRequest = !req.user;
    const scopeQuery = String(req.query.scope || '').trim().toLowerCase();
    const suspendedQuery = String(req.query.suspended || '').trim().toLowerCase();

    if (isPublicStorefrontRequest) {
      filter.isSuspended = { $ne: true };
    } else if (scopeQuery === 'suspended') {
      filter.isSuspended = true;
    } else if (scopeQuery === 'active') {
      filter.isSuspended = { $ne: true };
    } else if (suspendedQuery === 'true') {
      filter.isSuspended = true;
    } else if (suspendedQuery === 'false') {
      filter.isSuspended = { $ne: true };
    }

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

    const loadProductPage = () => Promise.all([
      Product.find(filter)
        .populate('supplier', 'name')
        .populate('category', 'name icon')
        .populate('subcategory', 'name icon')
        .populate('inventory.branch', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    let [products, total] = await loadProductPage();

    if (total === 0) {
      const seedResult = await seedStarterCatalogForTenant(req.tenantId);
      if (seedResult.seeded) {
        [products, total] = await loadProductPage();
      }
    }

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
      isActive: true,
      ...(req.user ? {} : { isSuspended: { $ne: true } }),
    }).populate('supplier', 'name contactPerson phone')
      .populate('category', 'name icon')
      .populate('subcategory', 'name icon')
      .populate('inventory.branch', 'name');

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
      isSuspended: { $ne: true },
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

    // Parse inventory JSON string sent from FormData
    let inventory = [];
    if (req.body.inventory) {
      if (typeof req.body.inventory === 'string') {
        try {
          inventory = JSON.parse(req.body.inventory);
        } catch (e) {
          inventory = [];
        }
      } else if (Array.isArray(req.body.inventory)) {
        inventory = req.body.inventory;
      }
    }

    let stockQuantity = toNonNegativeNumber(req.body['stock[quantity]'] ?? req.body.stockQuantity ?? 0, 0);
    let minQuantity = toNonNegativeNumber(req.body['stock[minQuantity]'] ?? req.body.minQuantity ?? 5, 5);
    const isAdminLikeUser = req.user?.role === 'admin' || !!req.user?.isSuperAdmin;
    const userBranchId = (!isAdminLikeUser && req.user?.branch)
      ? String(req.user.branch?._id || req.user.branch)
      : '';
    const mainBranchId = String(req.tenantId);

    const Branch = require('../models/Branch');
    const activeBranches = await Branch.find({ tenant: req.tenantId, isActive: true }).select('_id');
    const activeBranchIds = new Set(activeBranches.map((branch) => branch._id.toString()));

    let normalizedInventory = normalizeInventoryItems(inventory, minQuantity);

    if (userBranchId) {
      if (userBranchId !== mainBranchId && !activeBranchIds.has(userBranchId)) {
        return next(AppError.badRequest('فرع الحساب الحالي غير نشط أو غير صالح.'));
      }

      const scopedQuantity = normalizedInventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const scopedMinQuantity = normalizedInventory[0]?.minQuantity ?? minQuantity;
      const resolvedScopedQuantity = scopedQuantity > 0 ? scopedQuantity : stockQuantity;

      if (userBranchId === mainBranchId) {
        stockQuantity = toNonNegativeNumber(resolvedScopedQuantity, stockQuantity);
        minQuantity = toNonNegativeNumber(scopedMinQuantity, minQuantity);
        normalizedInventory = [];
      } else {
        normalizedInventory = [{
          branch: userBranchId,
          quantity: resolvedScopedQuantity,
          minQuantity: scopedMinQuantity,
        }];
      }
    } else {
      const requestedBranchId = req.body.branchId ? String(req.body.branchId) : '';
      const mainRows = normalizedInventory.filter((item) => String(item.branch) === mainBranchId);
      const branchRows = normalizedInventory.filter((item) => String(item.branch) !== mainBranchId);

      if (normalizedInventory.length === 0) {
        if (!requestedBranchId) {
          return next(AppError.badRequest('يرجى اختيار الفرع قبل إضافة المنتج.'));
        }
        if (requestedBranchId === mainBranchId) {
          normalizedInventory = [];
        } else if (!activeBranchIds.has(requestedBranchId)) {
          return next(AppError.badRequest('الفرع المحدد غير صالح أو غير نشط.'));
        } else {
          normalizedInventory = [{
            branch: requestedBranchId,
            quantity: stockQuantity,
            minQuantity,
          }];
        }
      } else if (mainRows.length > 0) {
        if (mainRows.length > 1 || branchRows.length > 0) {
          return next(AppError.badRequest('لا يمكن دمج الفرع الرئيسي مع فروع أخرى لنفس المنتج.'));
        }
        stockQuantity = toNonNegativeNumber(mainRows[0].quantity, stockQuantity);
        minQuantity = toNonNegativeNumber(mainRows[0].minQuantity, minQuantity);
        normalizedInventory = [];
      } else {
        const hasInvalidBranch = branchRows.some((item) => !activeBranchIds.has(String(item.branch)));
        if (hasInvalidBranch) {
          return next(AppError.badRequest('يوجد فرع غير صالح ضمن بيانات المخزون.'));
        }
        normalizedInventory = branchRows;
      }
    }

    // Process uploaded images with watermark concurrently
    const { processImage } = require('../middleware/upload');
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);
    const watermarkOptions = tenant?.settings?.watermark || {};

    const uploadedImages = await Promise.all(
      (req.files || []).map(async (file) => {
        const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
        return processImage(file.buffer, filename, 'products', file.mimetype, watermarkOptions);
      })
    );

    const existingImages = req.body.existingImages
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages]).flat(Infinity)
      : [];
    const allImages = [...existingImages, ...uploadedImages];


    // Exclude FormData string fields from the spread; use parsed values instead
    const {
      variants: _rawVariants,
      inventory: _rawInventory,
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
        quantity: stockQuantity,
        minQuantity,
        unit: req.body.unit || 'قطعة',
      },
      variants,
      inventory: normalizedInventory,
      images: allImages,
      thumbnail: req.body.primaryImage || allImages[0] || undefined,
    };


    // Check for uniqueness manually
    if (req.body.sku || req.body.barcode) {
      const collisionQuery = { tenant: req.tenantId, $or: [] };
      if (req.body.sku) {
        collisionQuery.$or.push({ sku: req.body.sku });
        collisionQuery.$or.push({ 'variants.sku': req.body.sku });
      }
      if (req.body.barcode) {
        collisionQuery.$or.push({ barcode: req.body.barcode });
        collisionQuery.$or.push({ 'variants.barcode': req.body.barcode });
      }

      const existing = await Product.findOne(collisionQuery);

      if (existing) {
        let fieldName = 'الحقل';
        if (req.body.sku && (existing.sku === req.body.sku || existing.variants?.some(v => v.sku === req.body.sku))) {
          fieldName = 'كود SKU';
        } else if (req.body.barcode && (existing.barcode === req.body.barcode || existing.variants?.some(v => v.barcode === req.body.barcode))) {
          fieldName = 'الباركود';
        }
        return next(new AppError(`${fieldName} مستخدم بالفعل لمُنتج آخر في هذا المتجر`, 409));
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

    // Parse inventory JSON string if present
    if (req.body.inventory) {
      try {
        let inventory = JSON.parse(req.body.inventory);
        product.inventory = inventory;
      } catch (e) { /* keep existing inventory */ }
    }

    // Process newly uploaded images with watermark concurrently
    const { processImage } = require('../middleware/upload');
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById(req.tenantId);
    const watermarkOptions = tenant?.settings?.watermark || {};

    const uploadedImages = await Promise.all(
      (req.files || []).map(async (file) => {
        const filename = `product-${product._id}-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
        return processImage(file.buffer, filename, 'products', file.mimetype, watermarkOptions);
      })
    );

    const hasExistingImagesField = Object.prototype.hasOwnProperty.call(req.body, 'existingImages');
    const existingImages = hasExistingImagesField
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages])
        .flat(Infinity)
        .filter(Boolean)
      : null;

    if (hasExistingImagesField || uploadedImages.length > 0) {
      product.images = [...(existingImages || []), ...uploadedImages];

      if (req.body.primaryImage) {
        product.thumbnail = req.body.primaryImage;
      } else if (uploadedImages.length > 0) {
        // First uploaded image is the primary (frontend sorts it to front)
        product.thumbnail = uploadedImages[0];
      } else if (existingImages && existingImages.length > 0) {
        product.thumbnail = existingImages[0];
      } else {
        // No images left after update.
        product.thumbnail = undefined;
      }
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
   * PATCH /api/v1/products/:id/suspend
   * Toggle product suspension (hide/show in storefront)
   */
  setSuspended = catchAsync(async (req, res, next) => {
    const { suspended } = req.body || {};
    if (typeof suspended !== 'boolean') {
      return next(AppError.badRequest('يرجى تحديد قيمة التعليق بشكل صحيح'));
    }

    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
      isActive: true,
    });

    if (!product) return next(AppError.notFound('المنتج غير موجود'));

    product.isSuspended = suspended;
    await product.save();

    ApiResponse.success(
      res,
      product,
      suspended ? 'تم تعليق المنتج ولن يظهر في المتجر' : 'تم إلغاء تعليق المنتج'
    );
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
    const loadCategories = () => Category.find({
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

    let categories = await loadCategories();

    if (categories.length === 0) {
      const seedResult = await seedStarterCatalogForTenant(req.tenantId);
      if (seedResult.seeded) {
        categories = await loadCategories();
      }
    }

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
      ...(req.user ? {} : { isSuspended: { $ne: true } }),
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

const productController = new ProductController();

productController.uploadEditorImages = catchAsync(async (req, res, next) => {
  const files = Array.isArray(req.files)
    ? req.files
    : [
      ...(Array.isArray(req.files?.image) ? req.files.image : req.file ? [req.file] : []),
      ...(Array.isArray(req.files?.images) ? req.files.images : []),
    ];

  if (!files.length) {
    return next(AppError.badRequest('يرجى اختيار صورة'));
  }

  const { processImage } = require('../middleware/upload');
  const imageUrls = await Promise.all(
    files.map((file) => (
      processImage(file.buffer, file.originalname, `editor/${req.tenantId}`, file.mimetype)
    ))
  );

  return ApiResponse.success(
    res,
    { url: imageUrls[0], urls: imageUrls },
    imageUrls.length > 1 ? 'تم رفع الصور بنجاح' : 'تم رفع الصورة بنجاح'
  );
});

module.exports = productController;
