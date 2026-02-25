/**
 * Addon Controller — Premium Features Marketplace
 */
const Addon = require('../models/Addon');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

class AddonController {
    /**
     * GET /api/v1/addons
     * Get all active addons available for purchase
     */
    getAllAddons = catchAsync(async (req, res, next) => {
        const addons = await Addon.find({ isActive: true }).select('-__v');
        ApiResponse.success(res, addons);
    });

    /**
     * POST /api/v1/addons/:key/purchase
     * Simulate purchasing an addon
     */
    purchaseAddon = catchAsync(async (req, res, next) => {
        const { key } = req.params;

        const addon = await Addon.findOne({ key, isActive: true });
        if (!addon) {
            return next(AppError.notFound('الإضافة غير موجودة أو غير متاحة'));
        }

        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return next(AppError.notFound('المتجر غير موجود'));
        }

        if (tenant.addons && tenant.addons.includes(key)) {
            return next(AppError.badRequest('أنت تمتلك هذه الإضافة بالفعل'));
        }

        // TODO: In a real scenario, this would generate a payment link and wait for a webhook confirmation.
        // For now, we simulate a successful immediate purchase.
        if (!tenant.addons) tenant.addons = [];
        tenant.addons.push(key);

        await tenant.save();

        ApiResponse.success(res, {
            addon,
            tenantAddons: tenant.addons
        }, `تم شراء إضافة "${addon.name}" وتفعيلها بنجاح`);
    });
}

module.exports = new AddonController();
