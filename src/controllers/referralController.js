const Referral = require('../models/Referral');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const crypto = require('crypto');

class ReferralController {
    /**
     * GET /api/v1/referrals/my-code
     * Get or generate referral code for current tenant
     */
    getMyCode = catchAsync(async (req, res, next) => {
        let referral = await Referral.findOne({ referrer: req.tenantId, referred: null });

        if (!referral) {
            const code = `PQ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            referral = await Referral.create({
                referrer: req.tenantId,
                code,
            });
        }

        ApiResponse.success(res, { code: referral.code });
    });

    /**
     * GET /api/v1/referrals/stats
     * Get referral statistics for current tenant
     */
    getStats = catchAsync(async (req, res, next) => {
        const referrals = await Referral.find({ referrer: req.tenantId, referred: { $ne: null } })
            .populate('referred', 'name subscription.status')
            .sort('-createdAt');

        const stats = {
            totalReferred: referrals.length,
            converted: referrals.filter(r => r.status === 'converted' || r.status === 'rewarded').length,
            pendingReward: referrals.filter(r => r.status === 'converted' && !r.reward.claimed).length,
            referrals,
        };

        ApiResponse.success(res, stats);
    });

    /**
     * POST /api/v1/referrals/apply
     * Apply a referral code during registration (public)
     */
    applyCode = catchAsync(async (req, res, next) => {
        const { code, tenantId } = req.body;
        if (!code || !tenantId) return next(AppError.badRequest('كود الإحالة و ID المتجر مطلوبان'));

        const referral = await Referral.findOne({ code: code.toUpperCase() });
        if (!referral) return next(AppError.notFound('كود الإحالة غير صالح'));
        if (referral.referrer.toString() === tenantId) {
            return next(AppError.badRequest('لا يمكنك استخدام كود الإحالة الخاص بك'));
        }

        // Create a new referral record for this specific referred tenant
        const newReferral = await Referral.create({
            referrer: referral.referrer,
            referred: tenantId,
            code: `${referral.code}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
            status: 'registered',
            referredEmail: req.body.email,
        });

        ApiResponse.success(res, { referral: newReferral }, 'تم تطبيق كود الإحالة بنجاح!');
    });
}

module.exports = new ReferralController();
