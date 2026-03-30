/**
 * Invoice Service — Business Logic for Sales & Invoices
 */

const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const AppError = require('../utils/AppError');
const Helpers = require('../utils/helpers');
const {
  buildOnlineBranchCandidateIds,
  collectUniqueBranchIds,
  deductInventoryAllocation,
  getBranchAvailableQuantity,
  getOnlineFulfillmentSettings,
  resolveInventoryAllocation,
} = require('../utils/inventoryAllocation');
const {
  getTenantShippingSettings,
  normalizeInvoiceShippingSummary,
} = require('../utils/shippingHelpers');
const { resolveTenantShippingQuote } = require('../utils/shippingQuoteResolver');
const NotificationService = require('./NotificationService');
const GamificationService = require('./GamificationService');
const WhatsAppService = require('./WhatsAppService');
const { PAYMENT_METHODS, INVOICE_STATUS } = require('../config/constants');

class InvoiceService {
  /**
   * Create a new invoice
   * @param {string} tenantId - The tenant ID
   * @param {string} userId - The ID of the user creating the invoice
   * @param {object} data - Invoice data (customerId, items, paymentMethod, etc.)
   */
  async createInvoice(tenantId, userId, data) {
    const {
      customerId,
      customer: legacyCustomerId,
      items,
      paymentMethod: rawPaymentMethod,
      discount = 0,
      numberOfInstallments,
      frequency,
      downPayment,
      startDate,
      notes,
      sendWhatsApp,
      source,
      shippingAddress,
      shippingSummary,
      couponCode,
      campaignAttribution,
    } = data;
    const resolvedCustomerId = customerId || legacyCustomerId;
    const paymentMethod = (rawPaymentMethod === 'online' || rawPaymentMethod === 'credit') ? PAYMENT_METHODS.VISA : rawPaymentMethod;
    const shouldSendWhatsApp = source === 'online_store' ? sendWhatsApp !== false : !!sendWhatsApp;
    let appliedCoupon = null;
    let reservedCouponUsage = false;
    let couponDiscountAmount = 0;
    let discountAmount = Number(discount) || 0;
    const normalizedCampaignAttribution = this.normalizeCampaignAttribution(campaignAttribution);
    const normalizedShippingSummary = normalizeInvoiceShippingSummary(shippingSummary);

    if (!resolvedCustomerId) throw AppError.badRequest('يجب تحديد العميل');
    if (!items || !Array.isArray(items) || items.length === 0) throw AppError.badRequest('يجب إضافة منتجات للفاتورة');

    // Check if MongoDB topology supports transactions (ReplicaSet or Sharded)
    let session = undefined;
    let supportsTransactions = false;
    try {
      const topologyType = mongoose.connection.client?.topology?.description?.type;
      supportsTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';
    } catch (e) { }

    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Validate customer
      const customerQuery = Customer.findOne({
        _id: resolvedCustomerId,
        tenant: tenantId,
        isActive: true
      });
      if (session) customerQuery.session(session);
      const customer = await customerQuery;

      const tenantQuery = Tenant.findById(tenantId).select('settings.shipping settings.onlineFulfillment whatsapp');
      if (session) tenantQuery.session(session);
      const tenant = await tenantQuery;

      if (!customer) throw AppError.notFound('العميل غير موجود');

      if (!tenant) {
        throw AppError.notFound('المتجر غير موجود');
      }

      const shippingSettings = getTenantShippingSettings(tenant);

      // Check if sales blocked for this customer
      if (customer.salesBlocked) {
        throw AppError.badRequest(`⛔ البيع ممنوع لهذا العميل: ${customer.salesBlockedReason || 'تم منع البيع'}`);
      }

      // --- SHIFT VALIDATION FOR POS ---
      let activeShift = null;
      if (!source || source === 'pos') {
        const CashShift = require('../models/CashShift');
        const shiftQuery = CashShift.findOne({
          user: userId,
          status: 'open',
          tenant: tenantId
        });
        if (session) shiftQuery.session(session);
        activeShift = await shiftQuery;

        if (!activeShift) {
          throw AppError.badRequest('يجب فتح وردية أولاً قبل إجراء عملية بيع');
        }

        // Lazy Auto-Close Check
        if (activeShift.autoCloseAt && new Date() > activeShift.autoCloseAt) {
          activeShift.status = 'closed';
          activeShift.closedBySystem = true;
          activeShift.endTime = activeShift.autoCloseAt;
          await activeShift.save({ session });
          throw AppError.badRequest('⛔ انتهى وقت الوردية تلقائياً. يرجى العودة لصفحة إدارة الورديات وفتح وردية جديدة.');
        }
      }

      // Validate and prepare items (read stock without modifying yet)
      const invoiceItems = [];
      let subtotal = 0;
      let totalProfit = 0;
      const productsToUpdate = []; // collect products, update stock after invoice is created

      let user = null;
      if (userId) {
        const User = require('../models/User');
        const userQuery = User.findById(userId);
        if (session) userQuery.session(session);
        user = await userQuery;
      }

      const isOnlineFulfillmentSource = source === 'online_store' || source === 'portal';
      const onlineFulfillmentSettings = getOnlineFulfillmentSettings(tenant);
      const fallbackPreferredBranchId = isOnlineFulfillmentSource
        ? null
        : (data.branchId || (user ? user.branch : null));
      const preparedItems = [];

      for (const item of items) {
        const productQuery = Product.findOne({
          _id: item.productId,
          tenant: tenantId,
          isActive: true,
          ...(source === 'online_store' ? { isSuspended: { $ne: true } } : {})
        });
        if (session) productQuery.session(session);
        const product = await productQuery;

        if (!product) {
          throw AppError.notFound(`المنتج غير موجود: ${item.productId}`);
        }

        const variant = item.variantId ? product.variants.id(item.variantId) : null;
        preparedItems.push({
          item,
          product,
          variant,
          quantity: Math.max(1, Number(item.quantity) || 1),
        });
      }

      let candidateBranchIds = [];
      let forcedOnlineBranchId = null;
      let requiresOnlineFulfillmentReview = false;

      if (isOnlineFulfillmentSource) {
        const branchQuery = Branch.find({
          tenant: tenantId,
          isActive: true,
        }).select('_id participatesInOnlineOrders isFulfillmentCenter onlinePriority');
        if (session) branchQuery.session(session);
        const onlineBranches = await branchQuery;

        candidateBranchIds = buildOnlineBranchCandidateIds({
          tenant,
          branches: onlineBranches,
          source: source || 'online_store',
          customerBranchId: customer?.branch || null,
        });

        if (candidateBranchIds.length === 0) {
          throw AppError.badRequest('لا يوجد فرع مفعّل حاليًا لاستقبال طلبات المتجر أو البوابة');
        }

        if (!onlineFulfillmentSettings.allowMixedBranchOrders) {
          forcedOnlineBranchId = candidateBranchIds.find((branchId) => (
            preparedItems.every(({ product, variant, quantity }) => (
              getBranchAvailableQuantity({
                product,
                variant,
                branchId,
                channel: 'online',
              }) >= quantity
            ))
          )) || null;

          if (!forcedOnlineBranchId) {
            requiresOnlineFulfillmentReview = true;
          }
        }
      }

      for (const { item, product, variant, quantity } of preparedItems) {
        if (isOnlineFulfillmentSource && requiresOnlineFulfillmentReview) {
          const itemPrice = (variant && variant.price) ? variant.price : product.price;
          const totalPrice = itemPrice * quantity;
          subtotal += totalPrice;
          totalProfit += (itemPrice - (product.cost || 0)) * quantity;

          invoiceItems.push({
            product: product._id,
            variant: item.variantId,
            allocatedBranch: null,
            productName: product.name,
            sku: variant ? variant.sku : product.sku,
            barcode: variant?.internationalBarcode || variant?.barcode || product.internationalBarcode || product.barcode,
            internationalBarcode: variant?.internationalBarcode || variant?.barcode || product.internationalBarcode || product.barcode,
            internationalBarcodeType: variant?.internationalBarcodeType || product.internationalBarcodeType || undefined,
            localBarcode: variant?.localBarcode || product.localBarcode,
            localBarcodeType: variant?.localBarcodeType || product.localBarcodeType,
            quantity,
            unitPrice: itemPrice,
            totalPrice,
          });

          continue;
        }

        const effectiveCandidateBranchIds = isOnlineFulfillmentSource
          ? (
              forcedOnlineBranchId
                ? [forcedOnlineBranchId]
                : onlineFulfillmentSettings.allowCrossBranchOnlineAllocation
                  ? candidateBranchIds
                  : candidateBranchIds.slice(0, 1)
            )
          : [];
        const preferredBranchId = forcedOnlineBranchId || fallbackPreferredBranchId;
        const stockAllocation = resolveInventoryAllocation({
          product,
          variant,
          quantity,
          preferredBranchId,
          strictPreferredBranch: Boolean(preferredBranchId),
          candidateBranchIds: effectiveCandidateBranchIds,
          channel: isOnlineFulfillmentSource ? 'online' : 'pos',
        });

        if (stockAllocation.availableQuantity < quantity) {
          throw AppError.badRequest(
            `الكمية المطلوبة من "${product.name}${variant ? ` - ${variant.sku}` : ''}" غير متوفرة (المتاح: ${stockAllocation.availableQuantity})`
          );
        }

        productsToUpdate.push({
          product,
          quantity,
          branchId: stockAllocation.branchId,
          variantId: item.variantId,
        });

        const itemPrice = (variant && variant.price) ? variant.price : product.price;
        const totalPrice = itemPrice * quantity;
        subtotal += totalPrice;
        totalProfit += (itemPrice - (product.cost || 0)) * quantity;

        invoiceItems.push({
          product: product._id,
          variant: item.variantId,
          allocatedBranch: stockAllocation.branchId || null,
          productName: product.name,
          sku: variant ? variant.sku : product.sku,
          barcode: variant?.internationalBarcode || variant?.barcode || product.internationalBarcode || product.barcode,
          internationalBarcode: variant?.internationalBarcode || variant?.barcode || product.internationalBarcode || product.barcode,
          internationalBarcodeType: variant?.internationalBarcodeType || product.internationalBarcodeType || undefined,
          localBarcode: variant?.localBarcode || product.localBarcode,
          localBarcodeType: variant?.localBarcodeType || product.localBarcodeType,
          quantity,
          unitPrice: itemPrice,
          totalPrice,
        });

        // Trigger low stock / out of stock notifications
        if (product.stock.quantity <= 0 && !product.outOfStockAlertSent) {
          NotificationService.onOutOfStock(tenantId, product).catch(() => { });
        } else if (product.stock.quantity <= product.stock.minQuantity && !product.lowStockAlertSent) {
          NotificationService.onLowStock(tenantId, product).catch(() => { });
        }
      }

      if (source === 'online_store') {
        discountAmount += this.calculateOnlineStoreVolumeDiscount(invoiceItems);
      }

      if (couponCode) {
        const normalizedCouponCode = String(couponCode).trim().toUpperCase();
        const coupon = await Coupon.findOne({
          tenant: tenantId,
          code: normalizedCouponCode,
        });

        const validity = coupon ? coupon.isValid() : { valid: false };
        if (!coupon || !validity.valid) {
          throw AppError.badRequest(validity.reason || 'كود الخصم غير صالح أو منتهي الصلاحية');
        }

        if (Math.max(0, subtotal - discountAmount) < coupon.minOrderAmount) {
          throw AppError.badRequest(`الحد الأدنى للطلب لاستخدام هذا الكوبون هو ${coupon.minOrderAmount} ج.م`);
        }

        if (coupon.applicableCustomers.length > 0) {
          const isCustomerAllowed = coupon.applicableCustomers.some(
            (id) => id.toString() === customer._id.toString()
          );
          if (!isCustomerAllowed) {
            throw AppError.badRequest('هذا الكوبون غير مخصص لهذا العميل');
          }
        }

        const customerUsages = (coupon.usages || []).filter(
          (usage) => usage.customer?.toString() === customer._id.toString()
        ).length;
        if (customerUsages >= (coupon.usagePerCustomer || 1)) {
          throw AppError.badRequest('لقد استخدمت هذا الكوبون بالحد الأقصى المسموح');
        }

        const couponQuery = { _id: coupon._id };
        if (coupon.usageLimit) {
          couponQuery.usageCount = { $lt: coupon.usageLimit };
        }

        let reserveQuery = Coupon.findOneAndUpdate(
          couponQuery,
          { $inc: { usageCount: 1 } },
          { new: true }
        );
        if (session) reserveQuery = reserveQuery.session(session);

        const reservedCoupon = await reserveQuery;
        if (!reservedCoupon && coupon.usageLimit) {
          throw AppError.badRequest('تم الوصول للحد الأقصى لاستخدام كود الخصم');
        }

        appliedCoupon = reservedCoupon || coupon;
        reservedCouponUsage = true;
        couponDiscountAmount = appliedCoupon.calculateDiscount(Math.max(0, subtotal - discountAmount));
        discountAmount += couponDiscountAmount;
      }

      const tenantShippingSettings = getTenantShippingSettings(tenant);
      const shippingQuote = await resolveTenantShippingQuote(tenant, {
        shippingAddress,
        subtotal,
        requestedSummary: normalizedShippingSummary,
      });

      if (!shippingQuote.ok) {
        throw new AppError(
          shippingQuote.errorMessage || 'تعذر حساب تكلفة الشحن حالياً',
          400,
          shippingQuote.errorCode || 'SHIPPING_CALCULATION_FAILED'
        );
      }

      const computedShippingSummary = shippingQuote.shippingSummary;

      if (
        source === 'online_store' &&
        paymentMethod === PAYMENT_METHODS.CASH &&
        tenantShippingSettings.supportsCashOnDelivery === false
      ) {
        throw AppError.badRequest('الدفع عند الاستلام غير متاح لهذا المتجر');
      }

      const effectiveShippingAmount = Math.max(
        0,
        (computedShippingSummary?.shippingFee || 0) - (computedShippingSummary?.shippingDiscount || 0)
      );
      const totalAmount = Math.max(0, subtotal + effectiveShippingAmount - discountAmount);

      // Check Credit Limit
      let transactionPendingAmount = 0;
      if (paymentMethod === PAYMENT_METHODS.INSTALLMENT) {
        transactionPendingAmount = totalAmount - (downPayment || 0);
      } else if (paymentMethod === PAYMENT_METHODS.DEFERRED) {
        transactionPendingAmount = totalAmount;
      }

      const currentBalance = customer.financials.outstandingBalance || 0;
      const creditLimit = customer.financials.creditLimit || 0;

      if (creditLimit > 0 && (currentBalance + transactionPendingAmount) > creditLimit) {
        throw AppError.badRequest(`⛔ تجاوز الحد الائتماني! رصيد العميل الحالي (${currentBalance}) + المبلغ المتبقي (${transactionPendingAmount}) يتجاوز الحد المسموح (${creditLimit})`);
      }

      // Prepare Invoice Data
      const invoiceData = {
        tenant: tenantId,
        invoiceNumber: Helpers.generateInvoiceNumber(),
        customer: customer._id,
        createdBy: userId,
        shift: activeShift ? activeShift._id : undefined,
        items: invoiceItems,
        subtotal,
        discount: discountAmount,
        shippingFee: computedShippingSummary?.shippingFee || 0,
        shippingDiscount: computedShippingSummary?.shippingDiscount || 0,
        carrierCost: computedShippingSummary?.carrierCost || 0,
        totalAmount,
        paymentMethod,
        notes,
        source: source || 'pos',
      };

      const uniqueBranchIds = collectUniqueBranchIds(productsToUpdate);
      if (uniqueBranchIds.length === 1) {
        invoiceData.branch = uniqueBranchIds[0];
      }

      if (normalizedCampaignAttribution) {
        invoiceData.campaignAttribution = normalizedCampaignAttribution;
      }

      if (shippingAddress && typeof shippingAddress === 'object') {
        invoiceData.shippingAddress = {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          city: shippingAddress.city,
          governorate: shippingAddress.governorate,
          notes: shippingAddress.notes,
        };
      }

      if (computedShippingSummary) {
        if (computedShippingSummary.shippingMethod) {
          invoiceData.shippingMethod = computedShippingSummary.shippingMethod;
        }

        if (computedShippingSummary.zoneCode || computedShippingSummary.zoneLabel) {
          invoiceData.shippingZone = {
            code: computedShippingSummary.zoneCode,
            label: computedShippingSummary.zoneLabel,
          };
        }

        if (computedShippingSummary.shipmentId) {
          invoiceData.shipmentId = computedShippingSummary.shipmentId;
        }

        if (computedShippingSummary.trackingNumber) {
          invoiceData.trackingNumber = computedShippingSummary.trackingNumber;
        }

        if (computedShippingSummary.estimatedDeliveryDate) {
          invoiceData.estimatedDeliveryDate = computedShippingSummary.estimatedDeliveryDate;
        }

        if (
          computedShippingSummary.provider ||
          computedShippingSummary.trackingNumber ||
          computedShippingSummary.trackingUrl
        ) {
          invoiceData.shippingDetails = {
            provider: computedShippingSummary.provider,
            waybillNumber: computedShippingSummary.trackingNumber || undefined,
            trackingUrl: computedShippingSummary.trackingUrl || undefined,
            status: computedShippingSummary.trackingNumber ? 'created' : 'pending',
          };
        }
      }

      if (shippingQuote?.shippingBranch?.branchId) {
        invoiceData.fulfillmentBranch = shippingQuote.shippingBranch.branchId;
      } else if (shippingSettings?.defaultShippingBranchId) {
        invoiceData.fulfillmentBranch = shippingSettings.defaultShippingBranchId;
      }

      if (source === 'online_store' || source === 'portal') {
        invoiceData.fulfillmentStatus = 'pending_review';
      }

      // Handle payment method configuration
      if (paymentMethod === PAYMENT_METHODS.CASH) {
        invoiceData.paidAmount = totalAmount;
        invoiceData.remainingAmount = 0;
        invoiceData.status = INVOICE_STATUS.PAID;
      } else if (paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY) {
        invoiceData.paidAmount = 0;
        invoiceData.remainingAmount = totalAmount;
        invoiceData.status = INVOICE_STATUS.PENDING;
        // Optionally set a short due date for COD
        invoiceData.dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (paymentMethod === PAYMENT_METHODS.INSTALLMENT) {
        const dp = downPayment || 0;
        invoiceData.paidAmount = dp;
        invoiceData.remainingAmount = totalAmount - dp;
        invoiceData.installmentConfig = {
          numberOfInstallments: numberOfInstallments || 3,
          frequency: frequency || 'monthly',
          downPayment: dp,
          startDate: startDate ? new Date(startDate) : new Date(),
        };

        // Generate installment schedule
        invoiceData.installments = Helpers.generateInstallmentSchedule(
          totalAmount,
          dp,
          numberOfInstallments || 3,
          frequency || 'monthly',
          startDate ? new Date(startDate) : new Date()
        );

        invoiceData.status = dp > 0 ? INVOICE_STATUS.PARTIALLY_PAID : INVOICE_STATUS.PENDING;
      } else if (paymentMethod === PAYMENT_METHODS.DEFERRED) {
        invoiceData.paidAmount = 0;
        invoiceData.remainingAmount = totalAmount;
        invoiceData.status = INVOICE_STATUS.PENDING;
        invoiceData.dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      if (user && user.commissionRate > 0) {
        // Calculate commission from total profit minus any discounts spread proportionally,
        // or simply from raw profit for simplicity
        // Simplified: Just use raw total profit. Discounts might reduce profit, but typically commission on raw item profit is standard,
        // or we can adjust: totalProfit = Math.max(0, totalProfit - discount)
        const adjustedProfit = Math.max(0, totalProfit - discountAmount);
        invoiceData.commission = {
          amount: (adjustedProfit * user.commissionRate) / 100,
          isPaid: false
        };
      }

      // Create Invoice FIRST (inside transaction)
      const createOptions = session ? { session } : undefined;
      const [invoice] = await Invoice.create([invoiceData], createOptions);

      // NOW deduct stock (after invoice is created successfully)
      for (const { product, quantity, branchId, variantId } of productsToUpdate) {
        const variant = variantId ? product.variants.id(variantId) : null;

        deductInventoryAllocation({
          product,
          variant,
          branchId,
          quantity,
        });

        // Product.pre('save') will automatically sync the global stock.quantity
        // if inventory is changed, and update stockStatus.
        await product.save(createOptions);

        // Trigger low stock / out of stock notifications (non-blocking, outside transaction)
        if (product.stock.quantity <= 0 && !product.outOfStockAlertSent) {
          NotificationService.onOutOfStock(tenantId, product).catch(() => { });
        } else if (product.stock.quantity <= product.stock.minQuantity && !product.lowStockAlertSent) {
          NotificationService.onLowStock(tenantId, product).catch(() => { });
        }
      }

      // Update customer financials (inside transaction)
      customer.recordPurchase(totalAmount, invoiceData.paidAmount);
      await customer.save(session ? { session } : undefined);

      // Commit transaction - all operations succeeded
      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      // Post-transaction: Gamification (non-critical)
      if (userId) {
        const xpEarned = Math.floor(totalAmount / 10);
        if (xpEarned > 0) {
          GamificationService.addXP(userId, xpEarned).catch(() => { });
        }
        GamificationService.checkAchievements(userId, totalAmount).catch(() => { });
      }

      // Post-transaction: Notifications (non-critical)
      if (appliedCoupon) {
        Coupon.findByIdAndUpdate(appliedCoupon._id, {
          $push: {
            usages: {
              customer: customer._id,
              invoice: invoice._id,
              discountAmount: couponDiscountAmount,
              usedAt: new Date(),
            },
          },
        }).catch(() => { });
      }

      if (shouldSendWhatsApp && customer.whatsapp?.enabled && customer.whatsapp?.notifications?.invoices !== false) {
        WhatsAppService.sendInvoiceNotification(
          customer.whatsapp.number || customer.phone,
          invoice,
          customer,
          tenant?.whatsapp
        ).then(() => {
          invoice.whatsappSent = true;
          invoice.whatsappSentAt = new Date();
          invoice.save();
        }).catch(() => { });
      }

      NotificationService.onInvoiceCreated(tenantId, invoice, customer.name).catch(() => { });

      // Return populated invoice
      const populatedInvoice = await Invoice.findById(invoice._id)
        .populate('customer', 'name phone tier')
        .populate('createdBy', 'name');

      return populatedInvoice;

    } catch (err) {
      // Rollback all changes if anything failed
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      if (!session && reservedCouponUsage && appliedCoupon?._id) {
        Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usageCount: -1 } }).catch(() => { });
      }
      throw err;
    }
  }

  calculateOnlineStoreVolumeDiscount(invoiceItems = []) {
    if (!Array.isArray(invoiceItems) || invoiceItems.length === 0) return 0;

    return invoiceItems.reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0;
      const totalPrice = Number(item?.totalPrice) || 0;

      if (quantity >= 3) {
        return sum + (totalPrice * 0.10);
      }

      if (quantity >= 2) {
        return sum + (totalPrice * 0.05);
      }

      return sum;
    }, 0);
  }

  normalizeCampaignAttribution(campaignAttribution = {}) {
    if (!campaignAttribution || typeof campaignAttribution !== 'object') return null;

    const normalizeString = (value, maxLength = 180) => (
      typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
    );

    const parseDate = (value) => {
      if (!value) return undefined;

      const candidate = new Date(value);
      return Number.isNaN(candidate.getTime()) ? undefined : candidate;
    };

    const normalized = {
      utmSource: normalizeString(campaignAttribution.utmSource),
      utmMedium: normalizeString(campaignAttribution.utmMedium),
      utmCampaign: normalizeString(campaignAttribution.utmCampaign),
      utmTerm: normalizeString(campaignAttribution.utmTerm),
      utmContent: normalizeString(campaignAttribution.utmContent),
      campaignMessage: normalizeString(campaignAttribution.campaignMessage, 240),
      ref: normalizeString(campaignAttribution.ref),
      gclid: normalizeString(campaignAttribution.gclid, 240),
      fbclid: normalizeString(campaignAttribution.fbclid, 240),
      referrer: normalizeString(campaignAttribution.referrer, 320),
      landingPath: normalizeString(campaignAttribution.landingPath, 240),
      landingUrl: normalizeString(campaignAttribution.landingUrl, 420),
      firstSeenAt: parseDate(campaignAttribution.firstSeenAt),
      lastSeenAt: parseDate(campaignAttribution.lastSeenAt),
    };

    const hasAttribution = [
      normalized.utmSource,
      normalized.utmMedium,
      normalized.utmCampaign,
      normalized.utmTerm,
      normalized.utmContent,
      normalized.campaignMessage,
      normalized.ref,
      normalized.gclid,
      normalized.fbclid,
      normalized.referrer,
    ].some(Boolean);

    return hasAttribution ? normalized : null;
  }
}

module.exports = new InvoiceService();
