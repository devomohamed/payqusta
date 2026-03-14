const SHIPPING_PROVIDERS = ['none', 'local', 'bosta', 'aramex', 'manual'];
const INVOICE_SHIPPING_PROVIDERS = ['local', 'bosta', 'aramex', 'manual'];

const DEFAULT_TENANT_SHIPPING_SETTINGS = Object.freeze({
  enabled: false,
  provider: 'local',
  providerDisplayName: '',
  apiKey: '',
  defaultMethodName: 'توصيل قياسي',
  supportsCashOnDelivery: true,
  autoCreateShipment: false,
  baseFee: 0,
  freeShippingThreshold: 0,
  estimatedDaysMin: 1,
  estimatedDaysMax: 3,
  originGovernorate: '',
  originCity: '',
  warehouseAddress: '',
  zones: [],
});

function sanitizeShippingText(value, options = {}) {
  const { maxLength = 160, lowercase = false } = options;

  if (value === undefined || value === null) return '';

  let normalized = String(value).trim();
  if (!normalized) return '';

  if (lowercase) {
    normalized = normalized.toLowerCase();
  }

  return normalized.slice(0, maxLength);
}

function toNonNegativeNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

function toOptionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;

  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) return null;

  return Math.round(normalized);
}

function normalizeShippingCode(value, fallback = 'zone-1') {
  const normalized = sanitizeShippingText(value, {
    maxLength: 48,
    lowercase: true,
  })
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

function resolveShippingZone(settings, shippingAddress = {}, requestedSummary = {}) {
  const candidateValues = [
    requestedSummary?.zoneCode,
    requestedSummary?.zoneLabel,
    shippingAddress?.governorate,
    shippingAddress?.city,
  ].filter(Boolean);

  if (!candidateValues.length || !Array.isArray(settings?.zones)) return null;

  return settings.zones.find((zone) =>
    candidateValues.some((value) => {
      const normalizedValue = normalizeShippingCode(value, '');
      const normalizedLabel = sanitizeShippingText(value, { maxLength: 80 });

      return zone.code === normalizedValue || zone.label === normalizedLabel;
    })
  ) || null;
}

function getProviderDisplayName(provider) {
  switch (provider) {
    case 'bosta':
      return 'Bosta';
    case 'aramex':
      return 'Aramex';
    case 'manual':
      return 'شحن يدوي';
    case 'local':
    default:
      return 'شحن محلي';
  }
}

function normalizeShippingZone(zone = {}, index = 0) {
  const label = sanitizeShippingText(zone.label || zone.name, { maxLength: 80 });
  if (!label) return null;

  const estimatedDaysMin = toOptionalPositiveInteger(zone.estimatedDaysMin);
  const estimatedDaysMaxValue = toOptionalPositiveInteger(zone.estimatedDaysMax);
  const estimatedDaysMax =
    estimatedDaysMaxValue !== null
      ? Math.max(estimatedDaysMaxValue, estimatedDaysMin || 0)
      : (estimatedDaysMin ?? 0);

  return {
    code: normalizeShippingCode(zone.code || zone.value || label, `zone-${index + 1}`),
    label,
    fee: toNonNegativeNumber(zone.fee, 0),
    estimatedDaysMin: estimatedDaysMin ?? 0,
    estimatedDaysMax,
    isActive: zone.isActive !== false,
  };
}

function getTenantShippingSettings(tenant) {
  const rawSettings = tenant?.settings?.shipping || {};
  const provider = SHIPPING_PROVIDERS.includes(rawSettings.provider)
    ? rawSettings.provider
    : DEFAULT_TENANT_SHIPPING_SETTINGS.provider;

  return {
    ...DEFAULT_TENANT_SHIPPING_SETTINGS,
    enabled: Boolean(rawSettings.enabled),
    provider,
    providerDisplayName:
      sanitizeShippingText(rawSettings.providerDisplayName, { maxLength: 80 }) ||
      getProviderDisplayName(provider),
    apiKey: sanitizeShippingText(rawSettings.apiKey, { maxLength: 255 }),
    defaultMethodName:
      sanitizeShippingText(rawSettings.defaultMethodName, { maxLength: 80 }) ||
      DEFAULT_TENANT_SHIPPING_SETTINGS.defaultMethodName,
    supportsCashOnDelivery:
      rawSettings.supportsCashOnDelivery === undefined
        ? DEFAULT_TENANT_SHIPPING_SETTINGS.supportsCashOnDelivery
        : Boolean(rawSettings.supportsCashOnDelivery),
    autoCreateShipment: Boolean(rawSettings.autoCreateShipment),
    baseFee: toNonNegativeNumber(
      rawSettings.baseFee,
      DEFAULT_TENANT_SHIPPING_SETTINGS.baseFee
    ),
    freeShippingThreshold: toNonNegativeNumber(
      rawSettings.freeShippingThreshold,
      DEFAULT_TENANT_SHIPPING_SETTINGS.freeShippingThreshold
    ),
    estimatedDaysMin:
      toOptionalPositiveInteger(rawSettings.estimatedDaysMin) ??
      DEFAULT_TENANT_SHIPPING_SETTINGS.estimatedDaysMin,
    estimatedDaysMax:
      Math.max(
        toOptionalPositiveInteger(rawSettings.estimatedDaysMax) ??
          DEFAULT_TENANT_SHIPPING_SETTINGS.estimatedDaysMax,
        toOptionalPositiveInteger(rawSettings.estimatedDaysMin) ??
          DEFAULT_TENANT_SHIPPING_SETTINGS.estimatedDaysMin
      ),
    originGovernorate: sanitizeShippingText(rawSettings.originGovernorate, {
      maxLength: 80,
    }),
    originCity: sanitizeShippingText(rawSettings.originCity, { maxLength: 80 }),
    warehouseAddress: sanitizeShippingText(rawSettings.warehouseAddress, {
      maxLength: 400,
    }),
    zones: Array.isArray(rawSettings.zones)
      ? rawSettings.zones
          .map((zone, index) => normalizeShippingZone(zone, index))
          .filter(Boolean)
      : [],
  };
}

function applyTenantShippingSettings(input = {}, tenant) {
  const currentSettings = getTenantShippingSettings(tenant);
  const nextSettings = { ...currentSettings, ...(input && typeof input === 'object' ? input : {}) };

  const provider = SHIPPING_PROVIDERS.includes(nextSettings.provider)
    ? nextSettings.provider
    : currentSettings.provider;
  const estimatedDaysMin =
    toOptionalPositiveInteger(nextSettings.estimatedDaysMin) ?? currentSettings.estimatedDaysMin;

  return {
    enabled: Boolean(nextSettings.enabled),
    provider,
    providerDisplayName:
      sanitizeShippingText(nextSettings.providerDisplayName, { maxLength: 80 }) ||
      getProviderDisplayName(provider),
    apiKey: sanitizeShippingText(nextSettings.apiKey, { maxLength: 255 }),
    defaultMethodName:
      sanitizeShippingText(nextSettings.defaultMethodName, { maxLength: 80 }) ||
      currentSettings.defaultMethodName,
    supportsCashOnDelivery:
      nextSettings.supportsCashOnDelivery === undefined
        ? currentSettings.supportsCashOnDelivery
        : Boolean(nextSettings.supportsCashOnDelivery),
    autoCreateShipment: Boolean(nextSettings.autoCreateShipment),
    baseFee: toNonNegativeNumber(nextSettings.baseFee, currentSettings.baseFee),
    freeShippingThreshold: toNonNegativeNumber(
      nextSettings.freeShippingThreshold,
      currentSettings.freeShippingThreshold
    ),
    estimatedDaysMin,
    estimatedDaysMax: Math.max(
      toOptionalPositiveInteger(nextSettings.estimatedDaysMax) ?? currentSettings.estimatedDaysMax,
      estimatedDaysMin
    ),
    originGovernorate: sanitizeShippingText(nextSettings.originGovernorate, {
      maxLength: 80,
    }),
    originCity: sanitizeShippingText(nextSettings.originCity, { maxLength: 80 }),
    warehouseAddress: sanitizeShippingText(nextSettings.warehouseAddress, {
      maxLength: 400,
    }),
    zones: Array.isArray(nextSettings.zones)
      ? nextSettings.zones
          .map((zone, index) => normalizeShippingZone(zone, index))
          .filter(Boolean)
      : currentSettings.zones,
  };
}

function getPublicShippingSettings(tenant) {
  const settings = getTenantShippingSettings(tenant);

  return {
    enabled: settings.enabled,
    provider: settings.provider,
    providerDisplayName: settings.providerDisplayName,
    defaultMethodName: settings.defaultMethodName,
    supportsCashOnDelivery: settings.supportsCashOnDelivery,
    baseFee: settings.baseFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    estimatedDaysMin: settings.estimatedDaysMin,
    estimatedDaysMax: settings.estimatedDaysMax,
    zones: settings.zones.filter((zone) => zone.isActive !== false),
  };
}

function normalizeInvoiceShippingSummary(summary = {}) {
  if (!summary || typeof summary !== 'object') return null;

  const shippingFee = toNonNegativeNumber(summary.shippingFee, 0);
  const shippingDiscount = Math.min(
    toNonNegativeNumber(summary.shippingDiscount, 0),
    shippingFee
  );
  const estimatedDaysMax = toOptionalPositiveInteger(summary.estimatedDaysMax);
  const estimatedDeliveryDateInput = summary.estimatedDeliveryDate
    ? new Date(summary.estimatedDeliveryDate)
    : null;
  const estimatedDeliveryDate =
    estimatedDeliveryDateInput && !Number.isNaN(estimatedDeliveryDateInput.getTime())
      ? estimatedDeliveryDateInput
      : estimatedDaysMax !== null
        ? new Date(Date.now() + estimatedDaysMax * 24 * 60 * 60 * 1000)
        : null;

  const provider = sanitizeShippingText(summary.provider, {
    maxLength: 20,
    lowercase: true,
  });

  return {
    shippingFee,
    shippingDiscount,
    carrierCost: toNonNegativeNumber(summary.carrierCost, shippingFee),
    shippingMethod: sanitizeShippingText(summary.shippingMethod, { maxLength: 80 }),
    shipmentId: sanitizeShippingText(summary.shipmentId, { maxLength: 80 }),
    trackingNumber: sanitizeShippingText(summary.trackingNumber, { maxLength: 120 }),
    trackingUrl: sanitizeShippingText(summary.trackingUrl, { maxLength: 400 }),
    provider:
      INVOICE_SHIPPING_PROVIDERS.includes(provider) ? provider : null,
    zoneCode: sanitizeShippingText(summary.zoneCode, {
      maxLength: 48,
      lowercase: true,
    }),
    zoneLabel: sanitizeShippingText(summary.zoneLabel, { maxLength: 80 }),
    estimatedDaysMin: toOptionalPositiveInteger(summary.estimatedDaysMin),
    estimatedDaysMax,
    estimatedDeliveryDate,
  };
}

function calculateTenantShippingSummary(tenant, shippingAddress = {}, subtotal = 0, requestedSummary = {}) {
  const settings = getTenantShippingSettings(tenant);
  const normalizedRequested = normalizeInvoiceShippingSummary(requestedSummary) || {};
  const matchedZone = resolveShippingZone(settings, shippingAddress, normalizedRequested);
  const shippingFee = settings.enabled ? (matchedZone?.fee ?? settings.baseFee) : 0;
  const shippingDiscount =
    settings.enabled &&
    settings.freeShippingThreshold > 0 &&
    subtotal >= settings.freeShippingThreshold
      ? shippingFee
      : 0;
  const estimatedDaysMin = matchedZone?.estimatedDaysMin ?? settings.estimatedDaysMin;
  const estimatedDaysMax = Math.max(
    matchedZone?.estimatedDaysMax ?? settings.estimatedDaysMax,
    estimatedDaysMin
  );

  return {
    shippingFee,
    shippingDiscount,
    carrierCost: normalizedRequested.carrierCost || shippingFee,
    shippingMethod:
      normalizedRequested.shippingMethod || settings.defaultMethodName,
    shipmentId: normalizedRequested.shipmentId,
    trackingNumber: normalizedRequested.trackingNumber,
    trackingUrl: normalizedRequested.trackingUrl,
    provider:
      normalizedRequested.provider ||
      (settings.provider !== 'none' ? settings.provider : null),
    zoneCode: matchedZone?.code || normalizedRequested.zoneCode,
    zoneLabel:
      matchedZone?.label ||
      shippingAddress?.governorate ||
      normalizedRequested.zoneLabel,
    estimatedDaysMin,
    estimatedDaysMax,
    estimatedDeliveryDate:
      normalizedRequested.estimatedDeliveryDate ||
      (estimatedDaysMax > 0
        ? new Date(Date.now() + estimatedDaysMax * 24 * 60 * 60 * 1000)
        : null),
    supportsCashOnDelivery: settings.supportsCashOnDelivery,
    enabled: settings.enabled,
  };
}

module.exports = {
  calculateTenantShippingSummary,
  applyTenantShippingSettings,
  DEFAULT_TENANT_SHIPPING_SETTINGS,
  getPublicShippingSettings,
  getTenantShippingSettings,
  normalizeInvoiceShippingSummary,
  sanitizeShippingText,
  SHIPPING_PROVIDERS,
};
