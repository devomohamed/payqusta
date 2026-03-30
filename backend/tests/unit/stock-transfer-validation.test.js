const { normalizeReceiptUpdateMap, buildTransferItemKey } = require('../../src/utils/stockTransferValidation');

describe('stockTransferValidation helpers', () => {
  const transferItems = [
    {
      product: 'product-1',
      variant: null,
      productName: 'منتج أساسي',
      requestedQty: 5,
      shippedQty: 4,
    },
    {
      product: 'product-2',
      variant: 'variant-1',
      productName: 'منتج متغير',
      requestedQty: 2,
      shippedQty: 2,
    },
  ];

  it('builds stable item keys for base and variant items', () => {
    expect(buildTransferItemKey('product-1', null)).toBe('product-1:base');
    expect(buildTransferItemKey('product-2', 'variant-1')).toBe('product-2:variant-1');
  });

  it('normalizes valid receipt updates within shipped quantities', () => {
    const result = normalizeReceiptUpdateMap(transferItems, [
      { product: 'product-1', receivedQty: 3 },
      { product: 'product-2', variant: 'variant-1', receivedQty: 2 },
    ]);

    expect(result.get('product-1:base')).toBe(3);
    expect(result.get('product-2:variant-1')).toBe(2);
  });

  it('rejects receipt quantities greater than the shipped quantity', () => {
    expect(() => normalizeReceiptUpdateMap(transferItems, [
      { product: 'product-1', receivedQty: 5 },
    ])).toThrow('لا يمكن اعتماد كمية مستلمة أكبر من الكمية المشحونة');
  });

  it('rejects items that are not part of the transfer', () => {
    expect(() => normalizeReceiptUpdateMap(transferItems, [
      { product: 'other-product', receivedQty: 1 },
    ])).toThrow('تم إرسال صنف غير موجود ضمن طلب التحويل');
  });
});
