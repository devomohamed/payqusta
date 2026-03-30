const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
const StockTransfer = require('../models/StockTransfer');
const User = require('../models/User');
const NotificationService = require('../services/NotificationService');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const { analyzeInvoiceFulfillment } = require('../services/FulfillmentService');
const { getBranchAvailableQuantity, toIdString } = require('../utils/inventoryAllocation');
const { buildTransferItemKey, normalizeReceiptUpdateMap } = require('../utils/stockTransferValidation');
const { userHasPermission } = require('../middleware/checkPermission');

const ALLOWED_ACTIVE_TRANSFER_STATUSES = ['requested', 'approved', 'prepared', 'in_transit', 'partially_received'];
const STANDALONE_TRANSFER_REQUEST_TYPE = 'branch_replenishment';
const STATUS_TRANSITIONS = {
  requested: ['approved', 'rejected', 'cancelled'],
  approved: ['prepared', 'cancelled'],
  prepared: ['in_transit', 'partially_received', 'fully_received'],
  in_transit: ['partially_received', 'fully_received'],
  partially_received: ['fully_received'],
};

const SOURCE_BRANCH_STATUSES = new Set(['approved', 'rejected', 'prepared', 'in_transit']);
const DESTINATION_BRANCH_STATUSES = new Set(['partially_received', 'fully_received']);

function isTenantWideTransferUser(user = {}) {
  return Boolean(
    user?.isSuperAdmin
    || user?.role === 'admin'
    || user?.role === 'vendor'
    || user?.role === 'coordinator'
    || user?.branchAccessMode === 'all_branches'
  );
}

function getAccessibleBranchIds(user = {}) {
  const ids = [
    ...(Array.isArray(user?.assignedBranches) ? user.assignedBranches : []),
    user?.primaryBranch,
    user?.branch?._id || user?.branch,
  ]
    .map((value) => toIdString(value))
    .filter(Boolean);

  return [...new Set(ids)];
}

function buildTransferVisibilityFilter(user = {}) {
  if (isTenantWideTransferUser(user)) return {};

  const branchIds = getAccessibleBranchIds(user);
  if (!branchIds.length) {
    return { _id: null };
  }

  return {
    $or: [
      { fromBranch: { $in: branchIds } },
      { toBranch: { $in: branchIds } },
    ],
  };
}

function assertTransferStatusPermission(user = {}, transfer, status) {
  if (isTenantWideTransferUser(user)) return;

  const branchIds = getAccessibleBranchIds(user);
  if (!branchIds.length) {
    throw AppError.forbidden('لا تملك صلاحية تشغيل تحويلات المخزون');
  }

  const fromBranchId = toIdString(transfer.fromBranch);
  const toBranchId = toIdString(transfer.toBranch);

  if (SOURCE_BRANCH_STATUSES.has(status) && !branchIds.includes(fromBranchId)) {
    throw AppError.forbidden('هذه العملية متاحة فقط لمدير الفرع المرسل أو الإدارة');
  }

  if (DESTINATION_BRANCH_STATUSES.has(status) && !branchIds.includes(toBranchId)) {
    throw AppError.forbidden('هذه العملية متاحة فقط لمدير الفرع المستقبِل أو الإدارة');
  }
}

function appendTimeline(transfer, status, note = '', actor = null) {
  transfer.timeline = transfer.timeline || [];
  transfer.timeline.push({
    status,
    at: new Date(),
    note,
    actor: actor || null,
  });
}

function getInventoryRows(product, variant = null) {
  return variant ? (variant.inventory || []) : (product.inventory || []);
}

function ensureInventoryRow(targetRows, branchId) {
  let row = targetRows.find((item) => toIdString(item.branch) === toIdString(branchId));
  if (!row) {
    row = { branch: branchId, quantity: 0, minQuantity: 0 };
    targetRows.push(row);
    row = targetRows[targetRows.length - 1];
  }
  return row;
}

function adjustProductInventory({ product, variant = null, branchId, quantityDelta }) {
  const targetRows = getInventoryRows(product, variant);
  const row = ensureInventoryRow(targetRows, branchId);
  const nextQty = Math.max(0, Number(row.quantity || 0) + Number(quantityDelta || 0));
  row.quantity = nextQty;
}

async function notifyTransferUsers({ tenantId, branch, title, message, link, relatedModel = 'Invoice', relatedId = null }) {
  const recipients = [];
  if (branch?.manager) recipients.push(branch.manager);

  const recipientIds = [...new Set(recipients.map((id) => toIdString(id)).filter(Boolean))];
  if (!recipientIds.length) return;

  const recipientUsers = await User.find({
    _id: { $in: recipientIds },
    tenant: tenantId,
    isActive: true,
  }).select('_id role customRole tenant isSuperAdmin email');

  const allowedRecipients = (
    await Promise.all(
      recipientUsers.map(async (user) => (
        (await userHasPermission(user, 'invoices', 'update')) ? user : null
      ))
    )
  ).filter(Boolean);

  await Promise.all(
    allowedRecipients.map((recipient) =>
      NotificationService.sendDeduped({
        tenant: tenantId,
        recipient: recipient._id,
        type: 'order_status',
        title,
        message,
        icon: 'truck',
        color: 'info',
        link,
        relatedModel,
        relatedId,
      }, {
        dedupeWindowMinutes: 180,
        extraMatch: { message },
      }).catch(() => null)
    )
  );
}

async function notifyAdminUsers({ tenantId, title, message, link, relatedModel = 'Invoice', relatedId = null, icon = 'truck', color = 'info' }) {
  const recipients = await User.find({
    tenant: tenantId,
    isActive: true,
    role: { $in: ['admin', 'coordinator'] },
  }).select('_id');

  await Promise.all(
    recipients.map((user) =>
      NotificationService.sendDeduped({
        tenant: tenantId,
        recipient: user._id,
        type: 'order_status',
        title,
        message,
        icon,
        color,
        link,
        relatedModel,
        relatedId,
      }, {
        dedupeWindowMinutes: 180,
        extraMatch: { message },
      }).catch(() => null)
    )
  );
}

function getTransferRelatedPayload(invoice = null, transfer = null) {
  if (invoice?._id) {
    return {
      relatedModel: 'Invoice',
      relatedId: invoice._id,
    };
  }

  return {
    relatedModel: 'StockTransfer',
    relatedId: transfer?._id || null,
  };
}

async function buildStandaloneTransferItems({ tenantId, fromBranchId, toBranchId, items = [] }) {
  if (!toBranchId) {
    throw AppError.badRequest('فرع الاستلام مطلوب');
  }

  if (!Array.isArray(items) || !items.length) {
    throw AppError.badRequest('يجب تحديد صنف واحد على الأقل لطلب التزويد');
  }

  const [toBranch, candidateBranches, products] = await Promise.all([
    Branch.findOne({ _id: toBranchId, tenant: tenantId, isActive: true }).select('name manager'),
    Branch.find({
      tenant: tenantId,
      isActive: true,
      _id: { $ne: toBranchId },
    }).select('name manager'),
    Product.find({
      tenant: tenantId,
      _id: { $in: [...new Set(items.map((item) => toIdString(item.product)).filter(Boolean))] },
    }),
  ]);

  if (!toBranch) {
    throw AppError.badRequest('فرع الاستلام غير متاح');
  }

  const productMap = new Map(products.map((product) => [toIdString(product._id), product]));
  const normalizedItems = items.map((item) => {
    const productId = toIdString(item.product);
    const product = productMap.get(productId);

    if (!product) {
      throw AppError.badRequest('أحد الأصناف المحددة غير متاح');
    }

    const variant = item.variant && product.variants?.id ? product.variants.id(item.variant) : null;
    const requestedQty = Math.max(1, Number(item.requestedQty) || 0);

    return {
      product,
      variant,
      payload: {
        product: product._id,
        variant: variant?._id || item.variant || null,
        productName: item.productName || product.name,
        sku: item.sku || product.sku || '',
        requestedQty,
      },
    };
  });

  let fromBranch = null;
  if (fromBranchId) {
    fromBranch = await Branch.findOne({ _id: fromBranchId, tenant: tenantId, isActive: true }).select('name manager');
    if (!fromBranch) {
      throw AppError.badRequest('فرع الإرسال غير متاح');
    }
  } else {
    if (normalizedItems.length !== 1) {
      throw AppError.badRequest('يجب اختيار فرع الإرسال يدويًا عند طلب أكثر من صنف');
    }

    const [singleItem] = normalizedItems;
    const rankedBranches = candidateBranches
      .map((branch) => ({
        branch,
        availableQty: getBranchAvailableQuantity({
          product: singleItem.product,
          variant: singleItem.variant,
          branchId: branch._id,
          channel: 'pos',
        }),
      }))
      .filter((entry) => entry.availableQty > 0)
      .sort((left, right) => right.availableQty - left.availableQty);

    fromBranch = rankedBranches.find((entry) => entry.availableQty >= singleItem.payload.requestedQty)?.branch
      || rankedBranches[0]?.branch
      || null;

    if (!fromBranch) {
      throw AppError.badRequest('لا يوجد فرع مصدر يملك مخزونًا متاحًا لهذا الصنف حاليًا');
    }
  }

  if (toIdString(fromBranch._id) === toIdString(toBranch._id)) {
    throw AppError.badRequest('فرع الإرسال والاستلام يجب أن يكونا مختلفين');
  }

  for (const item of normalizedItems) {
    const availableQty = getBranchAvailableQuantity({
      product: item.product,
      variant: item.variant,
      branchId: fromBranch._id,
      channel: 'pos',
    });

    if (availableQty < item.payload.requestedQty) {
      throw AppError.badRequest(`الكمية المطلوبة من ${item.payload.productName} غير متاحة في الفرع المصدر المحدد`);
    }
  }

  const existingStandaloneTransfer = await StockTransfer.findOne({
    tenant: tenantId,
    requestType: STANDALONE_TRANSFER_REQUEST_TYPE,
    order: null,
    fromBranch: fromBranch._id,
    toBranch: toBranch._id,
    status: { $in: ALLOWED_ACTIVE_TRANSFER_STATUSES },
    'items.product': { $in: normalizedItems.map((item) => item.payload.product) },
  }).select('_id transferNumber');

  if (existingStandaloneTransfer) {
    throw AppError.conflict(`يوجد طلب تزويد نشط بالفعل (${existingStandaloneTransfer.transferNumber}) لنفس الصنف بين هذين الفرعين`);
  }

  return {
    fromBranch,
    toBranch,
    items: normalizedItems.map((item) => item.payload),
  };
}

class StockTransferController {
  list = catchAsync(async (req, res) => {
    const filter = { tenant: req.tenantId, ...buildTransferVisibilityFilter(req.user) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.fromBranch) filter.fromBranch = req.query.fromBranch;
    if (req.query.toBranch) filter.toBranch = req.query.toBranch;

    const transfers = await StockTransfer.find(filter)
      .populate('fromBranch', 'name')
      .populate('toBranch', 'name')
      .populate('order', 'invoiceNumber orderStatus fulfillmentStatus')
      .sort({ createdAt: -1 })
      .lean();

    ApiResponse.success(res, transfers);
  });

  getById = catchAsync(async (req, res, next) => {
    const transfer = await StockTransfer.findOne({
      _id: req.params.id,
      tenant: req.tenantId,
      ...buildTransferVisibilityFilter(req.user),
    })
      .populate('fromBranch', 'name manager')
      .populate('toBranch', 'name manager')
      .populate('createdBy', 'name')
      .populate('order', 'invoiceNumber orderStatus fulfillmentStatus')
      .lean();

    if (!transfer) return next(AppError.notFound('طلب التحويل غير موجود'));
    ApiResponse.success(res, transfer);
  });

  create = catchAsync(async (req, res, next) => {
    const { orderId, fromBranchId, toBranchId, items, notes } = req.body || {};

    const accessibleBranchIds = getAccessibleBranchIds(req.user);
    const canCreateForAnyBranch = Boolean(
      req.user?.isSuperAdmin
      || req.user?.role === 'admin'
      || req.user?.branchAccessMode === 'all_branches'
    );

    if (!toBranchId) {
      return next(AppError.badRequest('فرع الاستلام مطلوب'));
    }

    if (!canCreateForAnyBranch && accessibleBranchIds.length > 0 && !accessibleBranchIds.includes(toIdString(toBranchId))) {
      return next(AppError.forbidden('يمكنك إنشاء طلبات التزويد للفروع المرتبطة بك فقط'));
    }

    let invoice = null;
    let fromBranch = null;
    let toBranch = null;
    let payloadItems = [];
    let requestType = 'order_transfer';

    if (orderId) {
      if (!fromBranchId) {
        return next(AppError.badRequest('بيانات التحويل غير مكتملة'));
      }

      if (toIdString(fromBranchId) === toIdString(toBranchId)) {
        return next(AppError.badRequest('فرع الإرسال والاستلام يجب أن يكونا مختلفين'));
      }

      invoice = await Invoice.findOne({ _id: orderId, tenant: req.tenantId });
      if (!invoice) return next(AppError.notFound('الطلب غير موجود'));

      const existingTransfer = await StockTransfer.findOne({
        tenant: req.tenantId,
        order: invoice._id,
        status: { $in: ALLOWED_ACTIVE_TRANSFER_STATUSES },
      });
      if (existingTransfer) {
        return next(AppError.conflict('يوجد طلب تحويل نشط مرتبط بهذا الطلب بالفعل'));
      }

      [fromBranch, toBranch] = await Promise.all([
        Branch.findOne({ _id: fromBranchId, tenant: req.tenantId, isActive: true }).select('name manager'),
        Branch.findOne({ _id: toBranchId, tenant: req.tenantId, isActive: true }).select('name manager'),
      ]);

      if (!fromBranch || !toBranch) {
        return next(AppError.badRequest('أحد الفروع المحددة غير متاح'));
      }

      const fulfillment = await analyzeInvoiceFulfillment(invoice);
      const shortageItems = fulfillment.items.filter((item) => Number(item.shortageQty) > 0);
      payloadItems = Array.isArray(items) && items.length > 0
        ? items
        : shortageItems
            .filter((item) => toIdString(item.bestSourceBranch?.branchId || item.sourceOptions?.[0]?.branchId) === toIdString(fromBranchId))
            .map((item) => ({
              product: item.productId,
              variant: item.variantId,
              productName: item.productName,
              sku: item.sku,
              requestedQty: item.shortageQty,
            }));

      if (!payloadItems.length) {
        return next(AppError.badRequest('لا توجد نواقص قابلة للتحويل من هذا الفرع'));
      }
    } else {
      requestType = STANDALONE_TRANSFER_REQUEST_TYPE;
      try {
        const standaloneTransfer = await buildStandaloneTransferItems({
          tenantId: req.tenantId,
          fromBranchId,
          toBranchId,
          items,
        });
        fromBranch = standaloneTransfer.fromBranch;
        toBranch = standaloneTransfer.toBranch;
        payloadItems = standaloneTransfer.items;
      } catch (error) {
        return next(error);
      }
    }

    const transfer = await StockTransfer.create({
      tenant: req.tenantId,
      requestType,
      order: invoice?._id || null,
      fromBranch: fromBranch._id,
      toBranch: toBranch._id,
      createdBy: req.user?._id || null,
      status: 'requested',
      notes: notes || '',
      items: payloadItems.map((item) => ({
        product: item.product,
        variant: item.variant || null,
        productName: item.productName,
        sku: item.sku || '',
        requestedQty: Math.max(1, Number(item.requestedQty) || 0),
      })),
      timeline: [{
        status: 'requested',
        at: new Date(),
        note: notes || (requestType === STANDALONE_TRANSFER_REQUEST_TYPE ? 'تم إنشاء طلب تزويد مباشر' : 'تم إنشاء طلب التحويل'),
        actor: req.user?._id || null,
      }],
    });

    if (invoice) {
      invoice.transferRequest = transfer._id;
      invoice.fulfillmentBranch = invoice.fulfillmentBranch || toBranch._id;
      invoice.fulfillmentStatus = 'awaiting_stock_transfer';
      invoice.orderStatusHistory = invoice.orderStatusHistory || [];
      invoice.orderStatusHistory.push({
        status: invoice.orderStatus,
        date: new Date(),
        note: `تم إنشاء طلب تحويل ${transfer.transferNumber} من ${fromBranch.name} إلى ${toBranch.name}`,
      });
      await invoice.save({ validateBeforeSave: false });
    }

    await notifyTransferUsers({
      tenantId: req.tenantId,
      branch: fromBranch,
      title: requestType === STANDALONE_TRANSFER_REQUEST_TYPE ? 'طلب تزويد مباشر جديد' : 'طلب تحويل جديد',
      message: requestType === STANDALONE_TRANSFER_REQUEST_TYPE
        ? `تم إنشاء طلب تزويد مباشر من ${fromBranch.name} إلى ${toBranch.name}`
        : `طلب تحويل جديد للطلب #${invoice.invoiceNumber} باتجاه ${toBranch.name}`,
      link: `/stock-transfers/${transfer._id}`,
      ...getTransferRelatedPayload(invoice, transfer),
    });

    ApiResponse.created(
      res,
      transfer,
      requestType === STANDALONE_TRANSFER_REQUEST_TYPE ? 'تم إنشاء طلب التزويد' : 'تم إنشاء طلب التحويل'
    );
  });

  updateStatus = catchAsync(async (req, res, next) => {
    const { status, notes, rejectionReason, issueType, issueNotes, trackingReference, items } = req.body || {};

    const transfer = await StockTransfer.findOne({
      _id: req.params.id,
      tenant: req.tenantId,
      ...buildTransferVisibilityFilter(req.user),
    });
    if (!transfer) return next(AppError.notFound('طلب التحويل غير موجود'));

    const allowedNextStatuses = STATUS_TRANSITIONS[transfer.status] || [];
    if (!status || !allowedNextStatuses.includes(status)) {
      return next(AppError.badRequest('الانتقال المطلوب في حالة التحويل غير مسموح'));
    }

    try {
      assertTransferStatusPermission(req.user, transfer, status);
    } catch (error) {
      return next(error);
    }

    const invoice = transfer.order
      ? await Invoice.findOne({ _id: transfer.order, tenant: req.tenantId })
      : null;
    if (transfer.order && !invoice) return next(AppError.notFound('الطلب المرتبط بالتحويل غير موجود'));

    const uniqueProductIds = [...new Set((transfer.items || []).map((item) => toIdString(item.product)).filter(Boolean))];
    const products = await Product.find({
      _id: { $in: uniqueProductIds },
      tenant: req.tenantId,
    });
    const productMap = new Map(products.map((product) => [toIdString(product._id), product]));

    if (status === 'rejected') {
      if (!rejectionReason) return next(AppError.badRequest('سبب الرفض مطلوب'));
      transfer.rejectionReason = rejectionReason;
      if (invoice) {
        invoice.fulfillmentStatus = 'pending_review';
        invoice.transferRequest = null;
      }
    }

    if (status === 'prepared') {
      transfer.trackingReference = trackingReference || transfer.trackingReference || '';
    }

    if ((status === 'in_transit' || status === 'partially_received' || status === 'fully_received') && !transfer.stockDeductedAt) {
      for (const item of transfer.items || []) {
        const product = productMap.get(toIdString(item.product));
        if (!product) {
          return next(AppError.badRequest(`المنتج ${item.productName} غير موجود حاليًا`));
        }
        const variant = item.variant && product.variants?.id ? product.variants.id(item.variant) : null;
        const availableQty = getBranchAvailableQuantity({
          product,
          variant,
          branchId: transfer.fromBranch,
          channel: 'pos',
        });
        const quantityToShip = Math.max(0, Number(item.requestedQty) || 0);

        if (availableQty < quantityToShip) {
          return next(AppError.badRequest(`الكمية المطلوبة من ${item.productName} لم تعد متاحة بالكامل في الفرع المرسل`));
        }

        adjustProductInventory({
          product,
          variant,
          branchId: transfer.fromBranch,
          quantityDelta: -quantityToShip,
        });
        item.shippedQty = quantityToShip;
        await product.save({ validateBeforeSave: false });
      }

      transfer.stockDeductedAt = new Date();
      if (status === 'in_transit') {
        if (invoice) {
          invoice.fulfillmentStatus = 'transfer_in_progress';
        }
      }
    }

    if (status === 'partially_received' || status === 'fully_received') {
      const itemUpdates = normalizeReceiptUpdateMap(transfer.items || [], Array.isArray(items) ? items : []);

      for (const item of transfer.items || []) {
        const product = productMap.get(toIdString(item.product));
        if (!product) continue;
        const variant = item.variant && product.variants?.id ? product.variants.id(item.variant) : null;
        const itemKey = buildTransferItemKey(item.product, item.variant);
        const targetReceivedQty = status === 'fully_received'
          ? Math.max(Number(item.shippedQty || item.requestedQty || 0), itemUpdates.get(itemKey) || 0)
          : (itemUpdates.has(itemKey) ? itemUpdates.get(itemKey) : Number(item.receivedQty || 0));
        const nextReceivedQty = Math.min(
          Math.max(0, Number(item.shippedQty || item.requestedQty || 0)),
          targetReceivedQty
        );
        const delta = Math.max(0, nextReceivedQty - Number(item.receivedQty || 0));

        if (delta > 0) {
          adjustProductInventory({
            product,
            variant,
            branchId: transfer.toBranch,
            quantityDelta: delta,
          });
          await product.save({ validateBeforeSave: false });
        }

        item.receivedQty = nextReceivedQty;
        item.issueQty = Math.max(0, Number(item.shippedQty || item.requestedQty || 0) - nextReceivedQty);
      }

      transfer.issueType = issueType || transfer.issueType || '';
      transfer.issueNotes = issueNotes || transfer.issueNotes || '';
      transfer.stockReceivedAt = new Date();

      if (invoice) {
        invoice.fulfillmentStatus = status === 'fully_received'
          ? 'ready_for_shipping'
          : 'partial_receipt_review';
      }
    }

    if (status === 'cancelled') {
      if (invoice) {
        invoice.fulfillmentStatus = 'pending_review';
        invoice.transferRequest = null;
      }
    }

    transfer.status = status;
    transfer.reminders = {
      overdueSince: null,
      lastOverdueReminderAt: null,
      lastOverdueStatus: null,
    };
    if (notes) transfer.notes = notes;
    if (trackingReference) transfer.trackingReference = trackingReference;
    appendTimeline(transfer, status, notes || rejectionReason || issueNotes || '', req.user?._id || null);

    await transfer.save({ validateBeforeSave: false });

    if (invoice) {
      invoice.orderStatusHistory = invoice.orderStatusHistory || [];
      invoice.orderStatusHistory.push({
        status: invoice.orderStatus,
        date: new Date(),
        note: `تحديث طلب التحويل ${transfer.transferNumber} إلى ${status}`,
      });
      await invoice.save({ validateBeforeSave: false });
    }

    const [fromBranch, toBranch] = await Promise.all([
      Branch.findById(transfer.fromBranch).select('name manager'),
      Branch.findById(transfer.toBranch).select('name manager'),
    ]);

    if (status === 'rejected' && fromBranch) {
      await notifyTransferUsers({
        tenantId: req.tenantId,
        branch: toBranch,
        title: 'تم رفض طلب تحويل',
        message: `الفرع ${fromBranch.name} رفض طلب التحويل ${transfer.transferNumber}`,
        link: `/stock-transfers/${transfer._id}`,
        ...getTransferRelatedPayload(invoice, transfer),
      });
    }

    if (status === 'in_transit' && toBranch) {
      await notifyTransferUsers({
        tenantId: req.tenantId,
        branch: toBranch,
        title: 'تحويل في الطريق',
        message: `التحويل ${transfer.transferNumber} أصبح في الطريق إلى ${toBranch.name}`,
        link: `/stock-transfers/${transfer._id}`,
        ...getTransferRelatedPayload(invoice, transfer),
      });
    }

    ApiResponse.success(res, transfer, 'تم تحديث حالة التحويل');
  });
}

module.exports = new StockTransferController();
