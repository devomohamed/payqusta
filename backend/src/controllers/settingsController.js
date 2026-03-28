/**
 * Settings Controller — Tenant & User Settings Management
 * Save store info, WhatsApp settings, notification preferences
 */

const axios = require('axios');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const SystemConfig = require('../models/SystemConfig');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const WhatsAppService = require('../services/WhatsAppService');
const EmailService = require('../services/EmailService');
const SmsService = require('../services/SmsService');
const catchAsync = require('../utils/catchAsync');
const { ensureSystemConfig, getPlatformNotificationSettings } = require('../services/notificationConfigService');
const {
  applyTenantBarcodeSettings,
  getTenantBarcodeSettings,
} = require('../utils/barcodeHelpers');
const {
  applyTenantShippingSettings,
  getPublicShippingSettings,
  getTenantShippingSettings,
} = require('../utils/shippingHelpers');
const { resolveTenantShippingQuote } = require('../utils/shippingQuoteResolver');
const { processImage } = require('../middleware/upload');
const logger = require('../utils/logger');

const {
  buildStoreUrl,
  getPlatformRootDomain,
  getPlatformSubdomain,
  getRequestHost,
  isLocalOrRunHost,
  markCustomDomainConnected,
  normalizeCustomDomain,
  normalizeSubdomain,
} = require('../utils/tenantDomainHelpers');

const PLATFORM_ROOT_DOMAIN = getPlatformRootDomain();

const ONLINE_FULFILLMENT_MODES = new Set([
  'default_branch',
  'branch_priority',
  'customer_branch',
]);
const SHIPPING_ERROR_BEHAVIORS = new Set([
  'show_error',
  'use_fallback_price',
  'block_checkout',
]);

function normalizeObjectIdValue(value) {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  const normalized = String(value).trim();
  return normalized || null;
}

async function applyTenantOnlineFulfillmentSettings(tenantId, onlineFulfillment = {}) {
  const branches = await Branch.find({
    tenant: tenantId,
    isActive: true,
  }).select('_id participatesInOnlineOrders');

  const activeBranchIds = new Set(branches.map((branch) => String(branch._id)));
  const onlineBranchIds = new Set(
    branches
      .filter((branch) => branch.participatesInOnlineOrders)
      .map((branch) => String(branch._id))
  );

  const defaultOnlineBranchId = normalizeObjectIdValue(onlineFulfillment.defaultOnlineBranchId);
  const branchPriorityOrder = [...new Set(
    (Array.isArray(onlineFulfillment.branchPriorityOrder) ? onlineFulfillment.branchPriorityOrder : [])
      .map((branchId) => normalizeObjectIdValue(branchId))
      .filter((branchId) => branchId && activeBranchIds.has(branchId))
  )];

  return {
    mode: ONLINE_FULFILLMENT_MODES.has(onlineFulfillment.mode)
      ? onlineFulfillment.mode
      : 'branch_priority',
    defaultOnlineBranchId:
      defaultOnlineBranchId && activeBranchIds.has(defaultOnlineBranchId)
        ? defaultOnlineBranchId
        : null,
    branchPriorityOrder,
    allowCrossBranchOnlineAllocation: Boolean(onlineFulfillment.allowCrossBranchOnlineAllocation),
    allowMixedBranchOrders:
      Boolean(onlineFulfillment.allowMixedBranchOrders) &&
      Boolean(onlineFulfillment.allowCrossBranchOnlineAllocation) &&
      onlineBranchIds.size > 1,
  };
}

async function listEligibleShippingBranches(tenantId) {
  return Branch.find({
    tenant: tenantId,
    isActive: true,
    participatesInOnlineOrders: true,
  })
    .select('name address branchType onlinePriority shippingOrigin participatesInOnlineOrders')
    .sort({ onlinePriority: 1, name: 1 });
}

class SettingsController {

  /**
   * POST /api/v1/settings/logo
   * Upload store logo and return URL
   */
  uploadLogo = catchAsync(async (req, res, next) => {
    if (!req.file) return next(AppError.badRequest('يرجى اختيار صورة للشعار'));

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    const logoUrl = await processImage(req.file.buffer, req.file.originalname, 'logos', req.file.mimetype);

    // Save logo URL to tenant branding
    tenant.branding = {
      ...tenant.branding,
      logo: logoUrl,
    };
    await tenant.save();

    ApiResponse.success(res, { logoUrl, branding: tenant.branding }, 'تم رفع الشعار بنجاح');
  });

  /**
   * GET /api/v1/settings
   * Get all settings for current tenant
   */
  getSettings = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    logger.info(`[GET_SETTINGS] Tenant ${req.tenantId} categories:`, tenant.settings?.categories);

    const user = req.user ? await User.findById(req.user._id).select('-password') : null;

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    ApiResponse.success(res, {
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        storeUrl: buildStoreUrl(tenant.slug),
        platformRootDomain: PLATFORM_ROOT_DOMAIN,
        businessInfo: tenant.businessInfo,
        settings: tenant.settings,
        branding: tenant.branding,
        customDomain: tenant.customDomain,
        customDomainStatus: tenant.customDomainStatus,
        customDomainLastCheckedAt: tenant.customDomainLastCheckedAt,
        subscription: tenant.subscription,
        notificationChannels: req.user ? tenant.notificationChannels : undefined,
        notificationBranding: req.user ? tenant.notificationBranding : undefined,
        whatsapp: req.user ? tenant.whatsapp : undefined, // Only show WhatsApp full config to logged in users
      },
      user: user ? {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      } : null,
    });
  });

  /**
   * GET /api/v1/storefront/settings
   * Get public settings for the storefront
   */
  getStorefrontSettings = catchAsync(async (req, res, next) => {
    const tenantId = req.query.tenant || req.headers['x-tenant-id'];
    const requestedSlug = String(
      req.query.slug ||
      req.query.tenantSlug ||
      req.query.storeCode ||
      req.headers['x-tenant-slug'] ||
      ''
    ).trim().toLowerCase();
    const requestHost = getRequestHost(req);
    const platformSubdomain = getPlatformSubdomain(requestHost);
    let tenant;

    if (tenantId) {
      tenant = await Tenant.findById(tenantId);
    } else if (requestedSlug) {
      tenant = await Tenant.findOne({ slug: requestedSlug, isActive: true });
    } else if (platformSubdomain) {
      tenant = await Tenant.findOne({ slug: platformSubdomain, isActive: true });
    } else if (!isLocalOrRunHost(requestHost)) {
      tenant = await Tenant.findOne({ customDomain: requestHost, isActive: true });
      if (tenant) {
        markCustomDomainConnected(Tenant, tenant._id);
      }
    } else {
      // No identifier provided and host is not a platform subdomain or custom domain
      return next(AppError.notFound('المتجر غير موجود'));
    }

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, {
      tenantId: tenant._id,
      slug: tenant.slug,
      storeUrl: buildStoreUrl(tenant.slug),
      store: {
        name: tenant.name,
        address: tenant.businessInfo?.address || '',
        phone: tenant.businessInfo?.phone || '',
        email: tenant.businessInfo?.email || '',
      },
      name: tenant.name,
      businessInfo: tenant.businessInfo,
      branding: tenant.branding,
      settings: {
        barcode: getTenantBarcodeSettings(tenant),
        shipping: getPublicShippingSettings(tenant),
        installments: tenant.settings?.installments,
      },
      currency: tenant.settings?.currency || 'EGP',
      taxRate: 14 // Default
    });
  });

  /**
   * PUT /api/v1/settings/store
   * Update store/business info
   */
  updateStore = catchAsync(async (req, res, next) => {
    const { name, businessInfo, cameras, settings } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (businessInfo) updateData.businessInfo = businessInfo;
    if (cameras !== undefined) updateData.cameras = cameras;

    if (settings?.watermark) {
      updateData['settings.watermark'] = {
        enabled: settings.watermark.enabled,
        text: settings.watermark.text,
        position: settings.watermark.position,
        opacity: settings.watermark.opacity
      };
    }

    let tenantSettingsSnapshot = null;
    if (settings?.barcode || settings?.shipping || settings?.onlineFulfillment) {
      tenantSettingsSnapshot = await Tenant.findById(req.tenantId)
        .select('settings.barcode settings.shipping settings.onlineFulfillment');
      if (!tenantSettingsSnapshot) return next(AppError.notFound('المتجر غير موجود'));
    }

    if (settings?.barcode) {
      const tenant = await Tenant.findById(req.tenantId).select('settings.barcode');
      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));
      updateData['settings.barcode'] = applyTenantBarcodeSettings(settings.barcode, tenant);
    }

    if (settings?.shipping) {
      updateData['settings.shipping'] = applyTenantShippingSettings(
        settings.shipping,
        tenantSettingsSnapshot
      );
    }

    if (settings?.onlineFulfillment) {
      updateData['settings.onlineFulfillment'] = await applyTenantOnlineFulfillmentSettings(
        req.tenantId,
        settings.onlineFulfillment
      );
    }

    if (settings?.shiftDurationHours !== undefined) {
      updateData['settings.shiftDurationHours'] = settings.shiftDurationHours;
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, { tenant }, 'تم تحديث بيانات المتجر بنجاح');
  });

  getShippingSettings = catchAsync(async (req, res, next) => {
    const [tenant, eligibleBranches] = await Promise.all([
      Tenant.findById(req.tenantId).select('settings.shipping'),
      listEligibleShippingBranches(req.tenantId),
    ]);

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, {
      shipping: getTenantShippingSettings(tenant),
      shippingPublic: getPublicShippingSettings(tenant),
      eligibleBranches,
    });
  });

  calculateShippingQuote = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId).select('settings.shipping');
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    const quote = await resolveTenantShippingQuote(tenant, {
      shippingAddress: req.body?.shippingAddress || {},
      subtotal: Number(req.body?.subtotal) || 0,
      requestedSummary: req.body?.shippingSummary || {},
    });

    if (!quote.ok) {
      return next(new AppError(
        quote.errorMessage || 'تعذر حساب تكلفة الشحن حالياً',
        400,
        quote.errorCode || 'SHIPPING_CALCULATION_FAILED'
      ));
    }

    ApiResponse.success(res, {
      pricingMode: quote.pricingMode,
      calculationState: quote.calculationState,
      isEstimated: Boolean(quote.isEstimated),
      warningMessage: quote.warningMessage || '',
      shippingSummary: quote.shippingSummary,
      shippingBranch: quote.shippingBranch
        ? {
            _id: quote.shippingBranch._id,
            name: quote.shippingBranch.name,
            branchType: quote.shippingBranch.branchType,
            address: quote.shippingBranch.address,
            shippingOrigin: quote.shippingBranch.shippingOrigin,
          }
        : null,
    }, 'تم حساب تكلفة الشحن بنجاح');
  });

  updateShippingSettings = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId).select('settings.shipping');
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    const shipping = applyTenantShippingSettings(req.body?.shipping || {}, tenant);
    const eligibleBranches = await listEligibleShippingBranches(req.tenantId);
    const eligibleBranchIds = new Set(eligibleBranches.map((branch) => String(branch._id)));

    if (shipping.enabled && !shipping.defaultShippingBranchId) {
      return next(AppError.badRequest('يجب اختيار فرع الشحن الافتراضي أولاً'));
    }

    if (shipping.defaultShippingBranchId && !eligibleBranchIds.has(String(shipping.defaultShippingBranchId))) {
      return next(AppError.badRequest('فرع الشحن المختار غير مؤهل لطلبات الأونلاين'));
    }

    if (shipping.enabled && shipping.pricingMode === 'dynamic_api') {
      if (!shipping.dynamicApi?.endpoint) {
        return next(AppError.badRequest('يجب إدخال رابط API للتسعير الديناميكي'));
      }

      if (!SHIPPING_ERROR_BEHAVIORS.has(shipping.dynamicApi?.errorBehavior)) {
        return next(AppError.badRequest('سلوك الخطأ للشحن غير صالح'));
      }
    }

    await Tenant.findByIdAndUpdate(
      req.tenantId,
      { $set: { 'settings.shipping': shipping } },
      { new: true, runValidators: true }
    );

    ApiResponse.success(res, { shipping }, 'تم حفظ إعدادات الشحن بنجاح');
  });

  testShippingConnection = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId).select('settings.shipping');
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    const shipping = applyTenantShippingSettings(req.body?.shipping || tenant.settings?.shipping || {}, tenant);
    const endpoint = shipping.dynamicApi?.endpoint;

    if (!endpoint) {
      return next(AppError.badRequest('يجب إدخال رابط API قبل اختبار الاتصال'));
    }

    const response = await axios.get(endpoint, {
      timeout: shipping.dynamicApi?.timeoutMs || 8000,
      headers: {
        ...(shipping.dynamicApi?.apiKey ? {
          Authorization: `Bearer ${shipping.dynamicApi.apiKey}`,
          'x-api-key': shipping.dynamicApi.apiKey,
        } : {}),
      },
      validateStatus: () => true,
    });

    if (response.status >= 200 && response.status < 400) {
      return ApiResponse.success(res, {
        endpoint,
        statusCode: response.status,
      }, 'تم اختبار الاتصال بنجاح');
    }

    return next(
      AppError.badRequest(`تم الوصول للخدمة ولكنها أعادت رمز ${response.status}`)
    );
  });

  /**
   * GET /api/v1/settings/subdomain-availability
   * Check whether a storefront subdomain is available
   */
  checkSubdomainAvailability = catchAsync(async (req, res) => {
    const normalizedSubdomain = normalizeSubdomain(req.query.value);
    const existing = await Tenant.findOne({
      slug: normalizedSubdomain,
      _id: { $ne: req.tenantId },
    }).select('_id');

    const available = !existing;

    ApiResponse.success(res, {
      available,
      subdomain: normalizedSubdomain,
      storeUrl: buildStoreUrl(normalizedSubdomain),
    });
  });

  /**
   * PUT /api/v1/settings/subdomain
   * Update the tenant-owned storefront subdomain under the platform root domain
   */
  updateSubdomain = catchAsync(async (req, res, next) => {
    const normalizedSubdomain = normalizeSubdomain(req.body?.subdomain);

    const existing = await Tenant.findOne({
      slug: normalizedSubdomain,
      _id: { $ne: req.tenantId },
    }).select('_id');

    if (existing) {
      return next(AppError.badRequest('This store subdomain is already taken'));
    }

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) {
      return next(AppError.notFound('Store not found'));
    }

    tenant.slug = normalizedSubdomain;
    await tenant.save();

    ApiResponse.success(res, {
      slug: tenant.slug,
      storeUrl: buildStoreUrl(tenant.slug),
      platformRootDomain: PLATFORM_ROOT_DOMAIN,
    }, 'Store subdomain updated successfully');
  });

  /**
   * PUT /api/v1/settings/whatsapp
   * Update WhatsApp settings
   */
  updateWhatsApp = catchAsync(async (req, res, next) => {
    const { whatsappNumber, whatsappToken, whatsappPhoneId, wabaId, notifications, templateNames, templateLanguages } = req.body;
    await this.ensureWhatsAppAllowed(req.tenantId);

    const updateData = {
      'whatsapp.enabled': !!(whatsappToken && whatsappPhoneId),
      'whatsapp.phoneNumberId': whatsappPhoneId || '',
      'whatsapp.accessToken': whatsappToken || '',
      'whatsapp.phoneNumber': whatsappNumber || '',
      'whatsapp.notifications.installmentReminder': notifications?.installmentReminder ?? true,
      'whatsapp.notifications.invoiceCreated': notifications?.invoiceCreated ?? true,
      'whatsapp.notifications.lowStockAlert': notifications?.lowStock ?? true,
      'whatsapp.notifications.supplierPaymentDue': notifications?.supplierReminder ?? true,
    };

    // Save WABA ID if provided
    if (wabaId !== undefined) {
      updateData['whatsapp.wabaId'] = wabaId;
    }

    // Save template name mappings if provided
    if (templateNames) {
      for (const [purpose, name] of Object.entries(templateNames)) {
        if (['invoice', 'statement', 'reminder', 'payment', 'restock', 'activation'].includes(purpose)) {
          updateData[`whatsapp.templateNames.${purpose}`] = name;
        }
      }
    }

    // Save template language mappings if provided
    if (templateLanguages) {
      for (const [purpose, lang] of Object.entries(templateLanguages)) {
        if (['invoice', 'statement', 'reminder', 'payment', 'restock', 'activation'].includes(purpose)) {
          updateData[`whatsapp.templateLanguages.${purpose}`] = lang;
        }
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    // Removed global process.env updates to ensure isolation
    // Removed WhatsAppService.refreshCredentials() call

    ApiResponse.success(res, {
      whatsapp: tenant.whatsapp,
      configured: !!(whatsappToken && whatsappPhoneId),
    }, 'تم تحديث إعدادات WhatsApp بنجاح');
  });

  /**
   * PUT /api/v1/settings/branding
   * Update branding settings (colors, logo)
   */
  updateBranding = catchAsync(async (req, res, next) => {
    const { primaryColor, secondaryColor, logo, darkMode, customDomain } = req.body;
    const normalizedCustomDomain = normalizeCustomDomain(customDomain);

    const tenant = await Tenant.findById(req.tenantId);

    if (!tenant) return next(AppError.notFound('Store not found'));

    tenant.branding = {
      primaryColor: primaryColor || '#6366f1',
      secondaryColor: secondaryColor || '#10b981',
      logo,
      darkMode: darkMode || false,
    };

    if (normalizedCustomDomain !== undefined) {
      tenant.customDomain = normalizedCustomDomain;
      if (normalizedCustomDomain) {
        tenant.customDomainStatus = 'pending';
      } else {
        tenant.customDomainStatus = 'not_configured';
        tenant.customDomainLastCheckedAt = null;
      }
    }

    await tenant.save();

    ApiResponse.success(res, {
      branding: tenant.branding,
      customDomain: tenant.customDomain,
      customDomainStatus: tenant.customDomainStatus,
      customDomainLastCheckedAt: tenant.customDomainLastCheckedAt,
    }, 'Branding settings updated successfully');
  });

  getNotificationChannelsStatus = catchAsync(async (req, res, next) => {
    const [tenant, systemConfig] = await Promise.all([
      Tenant.findById(req.tenantId),
      ensureSystemConfig(),
    ]);

    if (!tenant) return next(AppError.notFound('Store not found'));

    const notifications = getPlatformNotificationSettings(systemConfig);
    const platformEmail = notifications?.platformEmail || {};
    const platformSms = notifications?.platformSms || {};

    const platformStatus = {
      defaults: notifications?.defaults || {},
      tenantPolicy: notifications?.tenantPolicy || {},
      platformEmail: {
        enabled: !!platformEmail.enabled,
        configured: Boolean(
          (platformEmail.host && platformEmail.user && platformEmail.pass)
          || (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
          || process.env.NODE_ENV !== 'production'
        ),
      },
      platformSms: {
        enabled: !!platformSms.enabled,
        configured: Boolean(platformSms.provider === 'mock' || platformSms.baseUrl),
      },
    };

    ApiResponse.success(res, {
      tenant: {
        notificationChannels: tenant.notificationChannels || {},
        notificationBranding: tenant.notificationBranding || {},
      },
      platform: platformStatus,
    });
  });

  updateNotificationChannels = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return next(AppError.notFound('Store not found'));

    const nextChannels = req.body?.notificationChannels || {};
    const nextBranding = req.body?.notificationBranding || {};

    tenant.set('notificationChannels', {
      ...(tenant.notificationChannels?.toObject?.() || tenant.notificationChannels || {}),
      ...nextChannels,
      email: {
        ...(tenant.notificationChannels?.email?.toObject?.() || tenant.notificationChannels?.email || {}),
        ...(nextChannels.email || {}),
      },
      sms: {
        ...(tenant.notificationChannels?.sms?.toObject?.() || tenant.notificationChannels?.sms || {}),
        ...(nextChannels.sms || {}),
      },
      routing: {
        ...(tenant.notificationChannels?.routing?.toObject?.() || tenant.notificationChannels?.routing || {}),
        ...(nextChannels.routing || {}),
      },
    });

    tenant.notificationBranding = {
      ...(tenant.notificationBranding?.toObject?.() || tenant.notificationBranding || {}),
      ...nextBranding,
    };

    await tenant.save();

    ApiResponse.success(res, {
      notificationChannels: tenant.notificationChannels,
      notificationBranding: tenant.notificationBranding,
    }, 'Notification channels updated successfully');
  });

  testNotificationEmail = catchAsync(async (req, res, next) => {
    const { email, notificationChannels, notificationBranding } = req.body;
    if (!email) return next(AppError.badRequest('Test email address is required'));

    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return next(AppError.notFound('Store not found'));

    if (notificationChannels) {
      tenant.notificationChannels = {
        ...(tenant.notificationChannels?.toObject?.() || tenant.notificationChannels || {}),
        ...notificationChannels,
      };
    }
    if (notificationBranding) {
      tenant.notificationBranding = {
        ...(tenant.notificationBranding?.toObject?.() || tenant.notificationBranding || {}),
        ...notificationBranding,
      };
    }

    const config = await EmailService.resolveTenantEmailConfig(tenant);
    const result = await EmailService.sendNotificationTestEmail({ to: email, tenant });

    ApiResponse.success(res, {
      ...result,
      configSource: config.source,
    }, result.success ? 'Test email sent successfully' : 'Test email failed');
  });

  testNotificationSms = catchAsync(async (req, res, next) => {
    const { phone, notificationChannels, notificationBranding } = req.body;

    if (!phone) return next(AppError.badRequest('يرجى إدخال رقم هاتف للاختبار'));

    logger.info(`[CONTROLLER] testNotificationSms received phone: ${phone}, channels: ${JSON.stringify(notificationChannels?.sms)}`);

    // Fetch fresh tenant data and override with unsaved changes for the test
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    if (notificationChannels?.sms) {
      tenant.notificationChannels = {
        ...(tenant.notificationChannels?.toObject?.() || tenant.notificationChannels || {}),
        sms: {
          ...tenant.notificationChannels.sms,
          ...notificationChannels.sms,
          enabled: true, // Force enabled for the test
        }
      };
    }
    if (notificationBranding) {
      tenant.notificationBranding = {
        ...(tenant.notificationBranding?.toObject?.() || tenant.notificationBranding || {}),
        ...notificationBranding,
      };
    }


    const config = await SmsService.resolveConfig(tenant);
    logger.info(`[CONTROLLER] Resolved SMS Config for Test: ${config.provider} via ${config.source}`);
    const result = await SmsService.sendTestMessage({ phone, tenant });

    ApiResponse.success(res, {
      ...result,
      configSource: config.source,
    }, result.success ? 'تم إرسال رسالة الاختبار بنجاح' : 'فشل إرسال رسالة الاختبار');
  });

  /**
   * PUT /api/v1/settings/user
   * Update current user profile
   */
  updateUser = catchAsync(async (req, res, next) => {
    const { name, email, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, phone },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    ApiResponse.success(res, { user }, 'تم تحديث بيانات المستخدم بنجاح');
  });

  /**
   * PUT /api/v1/settings/password
   * Change user password
   */
  changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(AppError.badRequest('كلمة المرور الحالية والجديدة مطلوبتين'));
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return next(AppError.badRequest('كلمة المرور الحالية غير صحيحة'));

    user.password = newPassword;
    await user.save();

    ApiResponse.success(res, null, 'تم تغيير كلمة المرور بنجاح');
  });

  /**
   * POST /api/v1/settings/whatsapp/test
   * Test WhatsApp configuration by sending a test message
   */
  testWhatsApp = catchAsync(async (req, res, next) => {
    const { phone } = req.body;
    if (!phone) return next(AppError.badRequest('رقم الهاتف مطلوب للاختبار'));

    // Get current config info
    const tenant = await Tenant.findById(req.tenantId);

    // Check if configured
    if (!WhatsAppService.isConfigured(tenant?.whatsapp)) {
      return ApiResponse.success(res, {
        success: false,
        configured: false,
        message: 'WhatsApp غير مُهيأ. يرجى إدخال Access Token و Phone Number ID في الإعدادات',
      }, 'WhatsApp غير مُهيأ');
    }

    const configInfo = {
      phoneNumberId: tenant?.whatsapp?.phoneNumberId ? `${tenant.whatsapp.phoneNumberId.substring(0, 8)}...` : 'غير موجود',
      tokenSet: !!tenant?.whatsapp?.accessToken,
      enabled: tenant?.whatsapp?.enabled,
    };

    // Send test message
    const testMessage = `✅ رسالة اختبار من PayQusta\n\nإعدادات WhatsApp تعمل بنجاح!\n\n📅 ${new Date().toLocaleString('ar-EG')}`;
    const result = await WhatsAppService.sendMessage(phone, testMessage, tenant.whatsapp);

    if (result.success) {
      ApiResponse.success(res, {
        success: true,
        configured: true,
        config: configInfo,
        messageId: result.messageId,
        message: 'تم إرسال رسالة الاختبار بنجاح ✅',
      }, 'تم إرسال رسالة الاختبار');
    } else {
      ApiResponse.success(res, {
        success: false,
        configured: true,
        config: configInfo,
        error: result.error,
        message: 'فشل إرسال الرسالة. تحقق من صحة البيانات',
      }, 'فشل إرسال رسالة الاختبار');
    }
  });

  /**
   * POST /api/v1/settings/whatsapp/topup
   * Create a checkout session / payment link for a WhatsApp top-up bundle
   */
  topupWhatsApp = catchAsync(async (req, res, next) => {
    const { packageDetails, gateway } = req.body;
    await this.ensureWhatsAppAllowed(req.tenantId);
    // packageDetails could be e.g. { messages: 1000, price: 500 }

    // For now, auto-approve topup for testing logic (till gateway is fully wired)
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    if (!tenant.whatsapp.quota) {
      tenant.whatsapp.quota = { limit: 0, used: 0 };
    }

    const addedMessages = packageDetails?.messages || 500;
    tenant.whatsapp.quota.limit += addedMessages;
    await tenant.save();

    ApiResponse.success(res, {
      whatsapp: tenant.whatsapp,
      addedMessages
    }, `تم إضافة ${addedMessages} رسالة إلى رصيدك بنجاح (وضع تجريبي)`);
  });

  /**
   * GET /api/v1/settings/whatsapp/templates
   * Get all WhatsApp Templates from Meta account
   */
  checkWhatsAppTemplates = catchAsync(async (req, res, next) => {
    // Get tenant whatsapp config for dynamic WABA_ID and template names
    const tenant = await Tenant.findById(req.tenantId);
    const tenantWhatsapp = tenant?.whatsapp;

    // Check if WhatsApp is configured
    if (!WhatsAppService.isConfigured(tenantWhatsapp)) {
      return ApiResponse.success(res, {
        success: false,
        configured: false,
        message: 'WhatsApp غير مُهيأ. يرجى إدخال Access Token و Phone Number ID في الإعدادات',
      }, 'WhatsApp غير مُهيأ');
    }

    // Get tenant whatsapp config for dynamic WABA_ID and template names
    const wabaId = tenantWhatsapp?.wabaId; // Removed fallback to process.env.WABA_ID for isolation
    // Assuming WabaId is strictly from tenant now, or enforced via setup

    // Fetch real templates from Meta
    const result = await WhatsAppService.getTemplates(wabaId, tenantWhatsapp);

    if (result.success) {
      ApiResponse.success(res, result, `تم جلب ${result.totalOnAccount} قالب من WABA ${result.wabaId}`);
    } else {
      ApiResponse.success(res, result, result.message || 'فشل جلب القوالب');
    }
  });

  /**
   * POST /api/v1/settings/whatsapp/create-templates
   * Create all required WhatsApp templates on Meta
   */
  createWhatsAppTemplates = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId);

    if (!WhatsAppService.isConfigured(tenant?.whatsapp)) {
      return ApiResponse.success(res, {
        success: false,
        configured: false,
        message: 'WhatsApp غير مُهيأ',
      }, 'WhatsApp غير مُهيأ');
    }

    const wabaId = tenant?.whatsapp?.wabaId || process.env.WABA_ID;

    const result = await WhatsAppService.createAllTemplates(wabaId);
    ApiResponse.success(res, result, `تم إنشاء ${result.created} قالب من ${result.created + result.failed}`);
  });

  /**
   * POST /api/v1/settings/whatsapp/detect-templates
   * Auto-detect templates from a WABA and return mapping
   */
  detectTemplates = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId);

    if (!WhatsAppService.isConfigured(tenant?.whatsapp)) {
      return ApiResponse.success(res, {
        success: false,
        configured: false,
        message: 'WhatsApp غير مُهيأ',
      }, 'WhatsApp غير مُهيأ');
    }

    const { wabaId } = req.body;
    // const tenant = await Tenant.findById(req.tenantId); // Already valid above
    const targetWabaId = wabaId || tenant?.whatsapp?.wabaId; // Removed process.env fallback

    if (!targetWabaId) {
      return ApiResponse.success(res, {
        success: false,
        message: 'WABA_ID مطلوب — أضفه في حقل WABA ID أو .env',
      }, 'WABA_ID مطلوب');
    }

    const result = await WhatsAppService.autoDetectTemplates(targetWabaId);

    if (result.success) {
      ApiResponse.success(res, result, `تم جلب ${result.totalTemplates} قالب — ${result.approvedCount} معتمد`);
    } else {
      ApiResponse.success(res, result, result.message || 'فشل جلب القوالب');
    }
  });

  /**
   * POST /api/v1/settings/whatsapp/apply-templates
   * Apply auto-detected template mapping to tenant settings
   */
  applyTemplateMapping = catchAsync(async (req, res, next) => {
    const { wabaId, templateNames, templateLanguages } = req.body;

    const updateData = {};
    if (wabaId) updateData['whatsapp.wabaId'] = wabaId;

    if (templateNames) {
      for (const [purpose, name] of Object.entries(templateNames)) {
        if (['invoice', 'statement', 'reminder', 'payment', 'restock'].includes(purpose)) {
          updateData[`whatsapp.templateNames.${purpose}`] = name;
        }
      }
    }

    if (templateLanguages) {
      for (const [purpose, lang] of Object.entries(templateLanguages)) {
        if (['invoice', 'statement', 'reminder', 'payment', 'restock'].includes(purpose)) {
          updateData[`whatsapp.templateLanguages.${purpose}`] = lang;
        }
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    // Removed global env update for WABA_ID

    ApiResponse.success(res, {
      whatsapp: tenant.whatsapp,
    }, 'تم تطبيق إعدادات القوالب بنجاح');
  });

  /**
   * PUT /api/v1/settings/installments
   * Update storefront installment calculator settings
   */
  updateInstallments = catchAsync(async (req, res, next) => {
    const { enabled, installmentConfigs } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      {
        $set: {
          'settings.installments.enabled': enabled !== undefined ? enabled : true,
          'settings.installments.installmentConfigs': installmentConfigs || [],
        }
      },
      { new: true, runValidators: true }
    );

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, {
      installments: tenant.settings.installments,
    }, 'تم تحديث إعدادات نظام التقسيط بنجاح');
  });

  /**
   * PUT /api/v1/settings/categories
   * Update product categories list
   */
  updateCategories = catchAsync(async (req, res, next) => {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return next(AppError.badRequest('يجب أن تكون الفئات قائمة'));
    }

    // Filter unique and valid categories (Support strings and objects)
    const validCategories = categories
      .filter(c => {
        if (typeof c === 'string') return c.trim().length > 0;
        return c.name && typeof c.name === 'string' && c.name.trim().length > 0;
      })
      .map(c => {
        if (typeof c === 'string') return { name: c.trim(), isVisible: true };
        return { name: c.name.trim(), isVisible: c.isVisible !== false };
      });

    // Deduplicate by name
    const uniqueCategories = [];
    const seen = new Set();

    for (const cat of validCategories) {
      if (!seen.has(cat.name)) {
        seen.add(cat.name);
        uniqueCategories.push(cat);
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      { 'settings.categories': uniqueCategories },
      { new: true, runValidators: true }
    );

    logger.info(`[UPDATE_CATS] Tenant ${req.tenantId} updated categories to:`, tenant.settings.categories);

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, { categories: tenant.settings.categories }, 'تم تحديث أقسام المنتجات بنجاح');
  });

  /**
   * DELETE /api/v1/settings/categories/:name
   * Delete a product category and move associated products to 'أخرى'
   */
  deleteCategory = catchAsync(async (req, res, next) => {
    const { name } = req.params;
    const decodedCategory = decodeURIComponent(name);
    logger.info(`[SETTINGS_DEL_CAT] Delete request for: "${decodedCategory}" (Tenant: ${req.tenantId})`);

    if (!decodedCategory) {
      return next(AppError.badRequest('اسم القسم مطلوب'));
    }

    // 1. Reassign products to "أخرى"
    // We import Product model inside method to avoid circular dependency issues if any
    const Product = require('../models/Product');
    const fallbackCategory = 'أخرى';

    const productUpdate = await Product.updateMany(
      { category: decodedCategory, ...req.tenantFilter },
      { category: fallbackCategory }
    );
    logger.info(`[SETTINGS_DEL_CAT] Reassigned ${productUpdate.modifiedCount} products to "Other"`);

    // 2. Remove from tenant settings
    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      { $pull: { 'settings.categories': { name: decodedCategory } } },
      { new: true }
    );
    logger.info(`[SETTINGS_DEL_CAT] Removed from tenant settings. New list:`, tenant?.settings?.categories);

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, {
      categories: tenant.settings.categories,
      affectedProducts: productUpdate.modifiedCount
    }, `تم حذف القسم "${decodedCategory}" وتحويل ${productUpdate.modifiedCount} منتج إلى "${fallbackCategory}"`);
  });

  /**
   * POST /api/v1/settings/watermark/apply-to-all
   * Re-process every existing product image with the current watermark settings.
   */
  applyWatermarkToAll = catchAsync(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    const watermarkOptions = tenant?.settings?.watermark;
    if (!watermarkOptions?.enabled || !watermarkOptions?.text) {
      return next(AppError.badRequest('العلامة المائية غير مفعلة أو النص فارغ — فعّلها أولاً'));
    }

    const Product = require('../models/Product');
    const { processImage, readUploadedFile, deleteFile } = require('../middleware/upload');

    const products = await Product.find({ ...req.tenantFilter, isActive: true });
    let processed = 0, failed = 0;

    for (const product of products) {
      const images = product.images || [];
      const updatedImages = [];

      for (const imageUrl of images) {
        try {
          const uploadData = await readUploadedFile(imageUrl);
          if (!uploadData?.buffer) { updatedImages.push(imageUrl); continue; }

          const filename = `product-wm-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
          const newPath = await processImage(uploadData.buffer, filename, 'products', 'image/webp', watermarkOptions);
          updatedImages.push(newPath);
          processed++;

          await deleteFile(imageUrl);
        } catch (err) {
          logger.error(`[WM_APPLY] ${imageUrl}: ${err.message}`);
          updatedImages.push(imageUrl);
          failed++;
        }
      }

      product.images = updatedImages;
      if (product.thumbnail && images.includes(product.thumbnail)) {
        const idx = images.indexOf(product.thumbnail);
        if (updatedImages[idx]) product.thumbnail = updatedImages[idx];
      }
      await product.save({ validateBeforeSave: false });
    }

    ApiResponse.success(res, { processed, failed, totalProducts: products.length },
      `تم تطبيق العلامة المائية على ${processed} صورة${failed > 0 ? ` (${failed} فشلت)` : ''}`
    );
  });

  /**
   * GET /api/v1/settings/cameras/proxy?url=...
   * Proxy MJPEG stream to bypass Mixed Content & CORS
   */
  proxyCamera = catchAsync(async (req, res, next) => {
    const { url } = req.query;
    if (!url) return next(AppError.badRequest('Camera URL is required'));

    try {
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'Accept': 'multipart/x-mixed-replace, */*'
        }
      });

      // Pass through headers
      if (response.headers['content-type']) {
        res.set('Content-Type', response.headers['content-type']);
      }
      if (response.headers['boundary']) {
        res.set('Boundary', response.headers['boundary']);
      }

      response.data.pipe(res);

      req.on('close', () => {
        if (response.data.destroy) response.data.destroy();
      });
    } catch (error) {
      logger.error(`[CAMERA_PROXY_ERROR] ${error.message} for URL: ${url}`);
      return next(AppError.badRequest(`تعذر الاتصال بالكاميرا: ${error.message}`));
    }
  });
}

module.exports = new SettingsController();


