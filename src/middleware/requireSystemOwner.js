const AppError = require('../utils/AppError');

const requireSystemOwner = (req, res, next) => {
    if (!req.user) {
        return next(AppError.unauthorized('يجب تسجيل الدخول اولا'));
    }

    const systemOwnerEmail = (process.env.SUPER_ADMIN_EMAIL || 'super@payqusta.com').toLowerCase();
    const currentEmail = req.user?.email?.toLowerCase();

    if (currentEmail !== systemOwnerEmail) {
        return next(AppError.forbidden('هذه العملية متاحة فقط لصاحب النظام'));
    }

    return next();
};

module.exports = { requireSystemOwner };
