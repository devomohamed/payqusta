/**
 * Invoice Controller — Sales, Installments & Payment Processing
 * Core business logic for invoice creation, payment, and WhatsApp notifications
 */

const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Branch = require('../models/Branch');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const InvoiceService = require('../services/InvoiceService');
const Helpers = require('../utils/helpers');
const WhatsAppService = require('../services/WhatsAppService');
const NotificationService = require('../services/NotificationService');
const GamificationService = require('../services/GamificationService');
const ShippingService = require('../services/ShippingService');
const { analyzeInvoiceFulfillment } = require('../services/FulfillmentService');
const refundService = require('../services/RefundService');
const catchAsync = require('../utils/catchAsync');
const { PAYMENT_METHODS, INVOICE_STATUS } = require('../config/constants');
const {
  cancelInvoiceOrder,
  completeInvoiceReturn,
} = require('../utils/orderLifecycle');

const ORDER_SHIPPING_STATUS_MAP = {
  pending: 'pending',
  confirmed: 'pending',
  processing: 'pending',
  shipped: 'in_transit',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

const SHIPPING_STATUS_ORDER_MAP = {
  pending: null,
  created: 'processing',
  picked_up: 'shipped',
  in_transit: 'shipped',
  delivered: 'delivered',
  returned: 'cancelled',
  cancelled: 'cancelled',
};

const ORDER_STATUS_RANK = {
  pending: 1,
  confirmed: 2,
  processing: 3,
  shipped: 4,
  delivered: 5,
  cancelled: 5,
};

const tokensMatch = (providedToken, storedToken) => {
  if (!providedToken || !storedToken) return false;

  const provided = Buffer.from(String(providedToken));
  const stored = Buffer.from(String(storedToken));

  if (provided.length !== stored.length) return false;

  return crypto.timingSafeEqual(provided, stored);
};

const secretsMatch = (providedSecret, configuredSecret) => {
  if (!configuredSecret) return true;
  return tokensMatch(String(providedSecret || ''), String(configuredSecret));
};

const applyOrderStatusMetadata = (invoice, orderStatus) => {
  invoice.orderStatus = orderStatus;

  if (orderStatus === 'delivered' && !invoice.deliveredAt) {
    invoice.deliveredAt = new Date();
  }

  if (orderStatus === 'cancelled' && !invoice.cancelledAt) {
    invoice.cancelledAt = new Date();
  }

  if (invoice.shippingDetails) {
    const mappedShippingStatus = ORDER_SHIPPING_STATUS_MAP[orderStatus];
    const currentShippingStatus = invoice.shippingDetails.status;
    const shouldSyncShippingStatus =
      !currentShippingStatus ||
      currentShippingStatus === 'pending' ||
      (orderStatus === 'delivered' && currentShippingStatus !== 'returned') ||
      (orderStatus === 'cancelled' && ['pending', 'created'].includes(currentShippingStatus));

    if (mappedShippingStatus && shouldSyncShippingStatus) {
      invoice.shippingDetails.status = mappedShippingStatus;
    }
  }
};

const resolveOrderStatusFromShippingStatus = (shippingStatus, currentOrderStatus = 'pending') => {
  const nextOrderStatus = SHIPPING_STATUS_ORDER_MAP[shippingStatus];
  if (!nextOrderStatus) return currentOrderStatus;

  const currentRank = ORDER_STATUS_RANK[currentOrderStatus] || 0;
  const nextRank = ORDER_STATUS_RANK[nextOrderStatus] || 0;

  return nextRank >= currentRank ? nextOrderStatus : currentOrderStatus;
};

const syncInvoiceShippingState = (
  invoice,
  {
    provider = 'bosta',
    shippingStatus,
    rawStatus,
    shipmentId,
    trackingNumber,
    trackingUrl,
    note,
  } = {}
) => {
  invoice.shippingDetails = invoice.shippingDetails || {};
  invoice.shippingDetails.provider = provider || invoice.shippingDetails.provider || 'manual';

  if (shippingStatus) {
    invoice.shippingDetails.status = shippingStatus;
  }

  if (trackingNumber) {
    invoice.trackingNumber = trackingNumber;
    invoice.shippingDetails.waybillNumber = trackingNumber;
  }

  if (trackingUrl) {
    invoice.shippingDetails.trackingUrl = trackingUrl;
  }

  if (shipmentId) {
    invoice.shipmentId = shipmentId;
  }

  const nextOrderStatus = resolveOrderStatusFromShippingStatus(shippingStatus, invoice.orderStatus);
  applyOrderStatusMetadata(invoice, nextOrderStatus);

  if (note || rawStatus) {
    invoice.orderStatusHistory = invoice.orderStatusHistory || [];
    invoice.orderStatusHistory.push({
      status: invoice.orderStatus,
      date: new Date(),
      note: note || `تحديث حالة الشحن: ${rawStatus || shippingStatus}`,
    });
  }
};

const buildShipmentAttemptSummary = (deliveryData = {}) => ({
  address: String(deliveryData.address || '').slice(0, 300),
  city: String(deliveryData.city || '').slice(0, 80),
  governorate: String(deliveryData.governorate || '').slice(0, 80),
  pickupBranchName: String(deliveryData.pickupBranchName || '').slice(0, 120),
  itemsCount: Number(deliveryData.itemsCount) || 0,
  reference: String(deliveryData.reference || '').slice(0, 80),
});

const toPublicOrderPayload = (invoice) => ({
  id: invoice._id,
  invoiceId: invoice._id,
  invoiceNumber: invoice.invoiceNumber,
  orderNumber: invoice.invoiceNumber,
  status: invoice.orderStatus,
  orderStatus: invoice.orderStatus,
  createdAt: invoice.createdAt,
  subtotal: invoice.subtotal,
  taxAmount: invoice.taxAmount,
  discount: invoice.discount,
  shippingFee: invoice.shippingFee,
  shippingDiscount: invoice.shippingDiscount,
  total: invoice.totalAmount,
  totalAmount: invoice.totalAmount,
  paymentMethod: invoice.paymentMethod,
  shippingMethod: invoice.shippingMethod,
  shippingStatus: invoice.shippingDetails?.status || null,
  trackingNumber: invoice.trackingNumber || invoice.shippingDetails?.waybillNumber || null,
  trackingUrl: invoice.shippingDetails?.trackingUrl || null,
  estimatedDeliveryDate: invoice.estimatedDeliveryDate || null,
  deliveredAt: invoice.deliveredAt || null,
  cancelledAt: invoice.cancelledAt || null,
  returnStatus: invoice.returnStatus || 'none',
  refundStatus: invoice.refundStatus || 'none',
  refundAmount: invoice.refundAmount || 0,
  shippingAddress: invoice.shippingAddress || null,
  customer: {
    phone: invoice.shippingAddress?.phone || invoice.customer?.phone || null,
    address: invoice.shippingAddress?.address || invoice.customer?.address || null,
  },
  items: (invoice.items || []).map((item) => ({
    name: item.productName || item.product?.name || 'منتج',
    quantity: item.quantity,
    price: item.unitPrice,
    totalPrice: item.totalPrice,
    image: item.product?.image || item.product?.images?.[0] || null,
  })),
  orderStatusHistory: invoice.orderStatusHistory || [],
});

const firstNonEmptyValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const extractWebhookShippingPayload = (payload = {}) => {
  const nestedData = payload.data || payload.delivery || payload.shipment || {};
  const nestedState = payload.state || nestedData.state || {};

  const trackingNumber = firstNonEmptyValue(
    payload.trackingNumber,
    payload.tracking_number,
    payload.waybillNumber,
    payload.waybill_number,
    payload.tracking_num,
    nestedData.trackingNumber,
    nestedData.tracking_number,
    nestedData.waybillNumber,
    nestedData.tracking_num
  );

  const shipmentId = firstNonEmptyValue(
    payload.shipmentId,
    payload.shipment_id,
    payload.deliveryId,
    payload.delivery_id,
    payload._id,
    nestedData.shipmentId,
    nestedData.shipment_id,
    nestedData.deliveryId,
    nestedData.delivery_id,
    nestedData._id
  );

  const reference = firstNonEmptyValue(
    payload.reference,
    payload.orderNumber,
    payload.order_number,
    payload.invoiceNumber,
    payload.invoice_number,
    nestedData.reference,
    nestedData.orderNumber,
    nestedData.order_number,
    nestedData.invoiceNumber,
    nestedData.invoice_number
  );

  const rawStatus = firstNonEmptyValue(
    payload.rawStatus,
    payload.status,
    payload.currentStatus,
    nestedState.value,
    nestedData.status,
    nestedData.currentStatus
  );

  const trackingUrl = firstNonEmptyValue(
    payload.trackingUrl,
    payload.tracking_url,
    nestedData.trackingUrl,
    nestedData.tracking_url
  );

  return {
    shipmentId,
    trackingNumber,
    reference,
    rawStatus,
    trackingUrl,
  };
};

class InvoiceController {
  /**
   * GET /api/v1/invoices
   * Get all invoices with pagination and filtering
   */
  getAll = catchAsync(async (req, res, next) => {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      orderStatus,
      fulfillmentStatus,
      fulfillmentBranch,
      source,
      customerId,
      startDate,
      endDate,
      sortBy = '-createdAt',
      branch,
    } = req.query;

    const filter = { ...req.tenantFilter };

    // Filter by customer
    if (customerId) filter.customer = customerId;
    // Filter by branch
    if (branch) filter.branch = branch;
    // Filter by payment status
    if (status) filter.status = status;
    // Filter by source (e.g., 'portal,online_store')
    if (source) filter.source = { $in: source.split(',') };
    // Filter by order tracking status
    if (orderStatus) filter.orderStatus = orderStatus;
    // Filter by fulfillment status
    if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus;
    // Filter by fulfillment branch
    if (fulfillmentBranch) filter.fulfillmentBranch = fulfillmentBranch;

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search by invoice number or customer name/phone
    if (search) {
      // Find matching customers first
      const matchingCustomers = await Customer.find({
        ...req.tenantFilter,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();

      const customerIds = matchingCustomers.map(c => c._id);

      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
        ...(customerIds.length > 0 ? [{ customer: { $in: customerIds } }] : [])
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('customer', 'name phone balance creditLimit')
        .populate('createdBy', 'name')
        .populate('branch', 'name')
        .populate('fulfillmentBranch', 'name')
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    ApiResponse.success(res, {
      invoices,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  /**
   * GET /api/v1/invoices/:id
   * Get a single invoice by ID
   */
  getById = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    })
      .populate('customer', 'name phone address whatsapp balance creditLimit')
      .populate('createdBy', 'name')
      .populate('branch', 'name')
      .populate('fulfillmentBranch', 'name')
      .populate('shipmentFailure.dismissedBy', 'name')
      .populate('items.product', 'name barcode internationalBarcode internationalBarcodeType localBarcode localBarcodeType')
      .lean();

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    ApiResponse.success(res, invoice);
  });

  /**
   * GET /api/v1/invoices/:id/fulfillment-analysis
   * Analyze Branch X availability and recommend one-source transfer candidates
   */
  getFulfillmentAnalysis = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    })
      .populate('customer', 'name phone')
      .populate('branch', 'name')
      .lean(false);

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    const analysis = await analyzeInvoiceFulfillment(invoice);
    ApiResponse.success(res, analysis);
  });

  /**
   * GET /api/v1/orders/:id/confirmation?token=...
   * Safe public order confirmation endpoint for storefront guest orders
   */
  getPublicOrderConfirmation = catchAsync(async (req, res, next) => {
    const token = String(req.query.token || '').trim();
    if (!token) return next(AppError.badRequest('رابط متابعة الطلب غير مكتمل'));

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      source: 'online_store',
      ...req.tenantFilter,
    })
      .populate('customer', 'phone address')
      .populate('items.product', 'name image images')
      .lean();

    if (!invoice || !tokensMatch(token, invoice.guestTrackingToken)) {
      return next(AppError.notFound('الطلب غير موجود'));
    }

    ApiResponse.success(res, {
      ...toPublicOrderPayload(invoice),
      guestTrackingToken: invoice.guestTrackingToken,
    });
  });

  /**
   * GET /api/v1/orders/track?orderNumber=...&token=...
   * Safe public order tracking endpoint for storefront guest orders
   */
  trackPublicOrder = catchAsync(async (req, res, next) => {
    const orderNumber = String(req.query.orderNumber || '').trim();
    const token = String(req.query.token || '').trim();

    if (!orderNumber || !token) {
      return next(AppError.badRequest('رقم الطلب ورمز التتبع مطلوبان'));
    }

    const invoice = await Invoice.findOne({
      invoiceNumber: orderNumber,
      source: 'online_store',
      ...req.tenantFilter,
    })
      .populate('customer', 'phone address')
      .populate('items.product', 'name image images')
      .lean();

    if (!invoice || !tokensMatch(token, invoice.guestTrackingToken)) {
      return next(AppError.notFound('الطلب غير موجود'));
    }

    ApiResponse.success(res, toPublicOrderPayload(invoice));
  });

  /**
   * POST /api/v1/shipping/webhooks/bosta
   * Provider webhook endpoint to sync shipment status back into the order
   */
  handleBostaWebhook = catchAsync(async (req, res, next) => {
    const configuredSecret = process.env.BOSTA_WEBHOOK_SECRET;
    const providedSecret = firstNonEmptyValue(
      req.headers['x-bosta-webhook-secret'],
      req.headers['x-webhook-secret'],
      req.query.secret,
      req.body?.secret
    );

    if (!secretsMatch(providedSecret, configuredSecret)) {
      return next(AppError.forbidden('Webhook غير مصرح به'));
    }

    const { shipmentId, trackingNumber, reference, rawStatus, trackingUrl } = extractWebhookShippingPayload(req.body);

    if (!shipmentId && !trackingNumber && !reference) {
      return next(AppError.badRequest('بيانات الشحنة غير مكتملة'));
    }

    const lookupFilters = [];
    if (trackingNumber) {
      lookupFilters.push({ trackingNumber });
      lookupFilters.push({ 'shippingDetails.waybillNumber': trackingNumber });
    }
    if (shipmentId) {
      lookupFilters.push({ shipmentId });
    }
    if (reference) {
      lookupFilters.push({ invoiceNumber: reference });
    }

    const invoice = await Invoice.findOne({ $or: lookupFilters });

    if (!invoice) {
      return ApiResponse.success(res, { ignored: true }, 'لم يتم العثور على طلب مطابق لهذه الشحنة');
    }

    const shippingStatus = ShippingService.normalizeTrackingStatus(rawStatus);

    syncInvoiceShippingState(invoice, {
      provider: 'bosta',
      shippingStatus,
      rawStatus,
      shipmentId,
      trackingNumber,
      trackingUrl,
      note: `تحديث تلقائي من Bosta: ${rawStatus || shippingStatus}`,
    });

    if (shippingStatus === 'returned') {
      const completion = await completeInvoiceReturn(
        invoice,
        (invoice.items || []).map((item) => ({
          productId: item.product,
          variantId: item.variant || null,
          quantity: item.quantity,
        })),
        {
          reason: 'returned',
          note: `تحديث تلقائي من Bosta: ${rawStatus || shippingStatus}`,
          cancelOrder: true,
        }
      );

      if (completion.refundAmount > 0) {
        await refundService.refundInvoicePayments(invoice, {
          amount: completion.refundAmount,
          reason: 'Returned shipment refund',
          metadata: {
            source: 'shipping_webhook',
            provider: 'bosta',
            trackingNumber,
          },
        });
      }
    }

    await invoice.save({ validateBeforeSave: false });

    ApiResponse.success(
      res,
      {
        invoiceId: invoice._id,
        orderStatus: invoice.orderStatus,
        shippingStatus: invoice.shippingDetails?.status,
        trackingNumber: invoice.trackingNumber,
      },
      'تمت مزامنة حالة الشحنة بنجاح'
    );
  });

  create = catchAsync(async (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(AppError.badRequest('يجب إرسال بيانات الفاتورة'));
    }
    const invoice = await InvoiceService.createInvoice(req.tenantId, req.user?._id, req.body);
    ApiResponse.created(res, invoice, 'تم إنشاء الفاتورة بنجاح');
  });

  // ...

  /**
   * POST /api/v1/invoices/:id/pay
   * Record a payment against an invoice
   */
  recordPayment = catchAsync(async (req, res, next) => {
    const { amount, method = 'cash', reference, notes } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    }).populate('customer');

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    if (invoice.status === INVOICE_STATUS.PAID) {
      return next(AppError.badRequest('الفاتورة مدفوعة بالكامل'));
    }

    if (amount > invoice.remainingAmount) {
      return next(AppError.badRequest(`المبلغ أكبر من المتبقي (${invoice.remainingAmount})`));
    }

    // Record payment
    invoice.recordPayment(amount, method, req.user._id, reference);
    await invoice.save();

    // Update customer financials
    const customer = await Customer.findById(invoice.customer._id);
    if (customer) {
      const isOnTime = !invoice.installments.some(
        (i) => i.status === 'overdue'
      );
      customer.recordPayment(amount, isOnTime);
      await customer.save();

      // In-app notification
      NotificationService.onPaymentReceived(req.tenantId, invoice, amount, customer.name).catch(() => { });

      // WhatsApp payment confirmation (non-blocking) — respects customer preferences
      if (customer.whatsapp?.enabled && customer.whatsapp?.notifications?.payments !== false) {
        // Need to get tenant config
        const tenant = await require('../models/Tenant').findById(req.tenantId);
        const whatsappPhone = customer.whatsapp?.number || customer.phone;
        if (whatsappPhone && tenant?.whatsapp) {
          WhatsAppService.sendPaymentReceivedTemplate(
            whatsappPhone, customer, amount, invoice.remainingAmount, invoice.invoiceNumber, tenant.whatsapp
          ).catch(() => { });
        }
      }
    }

    ApiResponse.success(res, invoice, 'تم تسجيل الدفعة بنجاح');
  });

  /**
   * POST /api/v1/invoices/:id/pay-all
   * Pay all remaining balance at once (سداد كامل)
   */
  payAll = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    });

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    if (invoice.status === INVOICE_STATUS.PAID) {
      return next(AppError.badRequest('الفاتورة مدفوعة بالكامل'));
    }

    // Capture remaining amount BEFORE calling payAllRemaining (it sets it to 0)
    const amountBeingPaid = invoice.remainingAmount;

    invoice.payAllRemaining(req.user._id);
    await invoice.save();

    // Update customer with the correct amount that was paid
    const customer = await Customer.findById(invoice.customer);
    if (customer && amountBeingPaid > 0) {
      customer.recordPayment(amountBeingPaid, true);
      await customer.save();
    }

    ApiResponse.success(res, invoice, 'تم سداد كامل المبلغ المتبقي');
  });

  /**
   * GET /api/v1/invoices/overdue
   * Get all overdue invoices
   */
  getOverdue = catchAsync(async (req, res, next) => {
    const invoices = await Invoice.getOverdueInvoices(req.tenantId);
    ApiResponse.success(res, invoices);
  });

  /**
   * GET /api/v1/invoices/upcoming-installments
   * Get installments due within specified days
   */
  getUpcomingInstallments = catchAsync(async (req, res, next) => {
    const days = parseInt(req.query.days, 10) || 7;
    const invoices = await Invoice.getUpcomingInstallments(req.tenantId, days);

    // Flatten installments with invoice and customer info
    const upcoming = [];
    invoices.forEach((inv) => {
      inv.installments
        .filter((inst) => ['pending', 'overdue'].includes(inst.status))
        .forEach((inst) => {
          upcoming.push({
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customer,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            paidAmount: inst.paidAmount,
            dueDate: inst.dueDate,
            status: inst.status,
            invoiceTotal: inv.totalAmount,
            invoicePaid: inv.paidAmount,
            invoiceRemaining: inv.remainingAmount,
          });
        });
    });

    upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    ApiResponse.success(res, upcoming);
  });

  /**
   * POST /api/v1/invoices/:id/send-whatsapp
   * Send invoice details via WhatsApp
   */
  sendWhatsApp = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    }).populate('customer', 'name phone whatsapp');

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    const phone = invoice.customer.whatsapp?.number || invoice.customer.phone;

    // Non-blocking WhatsApp send with short timeout
    // We wrap this in try-catch internally if we want specific error handling,
    // but catchAsync will handle unexpected errors.
    // However, the original code had a specific 'success' response even on error.

    try {
      const tenant = await require('../models/Tenant').findById(req.tenantId);
      const result = await WhatsAppService.sendInvoiceNotification(phone, invoice, invoice.customer, tenant?.whatsapp);

      if (result && !result.failed && !result.skipped) {
        invoice.whatsappSent = true;
        invoice.whatsappSentAt = new Date();
        await invoice.save();
        ApiResponse.success(res, null, 'تم إرسال الفاتورة عبر WhatsApp');
      } else {
        // WhatsApp failed but don't crash — inform user
        ApiResponse.success(res, { whatsappStatus: 'failed', reason: result?.error || result?.reason || 'unknown' },
          'تعذر الإرسال عبر WhatsApp — تحقق من اتصال الإنترنت أو إعدادات API');
      }
    } catch (error) {
      // Don't crash, just inform
      ApiResponse.success(res, { whatsappStatus: 'error' },
        'تعذر الإرسال — خطأ في اتصال WhatsApp');
    }
  });

  /**
   * GET /api/v1/invoices/sales-summary
   */
  getSalesSummary = catchAsync(async (req, res, next) => {
    const period = parseInt(req.query.period, 10) || 30;
    const summary = await Invoice.getSalesSummary(req.tenantId, period);

    ApiResponse.success(res, summary);
  });



  /**
   * POST /api/v1/invoices/:id/shipping/bosta
   * Create Bosta Waybill
   */
  createBostaWaybill = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.tenantFilter }).populate('customer');
    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    if (invoice.shippingDetails?.waybillNumber) {
      return next(AppError.badRequest('يوجد بوليصة شحن مسجلة بالفعل لهذه الفاتورة'));
    }

    const requestedPickupBranchId = req.body?.pickupBranchId || req.body?.fulfillmentBranchId || null;
    let pickupBranch = null;

    if (requestedPickupBranchId) {
      pickupBranch = await Branch.findOne({
        _id: requestedPickupBranchId,
        tenant: req.tenantId,
        isActive: true,
      }).lean();

      if (!pickupBranch) {
        return next(AppError.badRequest('فرع استلام الشحنة غير موجود أو غير متاح'));
      }

      if (!pickupBranch.pickupEnabled) {
        return next(AppError.badRequest('هذا الفرع غير متاح لاستلام شركة الشحن'));
      }

      invoice.fulfillmentBranch = pickupBranch._id;
    } else if (invoice.fulfillmentBranch) {
      pickupBranch = await Branch.findOne({
        _id: invoice.fulfillmentBranch,
        tenant: req.tenantId,
        isActive: true,
      }).lean();
    }

    // Default to invoice shipping address or customer address
    const customer = invoice.customer;
    const addr = invoice.shippingAddress || {};

    // Attempt to parse out basic delivery details
    const deliveryData = {
      itemsCount: invoice.items.reduce((s, i) => s + i.quantity, 0),
      description: `طلب رقم ${invoice.invoiceNumber}`,
      notes: invoice.notes || addr.notes || '',
      cod: invoice.remainingAmount, // Collect Cash on Delivery for pending amounts

      address: addr.address || customer.address || 'العنوان غير محدد',
      city: addr.city || 'Cairo', // Default to Cairo if empty, Bosta requires specific mapping
      governorate: addr.governorate || 'Cairo',
      zone: addr.governorate || 'Cairo',

      customerName: addr.fullName || customer.name,
      customerPhone: addr.phone || customer.phone,
      customerEmail: customer.email || 'customer@example.com',
      reference: invoice.invoiceNumber,
      pickupBranchName: pickupBranch?.name || '',
    };

    // We can also let the frontend pass overrides via req.body
    Object.assign(deliveryData, req.body);
    delete deliveryData.pickupBranchId;
    delete deliveryData.fulfillmentBranchId;

    if (pickupBranch) {
      const pickupAddressParts = [
        pickupBranch.shippingOrigin?.addressLine,
        pickupBranch.address,
        pickupBranch.shippingOrigin?.area,
        pickupBranch.shippingOrigin?.city,
        pickupBranch.shippingOrigin?.governorate,
      ].filter(Boolean);

      const pickupNote = `فرع الاستلام: ${pickupBranch.name}${pickupAddressParts.length ? ` - ${pickupAddressParts.join(' / ')}` : ''}`;
      deliveryData.notes = [deliveryData.notes, pickupNote].filter(Boolean).join(' | ');
      deliveryData.pickupBranchName = pickupBranch.name;
    }
    const attemptSummary = buildShipmentAttemptSummary(deliveryData);

    try {
      const bostaRes = await ShippingService.createDelivery(deliveryData);

      // Save back to invoice
      invoice.shippingDetails = {
        provider: 'bosta',
        waybillNumber: bostaRes.trackingNumber, // or deliveryId based on Bosta's response
        trackingUrl: `https://bosta.co/tracking-shipment?tracking_num=${bostaRes.trackingNumber}`,
        status: bostaRes.state || 'created',
      };
      invoice.shippingMethod = invoice.shippingMethod || 'Bosta';
      invoice.shipmentId =
        bostaRes.deliveryId ||
        bostaRes.shipmentId ||
        bostaRes.trackingNumber;
      invoice.trackingNumber = bostaRes.trackingNumber;
      invoice.shipmentFailure = {
        provider: 'bosta',
        lastError: '',
        failedAt: null,
        retryCount: 0,
        lastAttemptAt: new Date(),
        lastAttemptPayloadSummary: attemptSummary,
        dismissedAt: null,
        dismissedBy: null,
        dismissalNote: '',
      };
      syncInvoiceShippingState(invoice, {
        provider: 'bosta',
        shippingStatus: bostaRes.state || 'created',
        rawStatus: bostaRes.state || 'created',
        shipmentId: invoice.shipmentId,
        trackingNumber: bostaRes.trackingNumber,
        trackingUrl: `https://bosta.co/tracking-shipment?tracking_num=${bostaRes.trackingNumber}`,
        note: `Shipment created via Bosta: ${bostaRes.trackingNumber}`,
      });
      await invoice.save();

      ApiResponse.success(res, {
        waybillNumber: bostaRes.trackingNumber,
        trackingUrl: invoice.shippingDetails.trackingUrl,
        status: invoice.shippingDetails.status,
      }, 'Shipment created successfully');
    } catch (error) {
      invoice.shipmentFailure = {
        provider: 'bosta',
        lastError: error.message || 'Shipment creation failed',
        failedAt: new Date(),
        retryCount: Number(invoice.shipmentFailure?.retryCount || 0) + 1,
        lastAttemptAt: new Date(),
        lastAttemptPayloadSummary: attemptSummary,
        dismissedAt: null,
        dismissedBy: null,
        dismissalNote: '',
      };
      invoice.orderStatusHistory = invoice.orderStatusHistory || [];
      invoice.orderStatusHistory.push({
        status: invoice.orderStatus,
        date: new Date(),
        note: `Shipment creation failed: ${invoice.shipmentFailure.lastError}`,
      });
      await invoice.save({ validateBeforeSave: false });

      return next(error);
    }
  });

  /**
   * GET /api/v1/invoices/:id/shipping/bosta/track
   * Track Bosta Waybill
   */
  trackBostaWaybill = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    if (!invoice.shippingDetails || !invoice.shippingDetails.waybillNumber) {
      return next(AppError.badRequest('لا يوجد بوليصة شحن مسجلة لهذه الفاتورة'));
    }

    const { waybillNumber } = invoice.shippingDetails;
    const trackRes = await ShippingService.trackDelivery(waybillNumber);

    // Update DB if status changed
    if (trackRes.status && invoice.shippingDetails.status !== trackRes.status) {
      syncInvoiceShippingState(invoice, {
        provider: 'bosta',
        shippingStatus: trackRes.status,
        rawStatus: trackRes.rawStatus,
        trackingNumber: waybillNumber,
        note: `تحديث حالة الشحن: ${trackRes.rawStatus}`,
      });

      if (trackRes.status === 'returned') {
        invoice.returnStatus = 'received';
        const completion = await completeInvoiceReturn(
          invoice,
          (invoice.items || []).map((item) => ({
            productId: item.product,
            variantId: item.variant || null,
            quantity: item.quantity,
          })),
          {
            reason: 'returned',
            note: `تمت إعادة الشحنة من مزود الشحن: ${trackRes.rawStatus || trackRes.status}`,
            cancelOrder: true,
          }
        );

        if (completion.refundAmount > 0) {
          await refundService.refundInvoicePayments(invoice, {
            amount: completion.refundAmount,
            reason: 'Returned shipment refund',
            metadata: {
              source: 'shipping_track',
              provider: 'bosta',
              trackingNumber: waybillNumber,
            },
          });
        }
      }

      await invoice.save();
    }

    ApiResponse.success(res, {
      waybillNumber,
      status: invoice.shippingDetails.status,
      rawStatus: trackRes.rawStatus,
      history: trackRes.history,
    });
  });

  /**
   * POST /api/v1/invoices/send-whatsapp-message
   * Send custom WhatsApp message(for customer statements, etc.)
   */
  sendWhatsAppMessage = catchAsync(async (req, res, next) => {
    const { phone, message } = req.body;
    if (!phone || !message) return next(AppError.badRequest('رقم الهاتف والرسالة مطلوبين'));

    try {
      const tenant = await require('../models/Tenant').findById(req.tenantId);
      const result = await WhatsAppService.sendMessage(phone, message, tenant?.whatsapp);
      ApiResponse.success(res, { success: result.success }, result.success ? 'تم إرسال الرسالة عبر WhatsApp' : 'فشل إرسال الرسالة');
    } catch (error) {
      // Don't crash, just return failure
      ApiResponse.success(res, { success: false }, 'تعذر الإرسال عبر WhatsApp');
    }
  });

  /**
   * PATCH /api/v1/invoices/:id/order-status
   * Update portal order tracking status
   */
  updateOrderStatus = catchAsync(async (req, res, next) => {
    const { orderStatus, note } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!orderStatus || !allowedStatuses.includes(orderStatus)) {
      return next(AppError.badRequest('حالة الطلب غير صالحة'));
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    let refundExecution = null;

    if (orderStatus === 'cancelled') {
      await cancelInvoiceOrder(invoice, {
        reason: note || 'تم إلغاء الطلب من الإدارة',
        note: note || 'تم إلغاء الطلب من الإدارة',
        restoreInventory: true,
      });

      if ((Number(invoice.refundAmount) || 0) > 0) {
        refundExecution = await refundService.refundInvoicePayments(invoice, {
          reason: note || 'Order cancellation refund',
          userId: req.user._id,
          metadata: {
            source: 'order_cancellation',
            actorId: req.user._id.toString(),
          },
        });
      }
    } else {
      applyOrderStatusMetadata(invoice, orderStatus);
      invoice.orderStatusHistory = invoice.orderStatusHistory || [];
      invoice.orderStatusHistory.push({
        status: orderStatus,
        date: new Date(),
        note: note || `تم التحديث إلى: ${orderStatus}`,
      });
    }

    await invoice.save({ validateBeforeSave: false });

    // Notify customer
    try {
      const labels = { pending: 'قيد الانتظار', confirmed: 'مؤكد', processing: 'جاري التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' };
      const Notification = require('../models/Notification');
      await Notification.create({
        tenant: invoice.tenant,
        customerRecipient: invoice.customer,
        type: 'order',
        title: `تحديث طلبك #${invoice.invoiceNumber}`,
        message: `تم تحديث حالة طلبك إلى: ${labels[orderStatus] || orderStatus}`,
        icon: 'package',
        color: orderStatus === 'delivered' ? 'success' : orderStatus === 'cancelled' ? 'danger' : 'info',
        link: `/portal/orders/${invoice._id}`
      });
    } catch { /* ignore */ }

    ApiResponse.success(res, {
      orderStatus,
      refund: refundExecution ? {
        requestedAmount: refundExecution.requestedAmount,
        executedAmount: refundExecution.executedAmount,
        outstandingAmount: refundExecution.outstandingAmount,
        mode: refundExecution.mode,
      } : null,
    }, 'تم تحديث حالة الطلب');
  });

  /**
   * PATCH /api/v1/invoices/:id/operational-review
   * Resolve address review, partial receipt review, or shipment failure states
   */
  resolveOperationalReview = catchAsync(async (req, res, next) => {
    const { action, note } = req.body || {};
    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!invoice) return next(AppError.notFound('Invoice not found'));

    if (!action) {
      return next(AppError.badRequest('Review action is required'));
    }

    let message = 'Operational review updated';

    if (action === 'resolve_address_review') {
      if (!invoice.addressChangedAfterCheckout && invoice.addressReviewStatus !== 'pending') {
        return next(AppError.badRequest('No pending address review found on this order'));
      }

      invoice.addressChangedAfterCheckout = false;
      invoice.addressReviewStatus = 'resolved';
      invoice.addressReviewNote = String(note || '').trim();
      invoice.orderStatusHistory = invoice.orderStatusHistory || [];
      invoice.orderStatusHistory.push({
        status: invoice.orderStatus,
        date: new Date(),
        note: note || 'Address review resolved by admin',
      });
      message = 'Address review resolved';
    } else if (action === 'mark_partial_receipt_ready') {
      if (invoice.fulfillmentStatus !== 'partial_receipt_review') {
        return next(AppError.badRequest('Order is not in partial receipt review state'));
      }

      invoice.fulfillmentStatus = 'ready_for_shipping';
      invoice.orderStatusHistory = invoice.orderStatusHistory || [];
      invoice.orderStatusHistory.push({
        status: invoice.orderStatus,
        date: new Date(),
        note: note || 'Admin approved the partially received quantity for shipping',
      });
      message = 'Partially received quantity approved for shipping';
    } else if (action === 'dismiss_shipment_failure') {
      if (!invoice.shipmentFailure?.failedAt) {
        return next(AppError.badRequest('No shipment failure is stored on this order'));
      }

      invoice.shipmentFailure.dismissedAt = new Date();
      invoice.shipmentFailure.dismissedBy = req.user?._id || null;
      invoice.shipmentFailure.dismissalNote = String(note || '').trim();
      invoice.orderStatusHistory = invoice.orderStatusHistory || [];
      invoice.orderStatusHistory.push({
        status: invoice.orderStatus,
        date: new Date(),
        note: note || 'Shipment failure alert was dismissed temporarily',
      });
      message = 'Shipment failure alert dismissed';
    } else {
      return next(AppError.badRequest('Unsupported operational review action'));
    }

    await invoice.save({ validateBeforeSave: false });

    ApiResponse.success(res, invoice, message);
  });

  /**
   * POST /api/v1/invoices/:id/refund
   * Retry/process invoice refund for cancelled or returned orders
   */
  processRefund = catchAsync(async (req, res, next) => {
    const { amount, reason } = req.body || {};

    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    const refundExecution = await refundService.refundInvoicePayments(invoice, {
      amount,
      reason: reason || invoice.refundReason || 'Invoice refund',
      userId: req.user._id,
      metadata: {
        source: 'invoice_refund',
        actorId: req.user._id.toString(),
      },
    });

    await invoice.save({ validateBeforeSave: false });

    return ApiResponse.success(res, {
      invoice,
      refund: refundExecution,
    }, refundExecution.executedAmount > 0
      ? 'تم تنفيذ الاسترداد'
      : refundExecution.mode === 'manual'
        ? 'لا توجد معاملة دفع إلكترونية قابلة للاسترداد، ويرجى تنفيذ الاسترداد يدويًا'
        : 'تم تحديث حالة الاسترداد');
  });
}

module.exports = new InvoiceController();
