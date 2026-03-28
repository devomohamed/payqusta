const AppError = require('./AppError');
const { toIdString } = require('./inventoryAllocation');

function buildTransferItemKey(product, variant = null) {
  return `${toIdString(product)}:${toIdString(variant) || 'base'}`;
}

function normalizeReceiptUpdateMap(transferItems = [], requestedItems = []) {
  const allowedItems = new Map(
    (Array.isArray(transferItems) ? transferItems : []).map((item) => [
      buildTransferItemKey(item.product, item.variant),
      {
        productName: item.productName || 'منتج',
        maxQty: Math.max(0, Number(item.shippedQty || item.requestedQty || 0)),
      },
    ])
  );

  const updates = new Map();

  (Array.isArray(requestedItems) ? requestedItems : []).forEach((item) => {
    const itemKey = buildTransferItemKey(item.product, item.variant);
    const allowed = allowedItems.get(itemKey);

    if (!allowed) {
      throw AppError.badRequest('تم إرسال صنف غير موجود ضمن طلب التحويل');
    }

    const normalizedQty = Number(item.receivedQty);
    const receivedQty = Number.isFinite(normalizedQty) ? normalizedQty : 0;

    if (receivedQty < 0) {
      throw AppError.badRequest(`الكمية المستلمة للصنف ${allowed.productName} لا يمكن أن تكون سالبة`);
    }

    if (receivedQty > allowed.maxQty) {
      throw AppError.badRequest(
        `لا يمكن اعتماد كمية مستلمة أكبر من الكمية المشحونة للصنف ${allowed.productName}`
      );
    }

    updates.set(itemKey, receivedQty);
  });

  return updates;
}

module.exports = {
  buildTransferItemKey,
  normalizeReceiptUpdateMap,
};
