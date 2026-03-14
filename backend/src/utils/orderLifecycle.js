const AppError = require('./AppError');
const Product = require('../models/Product');
const { INVOICE_STATUS } = require('../config/constants');
const {
  restockInventoryAllocation,
  toIdString,
} = require('./inventoryAllocation');

const CANCELABLE_ORDER_STATUSES = ['pending', 'confirmed', 'processing'];

function appendOrderHistory(invoice, status, note) {
  invoice.orderStatusHistory = invoice.orderStatusHistory || [];
  invoice.orderStatusHistory.push({
    status,
    date: new Date(),
    note,
  });
}

function assertInvoiceCancelable(invoice) {
  const currentStatus = invoice.orderStatus || invoice.status;
  if (!CANCELABLE_ORDER_STATUSES.includes(currentStatus)) {
    throw AppError.badRequest('لا يمكن إلغاء الطلب في هذه المرحلة');
  }
}

function findMatchingInvoiceItem(invoice, { productId, variantId = null }) {
  const normalizedProductId = toIdString(productId);
  const normalizedVariantId = toIdString(variantId);

  return (invoice.items || []).find((item) => {
    if (toIdString(item.product) !== normalizedProductId) return false;
    if (!normalizedVariantId) return true;
    return toIdString(item.variant) === normalizedVariantId;
  });
}

function calculateRefundAmountForItems(invoice, requestedItems = []) {
  return (Array.isArray(requestedItems) ? requestedItems : []).reduce((total, requestedItem) => {
    const matchingItem = findMatchingInvoiceItem(invoice, requestedItem);
    if (!matchingItem) return total;

    const quantity = Math.max(0, Number(requestedItem.quantity) || 0);
    const unitPrice =
      Number(matchingItem.unitPrice) ||
      (Number(matchingItem.quantity) > 0
        ? Number(matchingItem.totalPrice || 0) / Number(matchingItem.quantity)
        : 0);

    return total + (Math.max(0, unitPrice) * quantity);
  }, 0);
}

async function restockInvoiceItems(invoice, requestedItems = []) {
  const normalizedItems = (Array.isArray(requestedItems) ? requestedItems : [])
    .map((item) => ({
      productId: toIdString(item.productId || item.product),
      variantId: toIdString(item.variantId || item.variant),
      quantity: Math.max(0, Number(item.quantity) || 0),
    }))
    .filter((item) => item.productId && item.quantity > 0);

  if (normalizedItems.length === 0) {
    return { restockedItems: 0, totalQuantity: 0 };
  }

  const uniqueProductIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await Product.find({
    _id: { $in: uniqueProductIds },
    tenant: invoice.tenant,
  });

  const productMap = new Map(products.map((product) => [toIdString(product._id), product]));

  let restockedItems = 0;
  let totalQuantity = 0;

  for (const requestedItem of normalizedItems) {
    const product = productMap.get(requestedItem.productId);
    if (!product) continue;

    const variant = requestedItem.variantId ? product.variants.id(requestedItem.variantId) : null;

    restockInventoryAllocation({
      product,
      variant,
      branchId: invoice.branch || null,
      quantity: requestedItem.quantity,
    });

    await product.save({ validateBeforeSave: false });
    restockedItems += 1;
    totalQuantity += requestedItem.quantity;
  }

  return { restockedItems, totalQuantity };
}

function markInvoiceRefundPending(invoice, amount = 0, reason = '') {
  const refundAmount = Math.max(0, Number(amount) || 0);
  if (refundAmount <= 0) return 0;

  const currentAmount = Math.max(0, Number(invoice.refundAmount) || 0);
  const maxRefundCap = Math.max(0, Number(invoice.paidAmount) || 0);
  const nextRefundAmount = maxRefundCap > 0
    ? Math.min(maxRefundCap, currentAmount + refundAmount)
    : currentAmount + refundAmount;
  const appliedRefundAmount = Math.max(0, nextRefundAmount - currentAmount);

  if (appliedRefundAmount <= 0) return 0;

  invoice.refundAmount = nextRefundAmount;
  invoice.refundReason = reason || invoice.refundReason || '';

  if (invoice.refundStatus === 'refunded' && currentAmount > 0) {
    invoice.refundStatus = 'partially_refunded';
  } else if (invoice.refundStatus === 'none' || !invoice.refundStatus || invoice.refundStatus === 'failed') {
    invoice.refundStatus = 'pending';
  }

  return appliedRefundAmount;
}

async function cancelInvoiceOrder(invoice, { reason = '', note = '', restoreInventory = true } = {}) {
  assertInvoiceCancelable(invoice);

  if (restoreInventory && !invoice.inventoryRestoredAt) {
    const items = (invoice.items || []).map((item) => ({
      productId: item.product,
      variantId: item.variant || null,
      quantity: item.quantity,
    }));

    await restockInvoiceItems(invoice, items);
    invoice.inventoryRestoredAt = new Date();
  }

  invoice.orderStatus = 'cancelled';
  invoice.status = INVOICE_STATUS.CANCELLED;
  invoice.cancelledAt = invoice.cancelledAt || new Date();
  invoice.cancelReason = reason || invoice.cancelReason || '';
  if (invoice.shippingDetails) {
    invoice.shippingDetails.status = 'cancelled';
  }

  if ((Number(invoice.paidAmount) || 0) > 0) {
    markInvoiceRefundPending(invoice, invoice.paidAmount, reason || note || 'إلغاء الطلب');
  }

  appendOrderHistory(
    invoice,
    'cancelled',
    note || reason || 'تم إلغاء الطلب'
  );
}

async function completeInvoiceReturn(invoice, requestedItems = [], { reason = '', note = '', cancelOrder = false } = {}) {
  const normalizedItems = (Array.isArray(requestedItems) ? requestedItems : [])
    .map((item) => ({
      productId: item.productId || item.product,
      variantId: item.variantId || item.variant || null,
      quantity: item.quantity,
    }))
    .filter((item) => item.productId && Number(item.quantity) > 0);

  const canRestock = !(cancelOrder && invoice.inventoryRestoredAt);
  const { totalQuantity } = canRestock
    ? await restockInvoiceItems(invoice, normalizedItems)
    : { totalQuantity: 0 };

  if (totalQuantity > 0) {
    invoice.inventoryRestoredAt = invoice.inventoryRestoredAt || new Date();
  }

  const refundAmount = canRestock
    ? Math.min(
        Math.max(0, Number(invoice.paidAmount) || 0),
        calculateRefundAmountForItems(invoice, normalizedItems)
      )
    : 0;

  if (refundAmount > 0) {
    markInvoiceRefundPending(invoice, refundAmount, reason || note || 'مرتجع طلب');
  }

  invoice.returnStatus = invoice.refundStatus === 'refunded' ? 'refunded' : 'received';

  if (cancelOrder) {
    invoice.orderStatus = 'cancelled';
    invoice.status = INVOICE_STATUS.CANCELLED;
    invoice.cancelledAt = invoice.cancelledAt || new Date();
    if (invoice.shippingDetails) {
      invoice.shippingDetails.status = 'returned';
    }
  }

  appendOrderHistory(
    invoice,
    cancelOrder ? 'cancelled' : invoice.orderStatus || 'processing',
    note || `تم استلام مرتجع${totalQuantity > 0 ? ` بعدد ${totalQuantity}` : ''}`
  );

  return { totalQuantity, refundAmount };
}

module.exports = {
  appendOrderHistory,
  assertInvoiceCancelable,
  calculateRefundAmountForItems,
  cancelInvoiceOrder,
  completeInvoiceReturn,
  findMatchingInvoiceItem,
  markInvoiceRefundPending,
  restockInvoiceItems,
};
