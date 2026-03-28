const axios = require('axios');
const Branch = require('../models/Branch');
const {
  calculateTenantShippingSummary,
  getTenantShippingSettings,
  normalizeInvoiceShippingSummary,
  sanitizeShippingText,
} = require('./shippingHelpers');

function toNonNegativeNumber(value, fallback = null) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

function toOptionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;

  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) return null;

  return Math.round(normalized);
}

function firstDefinedValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function estimateDeliveryDate(maxDays = 0) {
  const normalizedMaxDays = toOptionalPositiveInteger(maxDays);
  if (!normalizedMaxDays || normalizedMaxDays <= 0) return null;

  return new Date(Date.now() + normalizedMaxDays * 24 * 60 * 60 * 1000);
}

function normalizeDynamicProvider(value, fallback = null) {
  const normalized = sanitizeShippingText(value, {
    maxLength: 20,
    lowercase: true,
  });

  return normalized || fallback;
}

function getAddressField(value, maxLength = 120) {
  return sanitizeShippingText(value, { maxLength });
}

function buildCalculationError({
  pricingMode,
  calculationState = 'error',
  errorCode = 'SHIPPING_CALCULATION_FAILED',
  errorMessage = 'تعذر حساب تكلفة الشحن حالياً',
  retryable = false,
}) {
  return {
    ok: false,
    pricingMode,
    calculationState,
    errorCode,
    errorMessage,
    retryable,
  };
}

function buildDefaultSuccessPayload({
  pricingMode,
  shippingSummary,
  calculationState = 'success',
  isEstimated = false,
  warningMessage = '',
  shippingBranch = null,
  rawQuote = null,
}) {
  return {
    ok: true,
    pricingMode,
    calculationState,
    isEstimated,
    warningMessage,
    shippingSummary,
    shippingBranch,
    rawQuote,
  };
}

async function loadDefaultShippingBranch(tenantId, settings) {
  if (!tenantId || !settings?.defaultShippingBranchId) return null;

  return Branch.findOne({
    _id: settings.defaultShippingBranchId,
    tenant: tenantId,
    isActive: true,
    participatesInOnlineOrders: true,
  }).select('name branchType address phone shippingOrigin onlinePriority');
}

function buildDynamicRequestPayload({
  tenant,
  branch,
  shippingAddress = {},
  subtotal = 0,
  requestedSummary = {},
}) {
  return {
    tenantId: tenant?._id ? String(tenant._id) : null,
    pricingMode: 'dynamic_api',
    origin: {
      branchId: branch?._id ? String(branch._id) : null,
      branchName: branch?.name || '',
      governorate:
        getAddressField(branch?.shippingOrigin?.governorate) ||
        getAddressField(tenant?.settings?.shipping?.originGovernorate),
      city:
        getAddressField(branch?.shippingOrigin?.city) ||
        getAddressField(tenant?.settings?.shipping?.originCity),
      area: getAddressField(branch?.shippingOrigin?.area),
      addressLine:
        getAddressField(branch?.shippingOrigin?.addressLine, 240) ||
        getAddressField(branch?.address, 240) ||
        getAddressField(tenant?.settings?.shipping?.warehouseAddress, 240),
      postalCode: getAddressField(branch?.shippingOrigin?.postalCode, 40),
    },
    destination: {
      fullName: getAddressField(shippingAddress?.fullName),
      phone: getAddressField(shippingAddress?.phone, 40),
      governorate: getAddressField(shippingAddress?.governorate),
      city: getAddressField(shippingAddress?.city),
      area: getAddressField(shippingAddress?.area || shippingAddress?.city),
      addressLine: getAddressField(shippingAddress?.address, 240),
      postalCode: getAddressField(shippingAddress?.postalCode, 40),
      notes: getAddressField(shippingAddress?.notes, 240),
    },
    order: {
      subtotal: toNonNegativeNumber(subtotal, 0) || 0,
      currency: 'EGP',
    },
    requestedSummary: requestedSummary || {},
  };
}

function parseDynamicQuoteBody(responseBody = {}) {
  const body = responseBody?.data && typeof responseBody.data === 'object'
    ? responseBody.data
    : responseBody;

  const shippingFee = firstDefinedValue(
    toNonNegativeNumber(body.shippingFee),
    toNonNegativeNumber(body.shippingCost),
    toNonNegativeNumber(body.price),
    toNonNegativeNumber(body.amount),
    toNonNegativeNumber(body.cost),
    toNonNegativeNumber(body.fee)
  );

  const estimatedDaysValue = toOptionalPositiveInteger(
    firstDefinedValue(
      body.estimatedDays,
      body.etaDays,
      body.deliveryDays
    )
  );
  const estimatedDaysMin = toOptionalPositiveInteger(
    firstDefinedValue(
      body.estimatedDaysMin,
      body.minDays,
      estimatedDaysValue
    )
  );
  const estimatedDaysMax = toOptionalPositiveInteger(
    firstDefinedValue(
      body.estimatedDaysMax,
      body.maxDays,
      estimatedDaysValue,
      estimatedDaysMin
    )
  );

  return {
    body,
    shippingFee,
    carrierCost: firstDefinedValue(
      toNonNegativeNumber(body.carrierCost),
      toNonNegativeNumber(body.shippingCost),
      toNonNegativeNumber(body.cost),
      shippingFee
    ),
    shippingMethod: sanitizeShippingText(
      firstDefinedValue(body.shippingMethod, body.methodName, body.serviceName),
      { maxLength: 80 }
    ),
    provider: normalizeDynamicProvider(firstDefinedValue(body.provider, body.carrier)),
    zoneCode: sanitizeShippingText(
      firstDefinedValue(body.zoneCode, body.zone?.code, body.zoneId),
      { maxLength: 48, lowercase: true }
    ),
    zoneLabel: sanitizeShippingText(
      firstDefinedValue(body.zoneLabel, body.zone?.label, body.zoneName, body.areaName),
      { maxLength: 80 }
    ),
    estimatedDaysMin,
    estimatedDaysMax: estimatedDaysMax !== null
      ? Math.max(estimatedDaysMax, estimatedDaysMin || 0)
      : estimatedDaysMin,
    estimatedDeliveryDate: body.estimatedDeliveryDate
      ? new Date(body.estimatedDeliveryDate)
      : null,
  };
}

function buildFallbackDynamicSummary({
  settings,
  shippingAddress = {},
  fallbackPrice,
}) {
  const estimatedDaysMin = settings.estimatedDaysMin;
  const estimatedDaysMax = Math.max(settings.estimatedDaysMax, estimatedDaysMin);

  return {
    shippingFee: fallbackPrice,
    shippingDiscount: 0,
    carrierCost: fallbackPrice,
    shippingMethod: settings.defaultMethodName,
    shipmentId: '',
    trackingNumber: '',
    trackingUrl: '',
    provider: settings.provider !== 'none' ? settings.provider : null,
    zoneCode: '',
    zoneLabel:
      getAddressField(shippingAddress?.governorate) ||
      getAddressField(shippingAddress?.city),
    estimatedDaysMin,
    estimatedDaysMax,
    estimatedDeliveryDate: estimateDeliveryDate(estimatedDaysMax),
    supportsCashOnDelivery: settings.supportsCashOnDelivery,
    enabled: settings.enabled,
  };
}

function applyShippingDiscount(settings, shippingFee, shippingSummary, subtotal) {
  const shippingDiscount =
    settings.enabled &&
    settings.freeShippingThreshold > 0 &&
    toNonNegativeNumber(subtotal, 0) >= settings.freeShippingThreshold
      ? shippingFee
      : 0;

  return {
    ...shippingSummary,
    shippingFee,
    shippingDiscount,
    carrierCost:
      toNonNegativeNumber(shippingSummary.carrierCost, shippingFee) ?? shippingFee,
  };
}

function handleDynamicFailure({
  settings,
  shippingAddress,
  errorCode,
  errorMessage,
  retryable = true,
}) {
  if (settings.dynamicApi?.errorBehavior === 'use_fallback_price') {
    const fallbackPrice = toNonNegativeNumber(settings.dynamicApi?.fallbackPrice, 0) ?? 0;
    const fallbackSummary = buildFallbackDynamicSummary({
      settings,
      shippingAddress,
      fallbackPrice,
    });

    return buildDefaultSuccessPayload({
      pricingMode: 'dynamic_api',
      calculationState: 'fallback',
      isEstimated: true,
      warningMessage: 'تم استخدام سعر شحن تقديري مؤقت لحين استعادة الاتصال بمزود الشحن',
      shippingSummary: fallbackSummary,
    });
  }

  return buildCalculationError({
    pricingMode: 'dynamic_api',
    calculationState:
      settings.dynamicApi?.errorBehavior === 'block_checkout'
        ? 'blocked'
        : 'error',
    errorCode,
    errorMessage,
    retryable,
  });
}

async function resolveTenantShippingQuote(
  tenant,
  {
    shippingAddress = {},
    subtotal = 0,
    requestedSummary = {},
  } = {}
) {
  const settings = getTenantShippingSettings(tenant);
  const normalizedRequested = normalizeInvoiceShippingSummary(requestedSummary) || {};
  const tenantId = tenant?._id ? String(tenant._id) : null;

  if (!settings.enabled) {
    return buildDefaultSuccessPayload({
      pricingMode: settings.pricingMode,
      shippingSummary: calculateTenantShippingSummary(
        tenant,
        shippingAddress,
        subtotal,
        normalizedRequested
      ),
    });
  }

  if (settings.pricingMode === 'fixed_zones') {
    if (!Array.isArray(settings.zones) || settings.zones.length === 0) {
      return buildCalculationError({
        pricingMode: 'fixed_zones',
        calculationState: 'blocked',
        errorCode: 'SHIPPING_ZONES_NOT_CONFIGURED',
        errorMessage: 'لم يتم إعداد مناطق الشحن بعد',
      });
    }

    const shippingSummary = calculateTenantShippingSummary(
      tenant,
      shippingAddress,
      subtotal,
      normalizedRequested
    );

    if (!shippingSummary?.zoneCode) {
      return buildCalculationError({
        pricingMode: 'fixed_zones',
        calculationState: 'blocked',
        errorCode: 'SHIPPING_ZONE_UNMATCHED',
        errorMessage: 'الشحن غير متاح للعنوان المحدد حالياً',
      });
    }

    return buildDefaultSuccessPayload({
      pricingMode: 'fixed_zones',
      shippingSummary,
    });
  }

  const governorate = getAddressField(shippingAddress?.governorate);
  const city = getAddressField(shippingAddress?.city || shippingAddress?.area);

  if (!governorate || !city) {
    return buildCalculationError({
      pricingMode: 'dynamic_api',
      calculationState: 'blocked',
      errorCode: 'SHIPPING_ADDRESS_INCOMPLETE',
      errorMessage: 'أكمل المحافظة والمدينة أو المنطقة لحساب الشحن',
      retryable: false,
    });
  }

  if (!settings.dynamicApi?.endpoint) {
    return handleDynamicFailure({
      settings,
      shippingAddress,
      errorCode: 'SHIPPING_ENDPOINT_NOT_CONFIGURED',
      errorMessage: 'لم يتم إعداد خدمة التسعير الديناميكي بعد',
      retryable: false,
    });
  }

  const shippingBranch = await loadDefaultShippingBranch(tenantId, settings);
  if (!shippingBranch) {
    return handleDynamicFailure({
      settings,
      shippingAddress,
      errorCode: 'SHIPPING_BRANCH_NOT_CONFIGURED',
      errorMessage: 'لم يتم العثور على فرع الشحن الافتراضي',
      retryable: false,
    });
  }

  try {
    const response = await axios.post(
      settings.dynamicApi.endpoint,
      buildDynamicRequestPayload({
        tenant,
        branch: shippingBranch,
        shippingAddress,
        subtotal,
        requestedSummary: normalizedRequested,
      }),
      {
        timeout: settings.dynamicApi?.timeoutMs || 8000,
        headers: {
          'Content-Type': 'application/json',
          ...(settings.dynamicApi?.apiKey
            ? {
                Authorization: `Bearer ${settings.dynamicApi.apiKey}`,
                'x-api-key': settings.dynamicApi.apiKey,
              }
            : {}),
        },
        validateStatus: () => true,
      }
    );

    if (response.status < 200 || response.status >= 300) {
      return handleDynamicFailure({
        settings,
        shippingAddress,
        errorCode: 'SHIPPING_PROVIDER_HTTP_ERROR',
        errorMessage: `خدمة الشحن أعادت رمز ${response.status}`,
      });
    }

    const parsedQuote = parseDynamicQuoteBody(response.data);
    if (parsedQuote.shippingFee === null) {
      return handleDynamicFailure({
        settings,
        shippingAddress,
        errorCode: 'SHIPPING_PROVIDER_INVALID_RESPONSE',
        errorMessage: 'تعذر قراءة تكلفة الشحن من مزود الخدمة',
      });
    }

    const estimatedDaysMin = parsedQuote.estimatedDaysMin ?? settings.estimatedDaysMin;
    const estimatedDaysMax = Math.max(
      parsedQuote.estimatedDaysMax ?? settings.estimatedDaysMax,
      estimatedDaysMin
    );
    const baseSummary = {
      shippingFee: parsedQuote.shippingFee,
      shippingDiscount: 0,
      carrierCost: parsedQuote.carrierCost ?? parsedQuote.shippingFee,
      shippingMethod: parsedQuote.shippingMethod || settings.defaultMethodName,
      shipmentId: '',
      trackingNumber: '',
      trackingUrl: '',
      provider: parsedQuote.provider || (settings.provider !== 'none' ? settings.provider : null),
      zoneCode: parsedQuote.zoneCode || normalizedRequested.zoneCode,
      zoneLabel:
        parsedQuote.zoneLabel ||
        governorate ||
        city,
      estimatedDaysMin,
      estimatedDaysMax,
      estimatedDeliveryDate:
        parsedQuote.estimatedDeliveryDate && !Number.isNaN(parsedQuote.estimatedDeliveryDate.getTime())
          ? parsedQuote.estimatedDeliveryDate
          : estimateDeliveryDate(estimatedDaysMax),
      supportsCashOnDelivery: settings.supportsCashOnDelivery,
      enabled: settings.enabled,
    };

    const shippingSummary = applyShippingDiscount(
      settings,
      parsedQuote.shippingFee,
      baseSummary,
      subtotal
    );

    return buildDefaultSuccessPayload({
      pricingMode: 'dynamic_api',
      shippingSummary,
      shippingBranch,
      rawQuote: parsedQuote.body,
    });
  } catch (error) {
    const isTimeout = error?.code === 'ECONNABORTED';
    return handleDynamicFailure({
      settings,
      shippingAddress,
      errorCode: isTimeout
        ? 'SHIPPING_PROVIDER_TIMEOUT'
        : 'SHIPPING_PROVIDER_CONNECTION_FAILED',
      errorMessage: isTimeout
        ? 'انتهت مهلة الاتصال بخدمة الشحن، حاول مرة أخرى'
        : 'فشل الاتصال بخدمة الشحن حالياً',
    });
  }
}

module.exports = {
  resolveTenantShippingQuote,
};
