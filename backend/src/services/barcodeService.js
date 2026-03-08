const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const {
  INTERNATIONAL_BARCODE_TYPES,
  BARCODE_MODES,
  BARCODE_SOURCES,
  LOCAL_BARCODE_TYPE,
  DEFAULT_BARCODE_SETTINGS,
  normalizeBarcodeValue,
  normalizeSkuValue,
  normalizeInternationalBarcodeType,
  normalizeBarcodeMode,
  normalizeBarcodeSource,
  applyTenantBarcodeSettings,
  normalizeProductBarcodeFields,
  normalizeVariantBarcodeFields,
  getTenantBarcodeSettings,
} = require('../utils/barcodeHelpers');

function buildProductLookupConditions(code) {
  const normalizedCode = normalizeBarcodeValue(code);
  if (!normalizedCode) return [];

  const conditions = [
    { localBarcode: normalizedCode },
    { internationalBarcode: normalizedCode },
    { barcode: normalizedCode },
    { 'variants.localBarcode': normalizedCode },
    { 'variants.internationalBarcode': normalizedCode },
    { 'variants.barcode': normalizedCode },
  ];

  const normalizedSku = normalizeSkuValue(normalizedCode);
  if (normalizedSku) {
    conditions.push({ sku: normalizedSku });
    conditions.push({ 'variants.sku': normalizedSku });
  }

  return conditions;
}

function collectProductIdentifiers(product = {}) {
  const skuValues = new Set();
  const barcodeValues = new Set();

  if (product?.sku) skuValues.add(normalizeSkuValue(product.sku));
  if (product?.internationalBarcode) barcodeValues.add(normalizeBarcodeValue(product.internationalBarcode));
  if (product?.barcode) barcodeValues.add(normalizeBarcodeValue(product.barcode));
  if (product?.localBarcode) barcodeValues.add(normalizeBarcodeValue(product.localBarcode));

  for (const variant of product?.variants || []) {
    if (variant?.sku) skuValues.add(normalizeSkuValue(variant.sku));
    if (variant?.internationalBarcode) barcodeValues.add(normalizeBarcodeValue(variant.internationalBarcode));
    if (variant?.barcode) barcodeValues.add(normalizeBarcodeValue(variant.barcode));
    if (variant?.localBarcode) barcodeValues.add(normalizeBarcodeValue(variant.localBarcode));
  }

  return {
    skuValues: [...skuValues].filter(Boolean),
    barcodeValues: [...barcodeValues].filter(Boolean),
  };
}

function validateInternalProductIdentifiers(product = {}) {
  const seenSku = new Map();
  const seenBarcode = new Map();

  const entries = [
    { label: 'SKU', value: normalizeSkuValue(product?.sku), path: 'product.sku' },
    { label: 'internationalBarcode', value: normalizeBarcodeValue(product?.internationalBarcode ?? product?.barcode), path: 'product.internationalBarcode' },
    { label: 'localBarcode', value: normalizeBarcodeValue(product?.localBarcode), path: 'product.localBarcode' },
  ];

  (product?.variants || []).forEach((variant, index) => {
    entries.push({ label: 'SKU', value: normalizeSkuValue(variant?.sku), path: `variants[${index}].sku` });
    entries.push({
      label: 'internationalBarcode',
      value: normalizeBarcodeValue(variant?.internationalBarcode ?? variant?.barcode),
      path: `variants[${index}].internationalBarcode`,
    });
    entries.push({ label: 'localBarcode', value: normalizeBarcodeValue(variant?.localBarcode), path: `variants[${index}].localBarcode` });
  });

  for (const entry of entries) {
    if (!entry.value) continue;

    if (entry.label === 'SKU') {
      if (seenSku.has(entry.value)) {
        throw AppError.conflict(`كود SKU "${entry.value}" مكرر داخل نفس المنتج`);
      }
      seenSku.set(entry.value, entry.path);
      continue;
    }

    if (seenBarcode.has(entry.value)) {
      throw AppError.conflict(`الباركود "${entry.value}" مكرر داخل نفس المنتج`);
    }
    seenBarcode.set(entry.value, entry.path);
  }
}

async function findIdentifierCollision({ tenantId, product, excludeProductId = null }) {
  const { skuValues, barcodeValues } = collectProductIdentifiers(product);
  if (skuValues.length === 0 && barcodeValues.length === 0) return null;

  const query = {
    tenant: tenantId,
    ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
    $or: [
      ...(skuValues.length > 0
        ? [
          { sku: { $in: skuValues } },
          { 'variants.sku': { $in: skuValues } },
        ]
        : []),
      ...(barcodeValues.length > 0
        ? [
          { barcode: { $in: barcodeValues } },
          { internationalBarcode: { $in: barcodeValues } },
          { localBarcode: { $in: barcodeValues } },
          { 'variants.barcode': { $in: barcodeValues } },
          { 'variants.internationalBarcode': { $in: barcodeValues } },
          { 'variants.localBarcode': { $in: barcodeValues } },
        ]
        : []),
    ],
  };

  if (query.$or.length === 0) return null;
  return Product.findOne(query).select('name sku barcode internationalBarcode localBarcode variants');
}

function getCollisionMessage(existingProduct, product = {}) {
  const { skuValues, barcodeValues } = collectProductIdentifiers(product);
  const existingCodes = collectProductIdentifiers(existingProduct);

  const conflictingSku = skuValues.find((value) => existingCodes.skuValues.includes(value));
  if (conflictingSku) {
    return `كود SKU "${conflictingSku}" مستخدم بالفعل لمنتج آخر في هذا المتجر`;
  }

  const conflictingBarcode = barcodeValues.find((value) => existingCodes.barcodeValues.includes(value));
  if (conflictingBarcode) {
    return `الباركود "${conflictingBarcode}" مستخدم بالفعل لمنتج آخر في هذا المتجر`;
  }

  return 'هناك كود مستخدم بالفعل لمنتج آخر في هذا المتجر';
}

async function assertProductIdentifiersUnique({ tenantId, product, excludeProductId = null }) {
  validateInternalProductIdentifiers(product);
  const existingProduct = await findIdentifierCollision({ tenantId, product, excludeProductId });
  if (!existingProduct) return;
  throw AppError.conflict(getCollisionMessage(existingProduct, product));
}

function formatLocalBarcode(counter) {
  return String(counter).padStart(12, '0').slice(-12);
}

async function generateLocalBarcode({ tenantId, excludeProductId = null, maxAttempts = 25 }) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const tenant = await Tenant.findOneAndUpdate(
      { _id: tenantId },
      { $inc: { 'settings.barcode.localBarcodeCounter': 1 } },
      {
        new: true,
        projection: { 'settings.barcode.localBarcodeCounter': 1 },
      }
    ).lean();

    const counter = Number(tenant?.settings?.barcode?.localBarcodeCounter) || 0;
    const localBarcode = formatLocalBarcode(counter);
    const collision = await findIdentifierCollision({
      tenantId,
      excludeProductId,
      product: { localBarcode },
    });

    if (!collision) {
      return localBarcode;
    }
  }

  throw AppError.internal('تعذر توليد باركود محلي فريد، يرجى إعادة المحاولة');
}

async function maybeAssignGeneratedLocalBarcode({ tenantId, tenantSettings, product, excludeProductId = null }) {
  const settings = tenantSettings || DEFAULT_BARCODE_SETTINGS;
  const localEnabled = settings.mode === 'both' || settings.mode === 'local_only';
  if (!localEnabled || !settings.autoGenerateLocalBarcode || product?.localBarcode) {
    return product;
  }

  product.localBarcode = await generateLocalBarcode({ tenantId, excludeProductId });
  product.localBarcodeType = LOCAL_BARCODE_TYPE;
  return product;
}

async function findProductByCode({ tenantFilter = {}, code, includeSuspended = false }) {
  const lookupConditions = buildProductLookupConditions(code);
  if (!lookupConditions.length) return null;

  return Product.findOne({
    ...tenantFilter,
    isActive: true,
    ...(includeSuspended ? {} : { isSuspended: { $ne: true } }),
    $or: lookupConditions,
  }).populate('supplier', 'name contactPerson phone');
}

module.exports = {
  INTERNATIONAL_BARCODE_TYPES,
  BARCODE_MODES,
  BARCODE_SOURCES,
  LOCAL_BARCODE_TYPE,
  DEFAULT_BARCODE_SETTINGS,
  normalizeBarcodeValue,
  normalizeSkuValue,
  normalizeInternationalBarcodeType,
  normalizeBarcodeMode,
  normalizeBarcodeSource,
  getTenantBarcodeSettings,
  applyTenantBarcodeSettings,
  normalizeProductBarcodeFields,
  normalizeVariantBarcodeFields,
  buildProductLookupConditions,
  collectProductIdentifiers,
  assertProductIdentifiersUnique,
  generateLocalBarcode,
  maybeAssignGeneratedLocalBarcode,
  findProductByCode,
};
