const Product = require('../../src/models/Product');
const { normalizeProductBarcodeFields } = require('../../src/utils/barcodeHelpers');

describe('Product schema identifier handling', () => {
  test('normalizes blank sku and barcode values away', () => {
    const product = {
      sku: '   ',
      barcode: '   ',
      internationalBarcode: '',
      localBarcode: '   ',
      variants: [
        { sku: '', barcode: '', localBarcode: ' ' },
        { sku: ' ab-12 ' },
      ],
    };

    normalizeProductBarcodeFields(product);

    expect(product.sku).toBeUndefined();
    expect(product.barcode).toBeUndefined();
    expect(product.internationalBarcode).toBeUndefined();
    expect(product.localBarcode).toBeUndefined();
    expect(product.variants[0].sku).toBeUndefined();
    expect(product.variants[0].barcode).toBeUndefined();
    expect(product.variants[0].localBarcode).toBeUndefined();
    expect(product.variants[1].sku).toBe('AB-12');
  });

  test('defines non-empty partial unique indexes for identifiers', () => {
    const getIndex = (field) => Product.schema.indexes().find(([fields]) => fields.tenant === 1 && fields[field] === 1);
    const expectedFilter = (field) => ({ [field]: { $type: 'string', $gt: '' } });
    const expectedIndexes = [
      ['sku', 'tenant_1_sku_1'],
      ['barcode', 'tenant_1_barcode_1'],
      ['internationalBarcode', 'tenant_1_internationalBarcode_1'],
      ['localBarcode', 'tenant_1_localBarcode_1'],
    ];

    expectedIndexes.forEach(([field, name]) => {
      const index = getIndex(field);

      expect(index).toBeDefined();
      expect(index[1]).toMatchObject({
        name,
        unique: true,
        partialFilterExpression: expectedFilter(field),
      });
      expect(index[1].sparse).toBeUndefined();
    });
  });
});
