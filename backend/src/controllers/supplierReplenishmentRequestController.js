const mongoose = require('mongoose');
const SupplierReplenishmentRequest = require('../models/SupplierReplenishmentRequest');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Branch = require('../models/Branch');
const PurchaseOrder = require('../models/PurchaseOrder');
const Role = require('../models/Role');
const NotificationService = require('../services/NotificationService');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { DEFAULT_ROLES } = require('../config/permissions');
const { ROLES } = require('../config/constants');

const REQUEST_STATUSES = new Set(['requested', 'under_review', 'approved', 'rejected', 'converted_to_purchase_order']);
const REQUEST_SOURCES = new Set(['branch_products', 'branch_dashboard', 'low_stock_page', 'stock_transfers_page', 'manual']);
const ACTIVE_REQUEST_STATUSES = ['requested', 'under_review', 'approved'];
const ACTIVE_PURCHASE_ORDER_STATUSES = ['draft', 'pending', 'approved', 'partial'];

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizePositiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function normalizeNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

async function resolveRolePermissions(user) {
  if (!user) return [];
  if (user?.isSuperAdmin) return [];

  if (user.customRole) {
    const roleDoc = await Role.findById(user.customRole).lean();
    return roleDoc?.permissions || [];
  }

  const standardRoles = Object.values(ROLES);
  if (!standardRoles.includes(user.role)) {
    const roleDoc = await Role.findOne({ name: user.role, tenant: user.tenant }).lean();
    return roleDoc?.permissions || [];
  }

  return DEFAULT_ROLES[user.role?.toUpperCase()]?.permissions || [];
}

async function userCanCreateSupplierReplenishment(user) {
  if (!user) return false;
  if (user?.isSuperAdmin) return true;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return true;

  const permissions = await resolveRolePermissions(user);
  return permissions.some((entry) => (
    entry?.resource === 'supplier_replenishment_requests'
    && Array.isArray(entry.actions)
    && entry.actions.includes('create')
  ));
}

async function userCanReadAllSupplierReplenishments(user) {
  if (!user) return false;
  if (user?.isSuperAdmin) return true;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' || role === 'vendor';
}

async function userCanUpdateSupplierReplenishment(user) {
  if (!user) return false;
  if (user?.isSuperAdmin) return true;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return true;

  const permissions = await resolveRolePermissions(user);
  return permissions.some((entry) => (
    entry?.resource === 'supplier_replenishment_requests'
    && Array.isArray(entry.actions)
    && entry.actions.includes('update')
  ));
}

async function resolveAccessibleBranchId({ tenantId, user, requestedBranchId }) {
  const userBranchId = user?.branch?._id || user?.branch || '';

  if (userBranchId) {
    if (requestedBranchId && String(requestedBranchId) !== String(userBranchId)) {
      throw AppError.forbidden('لا يمكنك إنشاء طلب مورد لهذا الفرع');
    }

    const branch = await Branch.findOne({
      _id: userBranchId,
      tenant: tenantId,
      isActive: true,
    }).select('_id name').lean();

    if (!branch) {
      throw AppError.badRequest('الفرع المرتبط بالمستخدم غير موجود أو غير نشط');
    }

    return branch;
  }

  if (!requestedBranchId) {
    throw AppError.badRequest('الفرع مطلوب');
  }

  if (!isValidObjectId(requestedBranchId)) {
    throw AppError.badRequest('الفرع غير صالح');
  }

  const branch = await Branch.findOne({
    _id: requestedBranchId,
    tenant: tenantId,
    isActive: true,
  }).select('_id name').lean();

  if (!branch) {
    throw AppError.badRequest('الفرع غير موجود أو غير نشط');
  }

  return branch;
}

function getBranchScopedInventory(product, branchId) {
  const inventoryRow = Array.isArray(product?.inventory)
    ? product.inventory.find((row) => String(row?.branch || row?.branch?._id || '') === String(branchId || ''))
    : null;

  const availabilityRow = Array.isArray(product?.branchAvailability)
    ? product.branchAvailability.find((row) => String(row?.branch || row?.branch?._id || '') === String(branchId || ''))
    : null;

  return {
    quantity: normalizeNonNegativeNumber(inventoryRow?.quantity, 0),
    minQuantity: normalizeNonNegativeNumber(inventoryRow?.minQuantity, product?.stock?.minQuantity || 0),
    isAvailableInBranch: availabilityRow ? availabilityRow.isAvailableInBranch !== false : true,
  };
}

class SupplierReplenishmentRequestController {
  async create(req, res, next) {
    try {
      const canCreate = await userCanCreateSupplierReplenishment(req.user);
      if (!canCreate) {
        return next(AppError.forbidden('ليس لديك صلاحية لإنشاء طلب مورد'));
      }

      const {
        branch: requestedBranchId,
        product: productId,
        supplier: requestedSupplierId,
        requestedQty,
        currentQty,
        minQty,
        notes,
        source,
        variantId = null,
      } = req.body || {};

      if (!isValidObjectId(productId)) {
        return next(AppError.badRequest('الصنف غير صالح'));
      }

      const branch = await resolveAccessibleBranchId({
        tenantId: req.tenantId,
        user: req.user,
        requestedBranchId,
      });

      const product = await Product.findOne({
        _id: productId,
        tenant: req.tenantId,
      }).select('name sku supplier stock inventory branchAvailability hasVariants').lean();

      if (!product) {
        return next(AppError.notFound('الصنف غير موجود'));
      }

      const branchInventory = getBranchScopedInventory(product, branch._id);
      if (!branchInventory.isAvailableInBranch) {
        return next(AppError.badRequest('هذا الصنف غير متاح في الفرع الحالي'));
      }

      const supplierId = requestedSupplierId || product.supplier;
      if (!supplierId || !isValidObjectId(supplierId)) {
        return next(AppError.badRequest('اختر المورد أولاً'));
      }

      const supplier = await Supplier.findOne({
        _id: supplierId,
        tenant: req.tenantId,
        isActive: true,
      }).select('_id name').lean();

      if (!supplier) {
        return next(AppError.badRequest('المورد غير موجود أو غير نشط'));
      }

      const normalizedRequestedQty = normalizePositiveInteger(requestedQty);
      const normalizedCurrentQty = normalizeNonNegativeNumber(currentQty, branchInventory.quantity);
      const normalizedMinQty = normalizeNonNegativeNumber(minQty, branchInventory.minQuantity);
      const normalizedSource = REQUEST_SOURCES.has(String(source || '')) ? String(source) : 'manual';
      const normalizedVariantId = variantId && isValidObjectId(variantId) ? variantId : null;

      const duplicate = await SupplierReplenishmentRequest.findOne({
        tenant: req.tenantId,
        branch: branch._id,
        product: product._id,
        variantId: normalizedVariantId,
        supplier: supplier._id,
        status: { $in: ACTIVE_REQUEST_STATUSES },
      }).select('_id status createdAt').lean();

      if (duplicate) {
        return next(AppError.conflict('يوجد طلب مورد مفتوح بالفعل لهذا الصنف مع نفس المورد'));
      }

      const openPurchaseOrder = await PurchaseOrder.findOne({
        tenant: req.tenantId,
        branch: branch._id,
        supplier: supplier._id,
        status: { $in: ACTIVE_PURCHASE_ORDER_STATUSES },
        items: {
          $elemMatch: normalizedVariantId
            ? { product: product._id, variantId: normalizedVariantId }
            : { product: product._id, variantId: null },
        },
      }).select('_id orderNumber status').lean();

      if (openPurchaseOrder) {
        return next(AppError.conflict(`يوجد أمر شراء مفتوح بالفعل لهذا الصنف مع نفس المورد (${openPurchaseOrder.orderNumber || openPurchaseOrder._id})`));
      }

      const request = await SupplierReplenishmentRequest.create({
        tenant: req.tenantId,
        branch: branch._id,
        product: product._id,
        variantId: normalizedVariantId,
        supplier: supplier._id,
        requestedQty: normalizedRequestedQty,
        currentQty: normalizedCurrentQty,
        minQty: normalizedMinQty,
        notes: notes || '',
        source: normalizedSource,
        createdBy: req.user._id,
      });

      await request.populate('branch', 'name');
      await request.populate('product', 'name sku');
      await request.populate('supplier', 'name');
      await request.populate('createdBy', 'name email');
      NotificationService.onSupplierReplenishmentRequested(req.tenantId, request).catch(() => null);

      return ApiResponse.created(res, request, 'تم إنشاء طلب المورد بنجاح');
    } catch (error) {
      return next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const canReadAll = await userCanReadAllSupplierReplenishments(req.user);
      const filter = { tenant: req.tenantId };

      if (req.query.status) {
        const requestedStatus = String(req.query.status);
        if (!REQUEST_STATUSES.has(requestedStatus)) {
          return next(AppError.badRequest('حالة طلب المورد غير صحيحة'));
        }
        filter.status = requestedStatus;
      }

      if (req.query.product) {
        if (!isValidObjectId(req.query.product)) {
          return next(AppError.badRequest('الصنف غير صالح'));
        }
        filter.product = req.query.product;
      }

      if (req.query.supplier) {
        if (!isValidObjectId(req.query.supplier)) {
          return next(AppError.badRequest('المورد غير صالح'));
        }
        filter.supplier = req.query.supplier;
      }

      if (canReadAll) {
        if (req.query.branch) {
          if (!isValidObjectId(req.query.branch)) {
            return next(AppError.badRequest('الفرع غير صالح'));
          }
          filter.branch = req.query.branch;
        }
      } else {
        const branch = await resolveAccessibleBranchId({
          tenantId: req.tenantId,
          user: req.user,
          requestedBranchId: req.query.branch,
        });
        filter.branch = branch._id;
      }

      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        SupplierReplenishmentRequest.find(filter)
          .populate('branch', 'name')
          .populate('product', 'name sku')
          .populate('supplier', 'name')
          .populate('createdBy', 'name email')
          .populate('reviewedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        SupplierReplenishmentRequest.countDocuments(filter),
      ]);

      return ApiResponse.paginated(res, items, { page, limit, total }, 'تم جلب طلبات المورد بنجاح');
    } catch (error) {
      return next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const canUpdate = await userCanUpdateSupplierReplenishment(req.user);
      if (!canUpdate) {
        return next(AppError.forbidden('ليس لديك صلاحية لتحديث طلب المورد'));
      }

      const { id } = req.params;
      const { status, notes } = req.body || {};
      const normalizedStatus = String(status || '');
      const allowedTargetStatuses = new Set(['under_review', 'approved', 'rejected']);

      if (!isValidObjectId(id)) {
        return next(AppError.badRequest('طلب المورد غير صالح'));
      }

      if (!allowedTargetStatuses.has(normalizedStatus)) {
        return next(AppError.badRequest('الحالة المطلوبة غير مدعومة'));
      }

      const request = await SupplierReplenishmentRequest.findOne({
        _id: id,
        tenant: req.tenantId,
      });

      if (!request) {
        return next(AppError.notFound('طلب المورد غير موجود'));
      }

      const transitionMap = {
        requested: new Set(['under_review', 'approved', 'rejected']),
        under_review: new Set(['approved', 'rejected']),
        approved: new Set([]),
        rejected: new Set([]),
        converted_to_purchase_order: new Set([]),
      };

      if (!transitionMap[request.status]?.has(normalizedStatus)) {
        return next(AppError.badRequest('الانتقال المطلوب في حالة طلب المورد غير مسموح'));
      }

      request.status = normalizedStatus;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      if (typeof notes === 'string' && notes.trim()) {
        request.notes = request.notes ? `${request.notes}\n\n[Review] ${notes.trim()}` : `[Review] ${notes.trim()}`;
      }

      await request.save();
      await request.populate('branch', 'name');
      await request.populate('product', 'name sku');
      await request.populate('supplier', 'name');
      await request.populate('createdBy', 'name email');
      await request.populate('reviewedBy', 'name email');
      if (normalizedStatus === 'approved' || normalizedStatus === 'rejected') {
        NotificationService.onSupplierReplenishmentReviewed(req.tenantId, request, normalizedStatus).catch(() => null);
      }

      return ApiResponse.success(res, request, 'تم تحديث حالة طلب المورد بنجاح');
    } catch (error) {
      return next(error);
    }
  }

  async convertToPurchaseOrder(req, res, next) {
    try {
      const canUpdate = await userCanUpdateSupplierReplenishment(req.user);
      if (!canUpdate) {
        return next(AppError.forbidden('ليس لديك صلاحية لتحويل طلب المورد'));
      }

      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return next(AppError.badRequest('طلب المورد غير صالح'));
      }

      const request = await SupplierReplenishmentRequest.findOne({
        _id: id,
        tenant: req.tenantId,
      })
        .populate('supplier', 'name paymentTerms')
        .populate('product', 'name sku supplier')
        .populate('branch', 'name');

      if (!request) {
        return next(AppError.notFound('طلب المورد غير موجود'));
      }

      if (request.status !== 'approved') {
        return next(AppError.badRequest('يجب اعتماد الطلب أولاً قبل تحويله إلى أمر شراء'));
      }

      if (request.convertedPurchaseOrder) {
        return next(AppError.conflict('تم تحويل هذا الطلب إلى أمر شراء بالفعل'));
      }

      const order = await PurchaseOrder.create({
        tenant: req.tenantId,
        supplier: request.supplier._id,
        branch: request.branch._id,
        status: 'draft',
        sourceType: 'supplier_replenishment_request',
        sourceSupplierReplenishmentRequest: request._id,
        paymentType: request.supplier?.paymentTerms === 'cash' ? 'cash' : 'deferred',
        installments: 1,
        paymentFrequency: 'monthly',
        items: [{
          product: request.product._id,
          variantId: request.variantId || undefined,
          quantity: Math.max(1, Number(request.requestedQty || 1)),
          unitCost: 0,
          totalCost: 0,
          receivedQuantity: 0,
        }],
        notes: [
          `تم إنشاء أمر الشراء من طلب مورد فرعي #${request._id}.`,
          `الفرع: ${request.branch?.name || 'غير محدد'}`,
          `الصنف: ${request.product?.name || 'غير محدد'}`,
          request.notes ? `ملاحظات الطلب: ${request.notes}` : '',
        ].filter(Boolean).join('\n'),
        createdBy: req.user._id,
      });

      request.status = 'converted_to_purchase_order';
      request.convertedPurchaseOrder = order._id;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      await request.populate('createdBy', 'name email');
      await request.populate('reviewedBy', 'name email');
      NotificationService.onSupplierReplenishmentConverted(req.tenantId, request, order).catch(() => null);

      return ApiResponse.success(res, {
        request,
        purchaseOrder: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
      }, 'تم تحويل طلب المورد إلى أمر شراء مسودة بنجاح');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SupplierReplenishmentRequestController();
