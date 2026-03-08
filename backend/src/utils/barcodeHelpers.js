const INTERNATIONAL_BARCODE_TYPES = ['UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'QR_CODE', 'UNKNOWN'];
const BARCODE_MODES = ['none', 'international_only', 'local_only', 'both'];
const BARCODE_SOURCES = ['none', 'international', 'local'];
const LOCAL_BARCODE_TYPE = 'CODE128';

const DEFAULT_BARCODE_SETTINGS = Object.freeze({
  mode: 'both',
  autoGenerateLocalBarcode: false,
  receiptBarcodeSource: 'none',
  deliveryBarcodeSource: 'none',
  storefrontBarcodeSearchEnabled: false,
  localBarcodeCounter: 0,
});

function normalizeBarcodeValue(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function normalizeSkuValue(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized || undefined;
}

function normalizeInternationalBarcodeType(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return INTERNATIONAL_BARCODE_TYPES.includes(normalized) ? normalized : 'UNKNOWN';
}

function normalizeBarcodeMode(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return BARCODE_MODES.includes(normalized) ? normalized : DEFAULT_BARCODE_SETTINGS.mode;
}

function normalizeBarcodeSource(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return BARCODE_SOURCES.includes(normalized) ? normalized : DEFAULT_BARCODE_SETTINGS.receiptBarcodeSource;
}

function assignOptionalValue(target, key, value) {
  if (!target || typeof target !== 'object') return;

  if (typeof target.set === 'function') {
    target.set(key, value);
    return;
  }

  if (value === undefined) {
    delete target[key];
    return;
  }

  target[key] = value;
}

function getTenantBarcodeSettings(tenant) {
  const barcodeSettings = tenant?.settings?.barcode || {};
  return {
    mode: normalizeBarcodeMode(barcodeSettings.mode),
    autoGenerateLocalBarcode: barcodeSettings.autoGenerateLocalBarcode === true,
    receiptBarcodeSource: normalizeBarcodeSource(barcodeSettings.receiptBarcodeSource),
    deliveryBarcodeSource: normalizeBarcodeSource(barcodeSettings.deliveryBarcodeSource),
    storefrontBarcodeSearchEnabled: barcodeSettings.storefrontBarcodeSearchEnabled === true,
    localBarcodeCounter: Number.isFinite(Number(barcodeSettings.localBarcodeCounter))
      ? Math.max(0, Number(barcodeSettings.localBarcodeCounter))
      : DEFAULT_BARCODE_SETTINGS.localBarcodeCounter,
  };
}

function applyTenantBarcodeSettings(input = {}, existingTenant = null) {
  const current = getTenantBarcodeSettings(existingTenant);
  return {
    mode: input.mode === undefined ? current.mode : normalizeBarcodeMode(input.mode),
    autoGenerateLocalBarcode: input.autoGenerateLocalBarcode === undefined
      ? current.autoGenerateLocalBarcode
      : Boolean(input.autoGenerateLocalBarcode),
    receiptBarcodeSource: input.receiptBarcodeSource === undefined
      ? current.receiptBarcodeSource
      : normalizeBarcodeSource(input.receiptBarcodeSource),
    deliveryBarcodeSource: input.deliveryBarcodeSource === undefined
      ? current.deliveryBarcodeSource
      : normalizeBarcodeSource(input.deliveryBarcodeSource),
    storefrontBarcodeSearchEnabled: input.storefrontBarcodeSearchEnabled === undefined
      ? current.storefrontBarcodeSearchEnabled
      : Boolean(input.storefrontBarcodeSearchEnabled),
    localBarcodeCounter: current.localBarcodeCounter,
  };
}

function normalizeVariantBarcodeFields(variant = {}) {
  const normalizedVariant = variant;
  const internationalBarcode = normalizeBarcodeValue(
    normalizedVariant.internationalBarcode ?? normalizedVariant.barcode
  );
  const localBarcode = normalizeBarcodeValue(normalizedVariant.localBarcode);
  const sku = normalizeSkuValue(normalizedVariant.sku);

  assignOptionalValue(normalizedVariant, 'sku', sku);
  assignOptionalValue(normalizedVariant, 'internationalBarcode', internationalBarcode);
  assignOptionalValue(normalizedVariant, 'barcode', internationalBarcode);
  assignOptionalValue(
    normalizedVariant,
    'internationalBarcodeType',
    internationalBarcode ? normalizeInternationalBarcodeType(normalizedVariant.internationalBarcodeType) : undefined
  );
  assignOptionalValue(normalizedVariant, 'localBarcode', localBarcode);
  assignOptionalValue(normalizedVariant, 'localBarcodeType', localBarcode ? LOCAL_BARCODE_TYPE : undefined);

  return normalizedVariant;
}

function normalizeProductBarcodeFields(product = {}) {
  const normalizedProduct = product;
  const internationalBarcode = normalizeBarcodeValue(
    normalizedProduct.internationalBarcode ?? normalizedProduct.barcode
  );
  const localBarcode = normalizeBarcodeValue(normalizedProduct.localBarcode);
  const sku = normalizeSkuValue(normalizedProduct.sku);

  assignOptionalValue(normalizedProduct, 'sku', sku);
  assignOptionalValue(normalizedProduct, 'internationalBarcode', internationalBarcode);
  assignOptionalValue(normalizedProduct, 'barcode', internationalBarcode);
  assignOptionalValue(
    normalizedProduct,
    'internationalBarcodeType',
    internationalBarcode ? normalizeInternationalBarcodeType(normalizedProduct.internationalBarcodeType) : undefined
  );
  assignOptionalValue(normalizedProduct, 'localBarcode', localBarcode);
  assignOptionalValue(normalizedProduct, 'localBarcodeType', localBarcode ? LOCAL_BARCODE_TYPE : undefined);

  if (Array.isArray(normalizedProduct.variants)) {
    normalizedProduct.variants = normalizedProduct.variants.map((variant) =>
      normalizeVariantBarcodeFields(variant)
    );
  }

  return normalizedProduct;
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
};
