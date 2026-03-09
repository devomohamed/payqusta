const Product = require('../models/Product');
const Category = require('../models/Category');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const catchAsync = require('../utils/catchAsync');
const { seedStarterCatalogForTenant } = require('../services/starterCatalogService');
const {
  assertProductIdentifiersUnique,
  findProductByCode,
  generateLocalBarcode,
  maybeAssignGeneratedLocalBarcode,
} = require('../services/barcodeService');
const {
  getTenantBarcodeSettings,
  normalizeProductBarcodeFields,
} = require('../utils/barcodeHelpers');

const UNCATEGORIZED_CATEGORY_NAME = '\u0628\u062f\u0648\u0646 \u062a\u0635\u0646\u064a\u0641';
const UNCATEGORIZED_CATEGORY_SLUG = 'uncategorized';
const UNCATEGORIZED_CATEGORY_ICON = '\u{1F4E6}';

function normalizeNotificationChannel(value = '') {
  return String(value || '').trim();
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeInventoryItems(rawInventory = [], fallbackMinQuantity = 5) {
  return (Array.isArray(rawInventory) ? rawInventory : [])
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

function mapImagesToOriginals(currentImages = [], currentOriginalImages = [], selectedImages = []) {
  const originalByImage = new Map();

  currentImages.forEach((imageUrl, index) => {
    originalByImage.set(imageUrl, currentOriginalImages[index] || '');
  });

  return (Array.isArray(selectedImages) ? selectedImages : []).map((imageUrl) => (
    originalByImage.get(imageUrl) || ''
  ));
}

async function createStoredProductImages(files = [], processImage, watermarkOptions = null) {
  return Promise.all((Array.isArray(files) ? files : []).map(async (file) => {
    const seed = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const originalImage = await processImage(
      file.buffer,
      `product-source-${seed}.webp`,
      'products/originals',
      file.mimetype,
      null
    );
    const visibleImage = await processImage(
      file.buffer,
      `product-${seed}.webp`,
      'products',
      file.mimetype,
      watermarkOptions
    );

    return {
      image: visibleImage,
      original: originalImage,
    };
  }));
}

function parseVariantsPayload(rawVariants) {
  if (!rawVariants) return [];
  try {
    const parsed = typeof rawVariants === 'string' ? JSON.parse(rawVariants) : rawVariants;
    return (Array.isArray(parsed) ? parsed : []).map(({ expanded, ...variant }) => ({
      ...variant,
      price: variant.price !== '' && variant.price !== undefined ? Number(variant.price) : undefined,
      compareAtPrice: variant.compareAtPrice !== '' && variant.compareAtPrice !== undefined ? Number(variant.compareAtPrice) : undefined,
      cost: variant.cost !== '' && variant.cost !== undefined ? Number(variant.cost) : undefined,
      stock: variant.stock !== '' && variant.stock !== undefined ? Number(variant.stock) : undefined,
    }));
  } catch (error) {
    return [];
  }
}

function parseInventoryPayload(rawInventory) {
  if (!rawInventory) return [];
  if (typeof rawInventory !== 'string') return Array.isArray(rawInventory) ? rawInventory : [];
  try {
    const parsed = JSON.parse(rawInventory);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function buildProductSearchConditions(searchPattern) {
  return [
    { name: { $regex: searchPattern, $options: 'i' } },
    { sku: { $regex: searchPattern, $options: 'i' } },
    { barcode: { $regex: searchPattern, $options: 'i' } },
    { internationalBarcode: { $regex: searchPattern, $options: 'i' } },
    { localBarcode: { $regex: searchPattern, $options: 'i' } },
    { 'variants.sku': { $regex: searchPattern, $options: 'i' } },
    { 'variants.barcode': { $regex: searchPattern, $options: 'i' } },
    { 'variants.internationalBarcode': { $regex: searchPattern, $options: 'i' } },
    { 'variants.localBarcode': { $regex: searchPattern, $options: 'i' } },
    { description: { $regex: searchPattern, $options: 'i' } },
    { categoryName: { $regex: searchPattern, $options: 'i' } },
    { tags: { $regex: searchPattern, $options: 'i' } },
  ];
}

async function ensureDefaultCategory(tenantId) {
  return Category.findOneAndUpdate(
    { tenant: tenantId, name: UNCATEGORIZED_CATEGORY_NAME, parent: null },
    {
      $setOnInsert: {
        tenant: tenantId,
        name: UNCATEGORIZED_CATEGORY_NAME,
        slug: UNCATEGORIZED_CATEGORY_SLUG,
        icon: UNCATEGORIZED_CATEGORY_ICON,
        parent: null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function loadTenantForWrite(tenantId) {
  const tenant = await Tenant.findById(tenantId).select('name settings whatsapp');
  if (!tenant) throw AppError.notFound('المتجر غير موجود');
  return tenant;
}

async function resolveCreateInventory(req, stockQuantity, minQuantity) {
  const inventory = parseInventoryPayload(req.body.inventory);
  const isAdminLikeUser = req.user?.role === 'admin' || !!req.user?.isSuperAdmin;
  const userBranchId = (!isAdminLikeUser && req.user?.branch) ? String(req.user.branch?._id || req.user.branch) : '';
  const mainBranchId = String(req.tenantId);
  const Branch = require('../models/Branch');
  const activeBranches = await Branch.find({ tenant: req.tenantId, isActive: true }).select('_id');
  const activeBranchIds = new Set(activeBranches.map((branch) => branch._id.toString()));
  let normalizedInventory = normalizeInventoryItems(inventory, minQuantity);
  let resolvedStockQuantity = stockQuantity;
  let resolvedMinQuantity = minQuantity;

  if (userBranchId) {
    if (userBranchId !== mainBranchId && !activeBranchIds.has(userBranchId)) {
      throw AppError.badRequest('فرع الحساب الحالي غير نشط أو غير صالح.');
    }
    const scopedQuantity = normalizedInventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const scopedMinQuantity = normalizedInventory[0]?.minQuantity ?? resolvedMinQuantity;
    const finalQuantity = scopedQuantity > 0 ? scopedQuantity : resolvedStockQuantity;
    if (userBranchId === mainBranchId) {
      resolvedStockQuantity = toNonNegativeNumber(finalQuantity, resolvedStockQuantity);
      resolvedMinQuantity = toNonNegativeNumber(scopedMinQuantity, resolvedMinQuantity);
      normalizedInventory = [];
    } else {
      normalizedInventory = [{ branch: userBranchId, quantity: finalQuantity, minQuantity: scopedMinQuantity }];
    }
    return { inventory: normalizedInventory, stockQuantity: resolvedStockQuantity, minQuantity: resolvedMinQuantity };
  }

  const requestedBranchId = req.body.branchId ? String(req.body.branchId) : '';
  const mainRows = normalizedInventory.filter((item) => String(item.branch) === mainBranchId);
  const branchRows = normalizedInventory.filter((item) => String(item.branch) !== mainBranchId);
  if (normalizedInventory.length === 0) {
    if (!requestedBranchId) throw AppError.badRequest('يرجى اختيار الفرع قبل إضافة المنتج.');
    if (requestedBranchId === mainBranchId) return { inventory: [], stockQuantity: resolvedStockQuantity, minQuantity: resolvedMinQuantity };
    if (!activeBranchIds.has(requestedBranchId)) throw AppError.badRequest('الفرع المحدد غير صالح أو غير نشط.');
    return {
      inventory: [{ branch: requestedBranchId, quantity: resolvedStockQuantity, minQuantity: resolvedMinQuantity }],
      stockQuantity: resolvedStockQuantity,
      minQuantity: resolvedMinQuantity,
    };
  }
  if (mainRows.length > 0) {
    if (mainRows.length > 1 || branchRows.length > 0) {
      throw AppError.badRequest('لا يمكن دمج الفرع الرئيسي مع فروع أخرى لنفس المنتج.');
    }
    return {
      inventory: [],
      stockQuantity: toNonNegativeNumber(mainRows[0].quantity, resolvedStockQuantity),
      minQuantity: toNonNegativeNumber(mainRows[0].minQuantity, resolvedMinQuantity),
    };
  }
  if (branchRows.some((item) => !activeBranchIds.has(String(item.branch)))) {
    throw AppError.badRequest('يوجد فرع غير صالح ضمن بيانات المخزون.');
  }
  return { inventory: branchRows, stockQuantity: resolvedStockQuantity, minQuantity: resolvedMinQuantity };
}

class ProductController {
  getAll = catchAsync(async (req, res) => {
    const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
    const filter = { ...req.tenantFilter, isActive: true };
    const isPublic = !req.user;
    const scopeQuery = String(req.query.scope || '').trim().toLowerCase();
    const suspendedQuery = String(req.query.suspended || '').trim().toLowerCase();
    if (isPublic) filter.isSuspended = { $ne: true };
    else if (scopeQuery === 'suspended' || suspendedQuery === 'true') filter.isSuspended = true;
    else if (scopeQuery === 'active' || suspendedQuery === 'false') filter.isSuspended = { $ne: true };

    const queryConditions = [];
    if (req.query.search) {
      queryConditions.push({ $or: buildProductSearchConditions(String(req.query.search).trim()) });
    }
    if (req.query.category) {
      if (req.query.category === 'null') {
        queryConditions.push({ $or: [{ category: { $in: [null, undefined] } }, { subcategory: { $in: [null, undefined] } }] });
      } else {
        const subcategories = await Category.find({
          $or: [{ _id: req.query.category }, { parent: req.query.category }],
          tenant: req.tenantId,
        }).select('_id');
        const categoryIds = subcategories.map((category) => category._id);
        queryConditions.push({ $or: [{ category: { $in: categoryIds } }, { subcategory: { $in: categoryIds } }] });
      }
    }
    if (queryConditions.length > 0) filter.$and = queryConditions;
    if (req.query.stockStatus) filter.stockStatus = req.query.stockStatus;
    if (req.query.supplier) filter.supplier = req.query.supplier;

    const Review = require('../models/Review');
    const loadPage = () => Promise.all([
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
    let [products, total] = await loadPage();
    if (total === 0) {
      const seedResult = await seedStarterCatalogForTenant(req.tenantId);
      if (seedResult.seeded) [products, total] = await loadPage();
    }
    if (products.length > 0) {
      const stats = await Review.aggregate([
        { $match: { product: { $in: products.map((product) => product._id) }, tenant: req.tenantId, status: 'approved' } },
        { $group: { _id: '$product', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ]);
      const statsMap = Object.fromEntries(stats.map((entry) => [entry._id.toString(), entry]));
      products.forEach((product) => {
        const entry = statsMap[product._id.toString()];
        product.avgRating = entry ? parseFloat(entry.avgRating.toFixed(1)) : 0;
        product.reviewCount = entry ? entry.reviewCount : 0;
      });
    }
    ApiResponse.paginated(res, products, { page, limit, total });
  });

  getById = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
      isActive: true,
      ...(req.user ? {} : { isSuspended: { $ne: true } }),
    })
      .populate('supplier', 'name contactPerson phone')
      .populate('category', 'name icon')
      .populate('subcategory', 'name icon')
      .populate('inventory.branch', 'name');
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    ApiResponse.success(res, product);
  });

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
    if (!email && !phone) return next(AppError.badRequest('يرجى إدخال البريد الإلكتروني أو رقم الهاتف'));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return next(AppError.badRequest('يرجى إدخال بريد إلكتروني صحيح'));
    if (phone && phone.replace(/[^\d+]/g, '').length < 8) return next(AppError.badRequest('يرجى إدخال رقم هاتف صحيح'));
    const exists = (product.stockNotifications || []).some((notification) => {
      if (notification?.notifiedAt) return false;
      return (email && notification.email === email) || (phone && notification.phone === phone);
    });
    if (exists) return ApiResponse.success(res, {}, 'تم تسجيلك مسبقًا، سنبلغك فور توفر المنتج');
    product.stockNotifications = product.stockNotifications || [];
    product.stockNotifications.push({ email: email || undefined, phone: phone || undefined });
    await product.save();

    ApiResponse.success(res, {}, 'تم تسجيل طلب الإشعار بنجاح');
  });

  create = catchAsync(async (req, res) => {
    const hasSelectedCategory = Boolean(req.body.category);
    const fallbackCategory = hasSelectedCategory ? null : await ensureDefaultCategory(req.tenantId);
    let stockQuantity = toNonNegativeNumber(req.body['stock[quantity]'] ?? req.body.stockQuantity ?? 0, 0);
    let minQuantity = toNonNegativeNumber(req.body['stock[minQuantity]'] ?? req.body.minQuantity ?? 5, 5);
    const resolvedInventory = await resolveCreateInventory(req, stockQuantity, minQuantity);
    stockQuantity = resolvedInventory.stockQuantity;
    minQuantity = resolvedInventory.minQuantity;
    const tenant = await loadTenantForWrite(req.tenantId);
    const barcodeSettings = getTenantBarcodeSettings(tenant);
    const watermarkOptions = tenant?.settings?.watermark || {};
    const { processImage } = require('../middleware/upload');
    const uploadedImagePairs = await createStoredProductImages(req.files || [], processImage, watermarkOptions);
    const uploadedImages = uploadedImagePairs.map((entry) => entry.image);
    const uploadedOriginalImages = uploadedImagePairs.map((entry) => entry.original);
    const existingImages = req.body.existingImages
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages]).flat(Infinity)
      : [];
    const { variants: _variants, inventory: _inventory, existingImages: _existingImages, primaryImage: _primaryImage, 'stock[quantity]': _sq, 'stock[minQuantity]': _smq, ...restBody } = req.body;
    const productData = {
      ...restBody,
      tenant: req.tenantId,
      category: hasSelectedCategory ? req.body.category : fallbackCategory._id,
      subcategory: hasSelectedCategory && req.body.subcategory ? req.body.subcategory : undefined,
      stock: { quantity: stockQuantity, minQuantity, unit: req.body.unit || 'قطعة' },
      variants: parseVariantsPayload(req.body.variants),
      inventory: resolvedInventory.inventory,
      images: [...existingImages, ...uploadedImages],
      originalImages: [...existingImages.map(() => ''), ...uploadedOriginalImages],
      thumbnail: req.body.primaryImage || existingImages[0] || uploadedImages[0] || undefined,
    };
    normalizeProductBarcodeFields(productData);
    await maybeAssignGeneratedLocalBarcode({ tenantId: req.tenantId, tenantSettings: barcodeSettings, product: productData });
    await assertProductIdentifiersUnique({ tenantId: req.tenantId, product: productData });
    const product = await Product.create(productData);
    ApiResponse.created(res, product, 'تم إضافة المنتج بنجاح');
  });

  update = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    if (req.body.variants) product.variants = parseVariantsPayload(req.body.variants);
    if (req.body.inventory) product.inventory = normalizeInventoryItems(parseInventoryPayload(req.body.inventory), product.stock?.minQuantity || 5);
    const tenant = await loadTenantForWrite(req.tenantId);
    const watermarkOptions = tenant?.settings?.watermark || {};
    const { processImage, deleteFile } = require('../middleware/upload');
    const uploadedImagePairs = await createStoredProductImages(req.files || [], processImage, watermarkOptions);
    const uploadedImages = uploadedImagePairs.map((entry) => entry.image);
    const uploadedOriginalImages = uploadedImagePairs.map((entry) => entry.original);
    const currentImages = Array.isArray(product.images) ? product.images : [];
    const currentOriginalImages = Array.isArray(product.originalImages) ? product.originalImages : [];
    const hasExistingImagesField = Object.prototype.hasOwnProperty.call(req.body, 'existingImages');
    const existingImages = hasExistingImagesField
      ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages]).flat(Infinity).filter(Boolean)
      : null;
    const removedImagePairs = hasExistingImagesField
      ? currentImages
        .map((imageUrl, index) => ({ image: imageUrl, original: currentOriginalImages[index] || '' }))
        .filter(({ image }) => !existingImages.includes(image))
      : [];
    if (hasExistingImagesField || uploadedImages.length > 0) {
      const retainedImages = hasExistingImagesField ? existingImages : currentImages;
      const retainedOriginalImages = hasExistingImagesField
        ? mapImagesToOriginals(currentImages, currentOriginalImages, existingImages)
        : currentOriginalImages;

      product.images = [...retainedImages, ...uploadedImages];
      product.originalImages = [...retainedOriginalImages, ...uploadedOriginalImages];
      product.thumbnail = req.body.primaryImage || uploadedImages[0] || retainedImages[0] || undefined;
    }
    [
      'name', 'sku', 'description', 'category', 'price', 'compareAtPrice', 'cost', 'wholesalePrice',
      'shippingCost', 'barcode', 'internationalBarcode', 'internationalBarcodeType', 'localBarcode',
      'tags', 'isActive', 'supplier', 'expiryDate', 'seoTitle', 'seoDescription',
    ].forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });
    let categoryResetToDefault = false;
    if (req.body.category !== undefined) {
      if (req.body.category) product.category = req.body.category;
      else {
        const fallbackCategory = await ensureDefaultCategory(req.tenantId);
        product.category = fallbackCategory._id;
        product.subcategory = undefined;
        categoryResetToDefault = true;
      }
    }
    if (req.body.subcategory !== undefined && !categoryResetToDefault) product.subcategory = req.body.subcategory || undefined;
    if (req.body.stockQuantity !== undefined || req.body['stock[quantity]'] !== undefined) {
      product.stock.quantity = toNonNegativeNumber(req.body.stockQuantity ?? req.body['stock[quantity]'], product.stock.quantity);
    }
    if (req.body.minQuantity !== undefined || req.body['stock[minQuantity]'] !== undefined) {
      product.stock.minQuantity = toNonNegativeNumber(req.body.minQuantity ?? req.body['stock[minQuantity]'], product.stock.minQuantity);
    }
    normalizeProductBarcodeFields(product);
    await assertProductIdentifiersUnique({ tenantId: req.tenantId, product, excludeProductId: product._id });
    await product.save();
    if (removedImagePairs.length > 0) {
      const pathsToDelete = [...new Set(removedImagePairs.flatMap(({ image, original }) => (
        [image, original].filter((path) => path)
      )))];

      for (const imagePath of pathsToDelete) {
        await deleteFile(imagePath);
      }
    }
    ApiResponse.success(res, product, 'تم تحديث المنتج بنجاح');
  });

  delete = catchAsync(async (req, res, next) => {
    const product = await Product.findOneAndUpdate({ _id: req.params.id, ...req.tenantFilter }, { isActive: false }, { new: true });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    ApiResponse.success(res, null, 'تم حذف المنتج بنجاح');
  });

  setSuspended = catchAsync(async (req, res, next) => {
    if (typeof req.body?.suspended !== 'boolean') return next(AppError.badRequest('يرجى تحديد قيمة التعليق بشكل صحيح'));
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter, isActive: true });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    product.isSuspended = req.body.suspended;
    await product.save();
    ApiResponse.success(res, product, req.body.suspended ? 'تم تعليق المنتج ولن يظهر في المتجر' : 'تم إلغاء تعليق المنتج');
  });

  updateStock = catchAsync(async (req, res, next) => {
    const { quantity, operation, branchId } = req.body;
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    if (branchId) {
      if (!product.inventory) product.inventory = [];
      let branchStock = product.inventory.find((inv) => inv.branch.toString() === branchId.toString());
      if (!branchStock) {
        branchStock = { branch: branchId, quantity: 0, minQuantity: 5 };
        product.inventory.push(branchStock);
        branchStock = product.inventory[product.inventory.length - 1];
      }
      const currentQty = branchStock.quantity;
      if (operation === 'add') branchStock.quantity += quantity;
      else if (operation === 'subtract') {
        if (currentQty < quantity) return next(AppError.badRequest('الكمية المطلوبة أكبر من المخزون المتاح في هذا الفرع'));
        branchStock.quantity -= quantity;
      } else branchStock.quantity = quantity;
    } else if (operation === 'add') product.stock.quantity += quantity;
    else if (operation === 'subtract') {
      if (product.stock.quantity < quantity) return next(AppError.badRequest('الكمية المطلوبة أكبر من المخزون المتاح'));
      product.stock.quantity -= quantity;
    } else product.stock.quantity = quantity;
    if (product.stock.quantity > product.stock.minQuantity) {
      product.lowStockAlertSent = false;
      product.outOfStockAlertSent = false;
    }
    await product.save();
    ApiResponse.success(res, product, 'تم تحديث المخزون بنجاح');
  });

  getLowStock = catchAsync(async (req, res) => {
    ApiResponse.success(res, await Product.findLowStock(req.tenantId), 'المنتجات منخفضة المخزون');
  });

  getStockSummary = catchAsync(async (req, res) => {
    ApiResponse.success(res, await Product.getStockSummary(req.tenantId));
  });

  getCategories = catchAsync(async (req, res) => {
    const loadCategories = () => Category.find({ ...req.tenantFilter, parent: null, isActive: true }).populate({
      path: 'children',
      match: { isActive: true },
      populate: { path: 'children', match: { isActive: true } },
    }).sort({ name: 1 });
    let categories = await loadCategories();
    if (categories.length === 0) {
      const seedResult = await seedStarterCatalogForTenant(req.tenantId);
      if (seedResult.seeded) categories = await loadCategories();
    }
    ApiResponse.success(res, categories);
  });

  requestRestock = catchAsync(async (req, res, next) => {
    const { quantity } = req.body;
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter }).populate('supplier', 'name phone email');
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    if (!product.supplier) return next(AppError.badRequest('هذا المنتج ليس له مورد محدد'));
    const tenant = await Tenant.findById(req.tenantId);
    const neededQty = quantity || Math.max(10, (product.stock?.minQuantity || 5) * 2 - (product.stock?.quantity || 0));
    const WhatsAppService = require('../services/WhatsAppService');
    const result = await WhatsAppService.sendRestockTemplate(product.supplier.phone, tenant?.name || 'PayQusta', product, neededQty, tenant?.whatsapp, 'payqusta_restock');
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
    }, result.success ? 'تم إرسال طلب إعادة التخزين للمورد' : 'تم حفظ الطلب (WhatsApp غير متصل)');
  });

  requestRestockBulk = catchAsync(async (req, res) => {
    const lowStockProducts = await Product.find({
      ...req.tenantFilter,
      isActive: true,
      $or: [{ 'stock.quantity': { $lte: 0 } }, { $expr: { $lte: ['$stock.quantity', '$stock.minQuantity'] } }],
      supplier: { $ne: null },
    }).populate('supplier', 'name phone');
    if (lowStockProducts.length === 0) return ApiResponse.success(res, { sent: 0 }, 'لا توجد منتجات منخفضة المخزون لها موردين');
    const bySupplier = {};
    lowStockProducts.forEach((product) => {
      const supplierId = product.supplier._id.toString();
      if (!bySupplier[supplierId]) bySupplier[supplierId] = { supplier: product.supplier, products: [] };
      bySupplier[supplierId].products.push(product);
    });
    const WhatsAppService = require('../services/WhatsAppService');
    const tenant = await Tenant.findById(req.tenantId);
    const results = [];
    for (const supplierId of Object.keys(bySupplier)) {
      const { supplier, products } = bySupplier[supplierId];
      let message = `*طلب إعادة تخزين*\nمن: ${tenant?.name || 'PayQusta'}\n\n`;
      products.forEach((product, index) => {
        const needed = Math.max(10, (product.stock?.minQuantity || 5) * 2 - (product.stock?.quantity || 0));
        message += `${index + 1}. ${product.name} | الحالي: ${product.stock?.quantity || 0} | المطلوب: ${needed}\n`;
      });
      const result = await WhatsAppService.sendMessage(supplier.phone, message);
      results.push({ supplier: supplier.name, productsCount: products.length, success: result.success });
    }
    ApiResponse.success(res, { totalSuppliers: Object.keys(bySupplier).length, totalProducts: lowStockProducts.length, results }, `تم إرسال طلبات إعادة التخزين لـ ${Object.keys(bySupplier).length} مورد`);
  });

  getByBarcode = catchAsync(async (req, res, next) => {
    if (!req.params.code) return next(AppError.badRequest('الباركود مطلوب'));
    const product = await findProductByCode({
      tenantFilter: req.tenantFilter,
      code: req.params.code,
      includeSuspended: Boolean(req.user),
    });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    ApiResponse.success(res, product);
  });

  generateLocalBarcode = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    product.localBarcode = await generateLocalBarcode({ tenantId: req.tenantId, excludeProductId: product._id });
    normalizeProductBarcodeFields(product);
    await assertProductIdentifiersUnique({ tenantId: req.tenantId, product, excludeProductId: product._id });
    await product.save();
    ApiResponse.success(res, { productId: product._id, localBarcode: product.localBarcode, localBarcodeType: product.localBarcodeType, product }, 'تم توليد الباركود المحلي بنجاح');
  });

  uploadImage = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) return next(AppError.badRequest('الصورة مطلوبة'));
    const { processImage } = require('../middleware/upload');
    const tenant = await Tenant.findById(req.tenantId);
    const watermarkOptions = tenant?.settings?.watermark || {};
    const uploadedImagePairs = await createStoredProductImages(files, processImage, watermarkOptions);
    const uploadedImages = uploadedImagePairs.map((entry) => entry.image);
    const uploadedOriginalImages = uploadedImagePairs.map((entry) => entry.original);
    product.images = [...(product.images || []), ...uploadedImages];
    product.originalImages = [...(product.originalImages || []), ...uploadedOriginalImages];
    if (req.body.setAsThumbnail === 'true' || !product.thumbnail) product.thumbnail = uploadedImages[0];
    await product.save();
    ApiResponse.success(res, { images: uploadedImages, product }, 'تم رفع الصور بنجاح');
  });

  deleteImage = catchAsync(async (req, res, next) => {
    const product = await Product.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!product) return next(AppError.notFound('المنتج غير موجود'));
    const decodedUrl = decodeURIComponent(req.params.imageUrl);
    const imageIndex = (product.images || []).findIndex((image) => image === decodedUrl);
    const originalImageUrl = imageIndex >= 0 ? ((product.originalImages || [])[imageIndex] || '') : '';
    product.images = (product.images || []).filter((image) => image !== decodedUrl);
    if (imageIndex >= 0) {
      product.originalImages = (product.originalImages || []).filter((_, index) => index !== imageIndex);
    }
    if (product.thumbnail === decodedUrl) product.thumbnail = product.images[0] || null;
    await product.save();
    const { deleteFile } = require('../middleware/upload');
    await deleteFile(decodedUrl);
    if (originalImageUrl && originalImageUrl !== decodedUrl) {
      await deleteFile(originalImageUrl);
    }
    ApiResponse.success(res, product, 'تم حذف الصورة بنجاح');
  });

  stocktake = catchAsync(async (req, res, next) => {
    const { items, branchId } = req.body;
    if (!Array.isArray(items) || items.length === 0) return next(AppError.badRequest('يجب إرسال قائمة بالمنتجات والكميات الفعلية'));
    const discrepancies = [];
    await Promise.all(items.map(async ({ productId, actualQuantity }) => {
      if (!productId || actualQuantity === undefined || actualQuantity < 0) return null;
      const product = await Product.findOne({ _id: productId, ...req.tenantFilter });
      if (!product) return null;
      if (branchId) {
        if (!product.inventory) product.inventory = [];
        let branchStock = product.inventory.find((inv) => inv.branch.toString() === branchId.toString());
        if (!branchStock) {
          branchStock = { branch: branchId, quantity: 0, minQuantity: 5 };
          product.inventory.push(branchStock);
          branchStock = product.inventory[product.inventory.length - 1];
        }
        const diff = Number(actualQuantity) - branchStock.quantity;
        if (diff !== 0) {
          discrepancies.push({ productId: product._id, name: product.name, sku: product.sku, expectedQuantity: branchStock.quantity, actualQuantity: Number(actualQuantity), difference: diff, branchId });
          branchStock.quantity = Number(actualQuantity);
          await product.save({ validateBeforeSave: false });
        }
        return product;
      }
      const diff = Number(actualQuantity) - product.stock.quantity;
      if (diff !== 0) {
        discrepancies.push({ productId: product._id, name: product.name, sku: product.sku, expectedQuantity: product.stock.quantity, actualQuantity: Number(actualQuantity), difference: diff });
        product.stock.quantity = Number(actualQuantity);
        await product.save({ validateBeforeSave: false });
      }
      return product;
    }));
    ApiResponse.success(res, { totalProcessed: items.length, discrepanciesFound: discrepancies.length, discrepancies, branchId }, 'تم الانتهاء من الجرد بنجاح');
  });

  uploadEditorImage = catchAsync(async (req, res, next) => {
    if (!req.file) return next(AppError.badRequest('يرجى اختيار صورة'));
    const { processImage } = require('../middleware/upload');
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
  if (!files.length) return next(AppError.badRequest('يرجى اختيار صورة'));
  const { processImage } = require('../middleware/upload');
  const imageUrls = await Promise.all(files.map((file) => (
    processImage(file.buffer, file.originalname, `editor/${req.tenantId}`, file.mimetype)
  )));
  return ApiResponse.success(res, { url: imageUrls[0], urls: imageUrls }, imageUrls.length > 1 ? 'تم رفع الصور بنجاح' : 'تم رفع الصورة بنجاح');
});

module.exports = productController;
