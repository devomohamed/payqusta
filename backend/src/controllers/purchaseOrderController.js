/**
 * Purchase Order Controller
 */

const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const PurchaseOrder = require('../models/PurchaseOrder');
const SupplierPurchaseInvoice = require('../models/SupplierPurchaseInvoice');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Branch = require('../models/Branch');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

const ORDER_STATUSES = Object.freeze(['draft', 'pending', 'approved', 'partial', 'received', 'cancelled']);
const EDITABLE_ORDER_STATUSES = new Set(['draft', 'pending', 'approved', 'partial']);

function normalizePaymentType(supplier, value) {
  if (value === 'cash' || value === 'deferred') return value;
  return supplier?.paymentTerms === 'cash' ? 'cash' : 'deferred';
}

function normalizeInstallments(value) {
  const parsed = Number(value || 1);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizePaymentFrequency(value) {
  const allowed = new Set(['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'custom']);
  if (!allowed.has(String(value || ''))) return 'monthly';
  return String(value);
}

function normalizeCustomDueDates(dates = []) {
  if (!Array.isArray(dates)) return [];
  return dates
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()));
}

function toObjectIdString(value) {
  if (!value) return '';
  return String(value);
}

function ensureValidObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw AppError.badRequest(`${fieldName} غير صالح`);
  }
}

async function resolveValidBranchId({ tenantId, candidateBranchId, fieldName = 'الفرع' }) {
  if (!candidateBranchId) {
    throw AppError.badRequest(`${fieldName} مطلوب`);
  }
  if (!mongoose.Types.ObjectId.isValid(candidateBranchId)) {
    throw AppError.badRequest(`${fieldName} غير صالح`);
  }

  const branch = await Branch.findOne({
    _id: candidateBranchId,
    tenant: tenantId,
    isActive: true,
  }).select('_id').lean();

  if (!branch) {
    throw AppError.badRequest(`${fieldName} غير موجود أو غير نشط`);
  }

  return branch._id;
}

async function resolveOrderBranchId({ tenantId, user, requestedBranchId }) {
  if (requestedBranchId !== undefined && requestedBranchId !== null && requestedBranchId !== '') {
    return resolveValidBranchId({ tenantId, candidateBranchId: requestedBranchId, fieldName: 'الفرع' });
  }

  if (user?.branch && mongoose.Types.ObjectId.isValid(user.branch)) {
    const userBranch = await Branch.findOne({
      _id: user.branch,
      tenant: tenantId,
      isActive: true,
    }).select('_id').lean();

    if (userBranch?._id) return userBranch._id;
  }

  const firstActiveBranch = await Branch.findOne({ tenant: tenantId, isActive: true }).select('_id').lean();
  if (!firstActiveBranch?._id) {
    throw AppError.badRequest('لا يوجد فرع نشط مرتبط بالمتجر');
  }

  return firstActiveBranch._id;
}

async function resolveTargetBranchId({
  tenantId,
  user,
  requestedBranchId,
  defaultBranchId = null,
}) {
  if (requestedBranchId !== undefined && requestedBranchId !== null && requestedBranchId !== '') {
    return resolveValidBranchId({ tenantId, candidateBranchId: requestedBranchId, fieldName: 'الفرع' });
  }

  if (defaultBranchId) {
    return resolveValidBranchId({ tenantId, candidateBranchId: defaultBranchId, fieldName: 'فرع أمر الشراء' });
  }

  if (user?.branch && mongoose.Types.ObjectId.isValid(user.branch)) {
    const userBranch = await Branch.findOne({
      _id: user.branch,
      tenant: tenantId,
      isActive: true,
    }).select('_id').lean();

    if (userBranch?._id) return userBranch._id;
  }

  const firstActiveBranch = await Branch.findOne({ tenant: tenantId, isActive: true }).select('_id').lean();
  return firstActiveBranch?._id || null;
}

async function normalizeOrderItems({ items, tenantId, supplierId, existingItemsById = null }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw AppError.badRequest('أضف منتجات أمر الشراء أولاً');
  }

  const productIds = [...new Set(items.map((item) => toObjectIdString(item?.product)).filter(Boolean))];
  productIds.forEach((id) => ensureValidObjectId(id, 'معرّف المنتج'));

  const products = await Product.find({
    tenant: tenantId,
    _id: { $in: productIds },
    isActive: true,
  }).select('_id name supplier');

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const normalized = items.map((item) => {
    const productId = toObjectIdString(item.product);
    const product = productMap.get(productId);
    if (!product) {
      throw AppError.badRequest('تم اختيار منتج غير موجود أو غير نشط');
    }

    if (product.supplier && product.supplier.toString() !== toObjectIdString(supplierId)) {
      throw AppError.badRequest(`المنتج "${product.name}" مرتبط بمورد آخر`);
    }

    const quantity = Number(item.quantity || 0);
    const unitCost = Number(item.unitCost || 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw AppError.badRequest(`الكمية غير صحيحة في المنتج "${product.name}"`);
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw AppError.badRequest(`سعر الشراء غير صحيح في المنتج "${product.name}"`);
    }

    const normalizedItem = {
      product: product._id,
      variantId: item.variantId || undefined,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      receivedQuantity: 0,
    };

    if (item._id) {
      normalizedItem._id = item._id;
    }

    if (existingItemsById) {
      const previous = existingItemsById.get(toObjectIdString(item._id));
      if (previous) {
        normalizedItem.receivedQuantity = Number(previous.receivedQuantity || 0);
      }
    }

    return normalizedItem;
  });

  return normalized;
}

class PurchaseOrderController {
  async getAll(req, res, next) {
    try {
      const { page, limit, skip } = Helpers.getPaginationParams(req.query);
      const filter = { ...req.tenantFilter };

      if (req.query.status) filter.status = req.query.status;
      if (req.query.supplier) filter.supplier = req.query.supplier;
      if (req.query.branch) filter.branch = req.query.branch;
      if (req.query.search) {
        filter.$or = [
          { orderNumber: { $regex: req.query.search, $options: 'i' } },
          { notes: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      const [orders, total] = await Promise.all([
        PurchaseOrder.find(filter)
          .populate('supplier', 'name contactPerson phone')
          .populate('branch', 'name')
          .populate('items.product', 'name sku')
          .populate('sourceSupplierReplenishmentRequest', 'requestedQty status createdAt')
          .populate('createdBy', 'name')
          .populate('approvedBy', 'name')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit)
          .lean(),
        PurchaseOrder.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, orders, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter })
        .populate('supplier')
        .populate('branch', 'name')
        .populate('items.product')
        .populate('sourceSupplierReplenishmentRequest', 'requestedQty status createdAt')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name');

      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const {
        supplier: supplierId,
        branch: requestedBranchId,
        items,
        notes,
        expectedDeliveryDate,
      } = req.body;
      ensureValidObjectId(supplierId, 'المورد');

      const orderBranchId = await resolveOrderBranchId({
        tenantId: req.tenantId,
        user: req.user,
        requestedBranchId,
      });

      const supplier = await Supplier.findOne({ _id: supplierId, ...req.tenantFilter });
      if (!supplier) return next(AppError.notFound('المورد غير موجود'));

      const normalizedItems = await normalizeOrderItems({
        items,
        tenantId: req.tenantId,
        supplierId,
      });

      const paymentType = normalizePaymentType(supplier, req.body.paymentType);
      const installments = paymentType === 'deferred' ? normalizeInstallments(req.body.installments) : 1;
      const paymentFrequency = paymentType === 'deferred'
        ? normalizePaymentFrequency(req.body.paymentFrequency)
        : 'monthly';
      const customInstallmentDates = paymentFrequency === 'custom'
        ? normalizeCustomDueDates(req.body.customInstallmentDates)
        : [];
      const firstInstallmentDate = req.body.firstInstallmentDate
        ? new Date(req.body.firstInstallmentDate)
        : null;

      const status = req.body.status === 'draft' ? 'draft' : 'pending';
      const orderData = {
        tenant: req.tenantId,
        supplier: supplier._id,
        branch: orderBranchId,
        items: normalizedItems,
        notes,
        expectedDeliveryDate,
        paymentType,
        paymentFrequency,
        installments,
        firstInstallmentDate: paymentType === 'deferred' && firstInstallmentDate && !Number.isNaN(firstInstallmentDate.getTime())
          ? firstInstallmentDate
          : null,
        customInstallmentDates,
        status,
        receivedValue: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        createdBy: req.user._id,
      };

      const order = await PurchaseOrder.create(orderData);
      await order.populate('supplier', 'name contactPerson phone paymentTerms');
      await order.populate('branch', 'name');
      await order.populate('items.product', 'name sku');

      ApiResponse.created(res, order, 'تم إنشاء أمر الشراء بنجاح');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (order && !order.branch) {
        order.branch = await resolveOrderBranchId({
          tenantId: req.tenantId,
          user: req.user,
          requestedBranchId: req.body.branch,
        });
      }
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (!EDITABLE_ORDER_STATUSES.has(order.status)) {
        return next(AppError.badRequest('لا يمكن تعديل أمر شراء في هذه الحالة'));
      }

      const requestedStatus = req.body.status;
      if (requestedStatus) {
        if (!ORDER_STATUSES.includes(requestedStatus)) {
          return next(AppError.badRequest('حالة أمر الشراء غير صحيحة'));
        }

        if (requestedStatus === 'received' || requestedStatus === 'partial') {
          return next(AppError.badRequest('تحديث الاستلام يتم من خلال عملية الاستلام فقط'));
        }

        if (requestedStatus === 'cancelled' && Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن إلغاء أمر تم استلام جزء منه'));
        }

        order.status = requestedStatus;
        if (requestedStatus === 'approved' && !order.approvedBy) {
          order.approvedBy = req.user._id;
          order.approvedAt = new Date();
        }
      }

      if (req.body.supplier) {
        ensureValidObjectId(req.body.supplier, 'المورد');
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تغيير المورد بعد بدء الاستلام'));
        }
        const supplier = await Supplier.findOne({ _id: req.body.supplier, ...req.tenantFilter });
        if (!supplier) return next(AppError.notFound('المورد غير موجود'));
        order.supplier = supplier._id;
      }

      if (req.body.branch !== undefined) {
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تغيير الفرع بعد بدء الاستلام'));
        }

        order.branch = await resolveValidBranchId({
          tenantId: req.tenantId,
          candidateBranchId: req.body.branch,
          fieldName: 'الفرع',
        });
      }

      if (req.body.items) {
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تعديل البنود بعد بدء الاستلام'));
        }

        const existingItemsById = new Map(
          (order.items || []).map((item) => [toObjectIdString(item._id), item])
        );

        order.items = await normalizeOrderItems({
          items: req.body.items,
          tenantId: req.tenantId,
          supplierId: order.supplier,
          existingItemsById,
        });
      }

      if (req.body.notes !== undefined) order.notes = req.body.notes;
      if (req.body.expectedDeliveryDate !== undefined) order.expectedDeliveryDate = req.body.expectedDeliveryDate || null;

      if (req.body.paymentType) {
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تغيير طريقة السداد بعد بدء الاستلام'));
        }
        order.paymentType = req.body.paymentType === 'cash' ? 'cash' : 'deferred';
        if (order.paymentType === 'cash') {
          order.paymentFrequency = 'monthly';
          order.installments = 1;
          order.firstInstallmentDate = null;
          order.customInstallmentDates = [];
        }
      }

      if (req.body.installments !== undefined) {
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تغيير عدد الأقساط بعد بدء الاستلام'));
        }
        order.installments = order.paymentType === 'deferred' ? normalizeInstallments(req.body.installments) : 1;
      }

      if (req.body.paymentFrequency !== undefined) {
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تغيير جدول السداد بعد بدء الاستلام'));
        }
        order.paymentFrequency = order.paymentType === 'deferred'
          ? normalizePaymentFrequency(req.body.paymentFrequency)
          : 'monthly';
      }

      if (req.body.firstInstallmentDate !== undefined) {
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تغيير تاريخ أول قسط بعد بدء الاستلام'));
        }
        if (order.paymentType === 'deferred' && req.body.firstInstallmentDate) {
          const parsed = new Date(req.body.firstInstallmentDate);
          order.firstInstallmentDate = Number.isNaN(parsed.getTime()) ? null : parsed;
        } else {
          order.firstInstallmentDate = null;
        }
      }

      if (req.body.customInstallmentDates !== undefined) {
        if (Number(order.receivedValue || 0) > 0) {
          return next(AppError.badRequest('لا يمكن تغيير تواريخ الأقساط بعد بدء الاستلام'));
        }
        if (order.paymentType === 'deferred' && order.paymentFrequency === 'custom') {
          order.customInstallmentDates = normalizeCustomDueDates(req.body.customInstallmentDates);
        } else {
          order.customInstallmentDates = [];
        }
      }

      await order.save();
      await order.populate('supplier', 'name contactPerson phone paymentTerms');
      await order.populate('branch', 'name');
      await order.populate('items.product', 'name sku');
      await order.populate('approvedBy', 'name');

      ApiResponse.success(res, order, 'تم تحديث أمر الشراء');
    } catch (error) {
      next(error);
    }
  }

  async receive(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { receivedItems, branchId } = req.body;
      if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
        throw AppError.badRequest('أدخل الكميات المستلمة أولاً');
      }

      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter })
        .populate('supplier').session(session);
      if (!order) throw AppError.notFound('أمر الشراء غير موجود');

      if (order.status === 'cancelled' || order.status === 'received') {
        throw AppError.badRequest('لا يمكن استلام أمر في هذه الحالة');
      }

      if (order.status === 'draft') {
        throw AppError.badRequest('اعتمد أمر الشراء أولاً قبل الاستلام');
      }

      const targetBranchId = await resolveTargetBranchId({
        tenantId: req.tenantId,
        user: req.user,
        requestedBranchId: branchId,
        defaultBranchId: order.branch,
      });

      if (!targetBranchId && !order.branch) {
        throw AppError.badRequest('لا يوجد فرع صالح لاستلام أمر الشراء');
      }

      const productIds = [...new Set(order.items.map((item) => toObjectIdString(item.product)))];
      const products = await Product.find({
        _id: { $in: productIds },
        ...req.tenantFilter,
      }).session(session);
      const productMap = new Map(products.map((product) => [product._id.toString(), product]));

      let receiptValue = 0;
      let processedRows = 0;

      for (const received of receivedItems) {
        const item = order.items.id(received.itemId);
        if (!item) {
          throw AppError.badRequest('يوجد بند استلام غير موجود داخل أمر الشراء');
        }

        const quantityToReceive = Number(received.receivedQuantity || 0);
        if (!Number.isFinite(quantityToReceive) || quantityToReceive <= 0) continue;

        const remainingQuantity = Number(item.quantity || 0) - Number(item.receivedQuantity || 0);
        if (quantityToReceive > remainingQuantity) {
          throw AppError.badRequest('الكمية المستلمة أكبر من الكمية المتبقية');
        }

        item.receivedQuantity += quantityToReceive;
        receiptValue += quantityToReceive * Number(item.unitCost || 0);
        processedRows += 1;

        const product = productMap.get(toObjectIdString(item.product));
        if (!product) continue;

        if (!product.supplier) {
          product.supplier = order.supplier?._id || order.supplier;
        }

        let targetInventory = null;
        if (item.variantId) {
          const variant = product.variants.id(item.variantId);
          if (variant) {
            targetInventory = variant.inventory || [];
            variant.inventory = targetInventory;
          }
        } else {
          targetInventory = product.inventory || [];
          product.inventory = targetInventory;
        }

        let effectiveBranchId = targetBranchId;
        if (!effectiveBranchId && Array.isArray(targetInventory) && targetInventory.length > 0) {
          effectiveBranchId = targetInventory[0].branch;
        }

        if (effectiveBranchId) {
          let branchStock = targetInventory.find((inv) => (
            inv.branch && inv.branch.toString() === effectiveBranchId.toString()
          ));

          if (!branchStock) {
            branchStock = {
              branch: effectiveBranchId,
              quantity: 0,
              minQuantity: Number(product.stock?.minQuantity || 5),
              batches: [],
            };
            targetInventory.push(branchStock);
          }

          branchStock.quantity = Number(branchStock.quantity || 0) + quantityToReceive;

          if (received.batchNumber) {
            branchStock.batches = branchStock.batches || [];
            let batch = branchStock.batches.find((existingBatch) => existingBatch.batchNumber === received.batchNumber);
            if (!batch) {
              batch = { batchNumber: received.batchNumber, quantity: 0 };
              branchStock.batches.push(batch);
            }
            batch.quantity = Number(batch.quantity || 0) + quantityToReceive;
            if (received.expiryDate) {
              batch.expiryDate = received.expiryDate;
            }
          }
        } else {
          product.stock.quantity = Number(product.stock?.quantity || 0) + quantityToReceive;
        }

        await product.save({ session });
      }

      if (processedRows === 0) {
        throw AppError.badRequest('لم يتم إدخال أي كميات صالحة للاستلام');
      }

      const allReceived = order.items.every((item) => Number(item.receivedQuantity || 0) >= Number(item.quantity || 0));
      order.status = allReceived ? 'received' : 'partial';
      order.receivedDate = new Date();
      if (!order.branch && targetBranchId) {
        order.branch = targetBranchId;
      }

      if (order.paymentType === 'cash') {
        order.paidAmount = Number(order.paidAmount || 0) + receiptValue;
      }

      await order.save({ session });

      if (receiptValue > 0 && order.supplier) {
        const supplierPaymentType = order.paymentType === 'cash' ? 'cash' : 'deferred';
        const installments = supplierPaymentType === 'deferred'
          ? normalizeInstallments(order.installments)
          : 1;

        let supplierInvoice = await SupplierPurchaseInvoice.findOne({
          tenant: req.tenantId,
          purchaseOrder: order._id,
        }).session(session);

        if (!supplierInvoice) {
          supplierInvoice = new SupplierPurchaseInvoice({
            tenant: req.tenantId,
            supplier: order.supplier?._id || order.supplier,
            branch: order.branch || targetBranchId,
            purchaseOrder: order._id,
            paymentType: supplierPaymentType,
            installments,
            createdBy: req.user?._id || order.createdBy,
          });
        } else {
          supplierInvoice.paymentType = supplierPaymentType;
          supplierInvoice.installments = installments;
          if (!supplierInvoice.branch && (order.branch || targetBranchId)) {
            supplierInvoice.branch = order.branch || targetBranchId;
          }
        }

        supplierInvoice.applyReceipt({
          amount: receiptValue,
          paymentType: supplierPaymentType,
          installments,
          paymentFrequency: order.paymentFrequency,
          firstInstallmentDate: order.firstInstallmentDate,
          customInstallmentDates: order.customInstallmentDates,
        });
        await supplierInvoice.save({ session });

        order.supplier.addPurchase(receiptValue, supplierPaymentType, installments, {
          skipPaymentSchedule: true,
        });
        await order.supplier.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      await order.populate('supplier', 'name contactPerson phone financials paymentTerms');
      await order.populate('branch', 'name');
      await order.populate('items.product', 'name sku');
      await order.populate('createdBy', 'name');
      await order.populate('approvedBy', 'name');

      const message = allReceived
        ? 'تم استلام أمر الشراء بالكامل وتسجيل مشتريات المورد'
        : 'تم استلام جزء من الطلب وتسجيل قيمة الاستلام على المورد';

      ApiResponse.success(res, order, message);
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (order.status === 'received' || Number(order.receivedValue || 0) > 0) {
        return next(AppError.badRequest('لا يمكن حذف أمر تم استلامه كلياً أو جزئياً'));
      }

      await order.deleteOne();
      ApiResponse.success(res, null, 'تم حذف أمر الشراء');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/purchase-orders/:id/pdf
   * Generate and download Purchase Order as PDF
   */
  async generatePDF(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter })
        .populate('supplier')
        .populate('branch', 'name')
        .populate('items.product')
        .populate('createdBy', 'name')
        .populate('tenant');

      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const filename = `PO-${order.orderNumber}.pdf`;

      res.setHeader('Content-disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-type', 'application/pdf');
      doc.pipe(res);

      doc.rect(0, 0, 600, 100).fill('#f9fafb');
      doc.fillColor('#111827').fontSize(24).font('Helvetica-Bold').text('PURCHASE ORDER', 40, 40);

      doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
      doc.text(order.tenant?.name || 'PayQusta Store', 40, 70);
      doc.text('Inventory & Supplier Purchasing', 40, 82);

      const infoY = 120;
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold');
      doc.text('ORDER TO:', 40, infoY);
      doc.text('ORDER DETAILS:', 350, infoY);

      doc.font('Helvetica').fillColor('#374151');
      doc.text(order.supplier?.name || 'N/A', 40, infoY + 15);
      doc.text(order.supplier?.phone || '', 40, infoY + 27);
      doc.text(order.supplier?.email || '', 40, infoY + 39);

      doc.text(`PO Number: ${order.orderNumber}`, 350, infoY + 15);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 350, infoY + 27);
      doc.text(`Status: ${String(order.status || '').toUpperCase()}`, 350, infoY + 39);
      doc.text(`Payment: ${order.paymentType === 'cash' ? 'CASH' : 'DEFERRED'}`, 350, infoY + 51);
      doc.text(`Branch: ${order.branch?.name || 'N/A'}`, 350, infoY + 63);

      doc.moveDown(4);

      const tableTop = doc.y;
      doc.rect(40, tableTop, 515, 20).fill('#111827');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('ITEM DESCRIPTION', 50, tableTop + 6);
      doc.text('QTY', 260, tableTop + 6, { width: 40, align: 'center' });
      doc.text('REC.', 305, tableTop + 6, { width: 40, align: 'center' });
      doc.text('UNIT COST', 360, tableTop + 6, { width: 80, align: 'right' });
      doc.text('TOTAL', 450, tableTop + 6, { width: 90, align: 'right' });

      let y = tableTop + 25;
      doc.fillColor('#374151').font('Helvetica');

      order.items.forEach((item, i) => {
        if (i % 2 === 1) {
          doc.rect(40, y - 5, 515, 20).fill('#f3f4f6');
          doc.fillColor('#374151');
        }

        const name = item.product?.name || 'Product';
        doc.text(name.substring(0, 44), 50, y);
        doc.text(String(item.quantity || 0), 260, y, { width: 40, align: 'center' });
        doc.text(String(item.receivedQuantity || 0), 305, y, { width: 40, align: 'center' });
        doc.text(Number(item.unitCost || 0).toFixed(2), 360, y, { width: 80, align: 'right' });
        doc.text(Number(item.totalCost || 0).toFixed(2), 450, y, { width: 90, align: 'right' });
        y += 20;
      });

      y += 20;
      doc.moveTo(350, y).lineTo(555, y).stroke('#e5e7eb');
      y += 10;
      doc.font('Helvetica-Bold').fontSize(12).text('ORDER TOTAL:', 350, y);
      doc.text(`EGP ${Number(order.totalAmount || 0).toFixed(2)}`, 450, y, { width: 100, align: 'right' });

      y += 18;
      doc.font('Helvetica').fontSize(10).text(`Received Value: EGP ${Number(order.receivedValue || 0).toFixed(2)}`, 350, y);
      y += 14;
      doc.text(`Outstanding: EGP ${Number(order.outstandingAmount || 0).toFixed(2)}`, 350, y);

      if (order.notes) {
        y += 30;
        doc.fontSize(10).font('Helvetica-Bold').text('NOTES:', 40, y);
        doc.font('Helvetica').fontSize(9).text(order.notes, 40, y + 15, { width: 300 });
      }

      doc.fontSize(8).fillColor('#9ca3af').text('Powered by PayQusta', 0, 792, { align: 'center' });
      doc.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      }
    }
  }
}

module.exports = new PurchaseOrderController();
