/**
 * Settings Controller — Tenant & User Settings Management
 * Save store info, WhatsApp settings, notification preferences
 */

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const WhatsAppService = require('../services/WhatsAppService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

class SettingsController {

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
        businessInfo: tenant.businessInfo,
        settings: tenant.settings,
        branding: tenant.branding,
        subscription: tenant.subscription,
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
    // Find the first active tenant or by slug if provided
    const tenantId = req.query.tenant || req.headers['x-tenant-id'];
    let tenant;

    if (tenantId) {
      tenant = await Tenant.findById(tenantId);
    } else {
      tenant = await Tenant.findOne(); // Get default for now
    }

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, {
      name: tenant.name,
      businessInfo: tenant.businessInfo,
      branding: tenant.branding,
      currency: 'EGP', // Default
      taxRate: 14 // Default
    });
  });

  /**
   * PUT /api/v1/settings/store
   * Update store/business info
   */
  updateStore = catchAsync(async (req, res, next) => {
    const { name, businessInfo, cameras } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      {
        ...(name && { name }),
        ...(businessInfo && { businessInfo }),
        ...(cameras && { cameras }),
      },
      { new: true, runValidators: true }
    );

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, { tenant }, 'تم تحديث بيانات المتجر بنجاح');
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
        if (['invoice', 'statement', 'reminder', 'payment', 'restock'].includes(purpose)) {
          updateData[`whatsapp.templateNames.${purpose}`] = name;
        }
      }
    }

    // Save template language mappings if provided
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
    const { primaryColor, secondaryColor, logo, darkMode } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      req.tenantId,
      {
        branding: {
          primaryColor: primaryColor || '#6366f1',
          secondaryColor: secondaryColor || '#10b981',
          logo,
          darkMode: darkMode || false,
        },
      },
      { new: true, runValidators: true }
    );

    if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

    ApiResponse.success(res, { branding: tenant.branding }, 'تم تحديث الهوية البصرية بنجاح');
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
    await this.ensureWhatsAppAllowed(req.tenantId);
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
    await this.ensureWhatsAppAllowed(req.tenantId);
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
    await this.ensureWhatsAppAllowed(req.tenantId);

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

    ApiResponse.success(res, { categories: tenant.settings.categories }, 'تم تحديث تصنيفات المنتجات بنجاح');
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
      return next(AppError.badRequest('اسم التصنيف مطلوب'));
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
    }, `تم حذف التصنيف "${decodedCategory}" وتحويل ${productUpdate.modifiedCount} منتج إلى "${fallbackCategory}"`);
  });
}


module.exports = new SettingsController();




