/**
 * Middleware to check subscription limits
 */
const Tenant = require('../models/Tenant');
const Product = require('../models/Product');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Branch = require('../models/Branch');
const AppError = require('../utils/AppError');

const checkLimit = (resource) => {
  return async (req, res, next) => {
    try {
      if (!req.tenantId && !req.tenant) {
        return next();
      }

      const tenantId = req.tenantId || req.tenant._id;
      const tenant = req.tenant || await Tenant.findById(tenantId).populate('subscription.plan');

      if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

      // 1. Check if subscription is active or in trial
      const status = tenant.subscription?.status;
      if (['suspended', 'cancelled'].includes(status)) {
        return next(AppError.forbidden('عفواً، حسابك موقوف أو تم إلغاؤه. يرجى مراجعة حالة الاشتراك.'));
      }

      if (status === 'trial') {
        const trialEnds = new Date(tenant.subscription.trialEndsAt);
        if (trialEnds < new Date()) {
          // Trial ended, should be updated to suspended or past_due by cron, but we block here anyway
          return next(AppError.forbidden('انتهت الفترة التجريبية (14 يوم). يرجى الاشتراك في باقة للاستمرار.'));
        }
      } else if (status === 'past_due') {
        return next(AppError.forbidden('يرجى سداد الفاتورة المعلقة لاستمرار الخدمة.'));
      }

      // 2. Get limits (from plan if populated, or fallback to grandfathered limits in tenant.subscription)
      const limits = {
        products: tenant.subscription?.plan?.limits?.maxProducts || tenant.subscription?.maxProducts || 50,
        customers: tenant.subscription?.plan?.limits?.maxCustomers || tenant.subscription?.maxCustomers || 100,
        users: tenant.subscription?.plan?.limits?.maxUsers || tenant.subscription?.maxUsers || 3,
        stores: tenant.subscription?.plan?.limits?.maxBranches || tenant.subscription?.maxBranches || 1,
      };

      let currentUsage = 0;
      let limit = 0;
      let resourceNameAr = '';

      switch (resource) {
        case 'product':
          limit = limits.products;
          currentUsage = await Product.countDocuments({ tenant: tenantId, isActive: true });
          resourceNameAr = 'المنتجات';
          break;
        case 'user':
          limit = limits.users;
          currentUsage = await User.countDocuments({ tenant: tenantId, isActive: true });
          resourceNameAr = 'المستخدمين';
          break;
        case 'customer':
          limit = limits.customers;
          currentUsage = await Customer.countDocuments({ tenant: tenantId, isActive: true });
          resourceNameAr = 'العملاء';
          break;
        case 'store':
        case 'branch':
          limit = limits.stores;
          currentUsage = await Branch.countDocuments({ tenant: tenantId, isActive: true });
          resourceNameAr = 'الفروع/المتاجر';
          break;
        default:
          return next();
      }

      // 3. Compare
      if (currentUsage >= limit) {
        return next(AppError.forbidden(
          `عفواً، لقد وصلت للحد الأقصى من ${resourceNameAr} المسموح به في باقتك (${limit}). يرجى ترقية الباقة لإضافة المزيد.`
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkLimit;
