/**
 * Super Admin middleware.
 * Allows either isSuperAdmin flag OR the configured system super admin email.
 */

const AppError = require('../utils/AppError');

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized('يجب تسجيل الدخول اولا'));
  }

  const systemSuperAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'super@payqusta.com').toLowerCase();
  const isSystemSuperAdminEmail = req.user?.email?.toLowerCase() === systemSuperAdminEmail;

  if (!req.user.isSuperAdmin && !isSystemSuperAdminEmail) {
    return next(AppError.forbidden('هذه الصفحة متاحة فقط لمدير النظام'));
  }

  next();
};

module.exports = { requireSuperAdmin };
