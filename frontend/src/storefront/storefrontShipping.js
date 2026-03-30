const DEFAULT_ZONES = [
  { code: 'cairo', label: 'القاهرة', fee: 45, estimatedDaysMin: 1, estimatedDaysMax: 2 },
  { code: 'giza', label: 'الجيزة', fee: 45, estimatedDaysMin: 1, estimatedDaysMax: 2 },
  { code: 'alexandria', label: 'الإسكندرية', fee: 60, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { code: 'delta', label: 'الدلتا', fee: 65, estimatedDaysMin: 2, estimatedDaysMax: 4 },
  { code: 'canal', label: 'مدن القناة', fee: 70, estimatedDaysMin: 2, estimatedDaysMax: 4 },
  { code: 'upper-egypt', label: 'الصعيد', fee: 85, estimatedDaysMin: 3, estimatedDaysMax: 5 },
  { code: 'frontier', label: 'المحافظات الحدودية', fee: 110, estimatedDaysMin: 4, estimatedDaysMax: 6 },
];

function normalizeCode(value, fallback = 'zone-1') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

function formatEtaLabel(minDays, maxDays) {
  const min = toNumber(minDays, 0);
  const max = Math.max(toNumber(maxDays, min), min);

  if (max === 0) {
    return 'سيتم تأكيد الموعد بعد مراجعة الطلب';
  }

  if (min === max) {
    return `خلال ${max} يوم عمل`;
  }

  return `خلال ${min}-${max} أيام عمل`;
}

function normalizeZone(zone = {}, index = 0) {
  const label = String(zone.label || zone.name || '').trim();
  if (!label) return null;

  const estimatedDaysMin = toNumber(zone.estimatedDaysMin, 0);
  const estimatedDaysMax = Math.max(toNumber(zone.estimatedDaysMax, estimatedDaysMin), estimatedDaysMin);

  return {
    code: normalizeCode(zone.code || zone.value || label, `zone-${index + 1}`),
    label,
    fee: toNumber(zone.fee, 0),
    estimatedDaysMin,
    estimatedDaysMax,
    eta: zone.eta || formatEtaLabel(estimatedDaysMin, estimatedDaysMax),
    isActive: zone.isActive !== false,
  };
}

export function resolveStorefrontShippingSettings(rawSettings = {}) {
  const zones = Array.isArray(rawSettings?.zones) && rawSettings.zones.length > 0
    ? rawSettings.zones.map((zone, index) => normalizeZone(zone, index)).filter(Boolean)
    : DEFAULT_ZONES.map((zone, index) => normalizeZone(zone, index)).filter(Boolean);

  const estimatedDaysMin = toNumber(rawSettings?.estimatedDaysMin, 1);
  const estimatedDaysMax = Math.max(toNumber(rawSettings?.estimatedDaysMax, 3), estimatedDaysMin);

  return {
    enabled: rawSettings?.enabled !== false,
    pricingMode: rawSettings?.pricingMode === 'dynamic_api' ? 'dynamic_api' : 'fixed_zones',
    defaultShippingBranchId: rawSettings?.defaultShippingBranchId || null,
    provider: rawSettings?.provider || 'local',
    providerDisplayName: rawSettings?.providerDisplayName || 'شحن محلي',
    defaultMethodName: rawSettings?.defaultMethodName || 'توصيل قياسي',
    supportsCashOnDelivery: rawSettings?.supportsCashOnDelivery !== false,
    baseFee: toNumber(rawSettings?.baseFee, 50),
    freeShippingThreshold: toNumber(rawSettings?.freeShippingThreshold, 500),
    estimatedDaysMin,
    estimatedDaysMax,
    eta: formatEtaLabel(estimatedDaysMin, estimatedDaysMax),
    requiredAddressFields: Array.isArray(rawSettings?.requiredAddressFields)
      ? rawSettings.requiredAddressFields
      : (rawSettings?.pricingMode === 'dynamic_api' ? ['governorate', 'city'] : ['governorate']),
    zones: zones.filter((zone) => zone.isActive !== false),
  };
}

export function findStorefrontShippingZone(zones = [], value = '') {
  if (!value) return null;

  const normalizedValue = normalizeCode(value);
  const normalizedLabel = String(value || '').trim();

  return zones.find((zone) =>
    zone.code === normalizedValue ||
    String(zone.label || '').trim() === normalizedLabel
  ) || null;
}

export function buildEstimatedDeliveryDate(maxDays = 0) {
  const days = toNumber(maxDays, 0);
  if (days <= 0) return null;

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + days);
  return estimatedDate.toISOString();
}
