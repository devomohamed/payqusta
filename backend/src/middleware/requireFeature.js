const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');

/**
 * Middleware to check if the current tenant's subscription plan includes a specific feature.
 * @param {string} featureName - The name of the feature to check for (e.g., 'whatsapp_notifications')
 */
const requireFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            // Ensure tenantId is available (usually set by protect or tenantScope middleware)
            const tenantId = req.tenantId || req.user?.tenant;

            if (!tenantId) {
                return next(AppError.badRequest('معرف المتجر مطلوب للتحقق من الصلاحيات'));
            }

            // Fetch the tenant and populate the subscription plan features
            const tenant = await Tenant.findById(tenantId).populate('subscription.plan', 'features name');

            if (!tenant) {
                return next(AppError.notFound('المتجر غير موجود'));
            }

            // Check if subscription is active
            if (tenant.subscription?.status !== 'active') {
                return next(AppError.forbidden('اشتراك المتجر غير فعال. يرجى تجديد الاشتراك.'));
            }

            const features = Array.isArray(tenant.subscription?.plan?.features)
                ? tenant.subscription.plan.features
                : [];

            // If the feature is not included in the plan, return a 403 Forbidden
            if (!features.includes(featureName)) {
                return next(
                    AppError.forbidden(`هذه الخاصية (${featureName}) غير متوفرة في باقتك الحالية (${tenant.subscription?.plan?.name || 'الأساسية'}). يرجى ترقية الباقة.`)
                );
            }

            // Proceed if feature is allowed
            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requireFeature };
