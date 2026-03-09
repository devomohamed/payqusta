const Product = require('../models/Product');
const { normalizeProductBarcodeFields } = require('../utils/barcodeHelpers');

const EMPTY_VALUE_REGEX = /^\s*$/;

const IDENTIFIER_INDEXES = [
  { field: 'sku', key: { tenant: 1, sku: 1 }, name: 'tenant_1_sku_1', label: 'SKU' },
  { field: 'barcode', key: { tenant: 1, barcode: 1 }, name: 'tenant_1_barcode_1', label: 'barcode' },
  {
    field: 'internationalBarcode',
    key: { tenant: 1, internationalBarcode: 1 },
    name: 'tenant_1_internationalBarcode_1',
    label: 'international barcode',
  },
  {
    field: 'localBarcode',
    key: { tenant: 1, localBarcode: 1 },
    name: 'tenant_1_localBarcode_1',
    label: 'local barcode',
  },
];

function buildPartialFilter(field) {
  return {
    [field]: {
      $type: 'string',
      $gt: '',
    },
  };
}

function buildIndexOptions(field, name) { 
  return {
    name,
    unique: true,
    partialFilterExpression: buildPartialFilter(field),
  };
}

function isTargetIndex(index, field) {
  return index?.key?.tenant === 1 && index?.key?.[field] === 1;
}

function isIndexUpToDate(index, field) {
  return Boolean(
    index &&
    isTargetIndex(index, field) &&
    index.unique === true &&
    index.sparse !== true &&
    index.partialFilterExpression?.[field]?.$type === 'string' &&
    index.partialFilterExpression?.[field]?.$gt === ''
  );
}

function buildIdentifierSnapshot(product) {
  return JSON.stringify({
    sku: product?.sku,
    barcode: product?.barcode,
    internationalBarcode: product?.internationalBarcode,
    internationalBarcodeType: product?.internationalBarcodeType,
    localBarcode: product?.localBarcode,
    localBarcodeType: product?.localBarcodeType,
    variants: (product?.variants || []).map((variant) => ({
      sku: variant?.sku,
      barcode: variant?.barcode,
      internationalBarcode: variant?.internationalBarcode,
      internationalBarcodeType: variant?.internationalBarcodeType,
      localBarcode: variant?.localBarcode,
      localBarcodeType: variant?.localBarcodeType,
    })),
  });
}

async function ensureProductCollectionExists() {
  try {
    await Product.createCollection();
  } catch (error) {
    if (error?.code !== 48 && error?.codeName !== 'NamespaceExists') {
      throw error;
    }
  }
}

async function cleanupIdentifierValues() {
  const topLevelConditions = IDENTIFIER_INDEXES.flatMap(({ field }) => ([
    { [field]: null },
    { [field]: '' },
    { [field]: EMPTY_VALUE_REGEX },
  ]));

  const variantConditions = IDENTIFIER_INDEXES.flatMap(({ field }) => ([
    { [`variants.${field}`]: null },
    { [`variants.${field}`]: '' },
    { [`variants.${field}`]: EMPTY_VALUE_REGEX },
  ]));

  const products = await Product.find({
    $or: [
      ...topLevelConditions,
      ...variantConditions,
    ],
  });

  let cleanedProducts = 0;

  for (const product of products) {
    const before = buildIdentifierSnapshot(product);
    normalizeProductBarcodeFields(product);
    const after = buildIdentifierSnapshot(product);

    if (before === after) continue;

    await product.save({ validateBeforeSave: false });
    cleanedProducts += 1;
  }

  return cleanedProducts;
}

async function ensureIdentifierIndexes({ logger = console } = {}) {
  await ensureProductCollectionExists();

  const cleanedProducts = await cleanupIdentifierValues();
  if (cleanedProducts > 0) {
    logger.info?.(`[PRODUCT_IDENTIFIER_INDEX] Cleaned empty identifier values. Products: ${cleanedProducts}`);
  }

  const indexes = await Product.collection.indexes();
  const results = [];

  for (const config of IDENTIFIER_INDEXES) {
    const existingIndex = indexes.find((index) => index.name === config.name || isTargetIndex(index, config.field));

    if (isIndexUpToDate(existingIndex, config.field)) {
      results.push({ field: config.field, recreated: false });
      continue;
    }

    if (existingIndex) {
      await Product.collection.dropIndex(existingIndex.name);
      logger.info?.(`[PRODUCT_IDENTIFIER_INDEX] Dropped legacy ${config.label} index: ${existingIndex.name}`);
    }

    await Product.collection.createIndex(config.key, buildIndexOptions(config.field, config.name));
    logger.info?.(`[PRODUCT_IDENTIFIER_INDEX] Ensured partial unique ${config.label} index.`);
    results.push({ field: config.field, recreated: true });
  }

  return {
    cleanedProducts,
    results,
  };
}

async function ensureProductSkuIndex(options = {}) {
  return ensureIdentifierIndexes(options);
}

module.exports = {
  IDENTIFIER_INDEXES,
  ensureIdentifierIndexes,
  ensureProductSkuIndex,
};
