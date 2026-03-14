const Plan = require('../models/Plan');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const LEGACY_PLANS = require('../config/plans');

const DEFAULT_PRICES = {
    free: 0,
    basic: 299,
    professional: 599,
    enterprise: 1499,
};

const normalizeLegacyToPlanDoc = (key, legacy) => {
    const limits = legacy?.limits || {};
    return {
        name: legacy?.name || key,
        description: `Legacy plan: ${key}`,
        price: DEFAULT_PRICES[key] ?? 0,
        currency: 'EGP',
        billingCycle: 'monthly',
        isActive: true,
        isPopular: key === 'professional',
        features: Array.isArray(legacy?.features) ? legacy.features : [],
        limits: {
            maxProducts: Number(limits.products || 50),
            maxCustomers: Number(limits.invoices || 1000),
            maxUsers: Number(limits.users || 3),
            maxBranches: Number(limits.stores || 1),
            storageLimitMB: 1024,
        },
    };
};

const ensureDefaultPlans = async () => {
    const count = await Plan.countDocuments();
    if (count > 0) return;

    const keys = ['free', 'basic', 'professional', 'enterprise'];
    const docs = keys
        .map((key) => normalizeLegacyToPlanDoc(key, LEGACY_PLANS[key]))
        .filter((doc) => !!doc.name);

    if (docs.length > 0) {
        await Plan.insertMany(docs, { ordered: false });
    }
};

class PlanController {
    /**
     * GET /api/v1/plans
     * Public or authenticated route to list active plans
     */
    getAllPlans = catchAsync(async (req, res) => {
        const plans = await Plan.find({ isActive: true }).sort('price');
        ApiResponse.success(res, plans);
    });

    /**
     * GET /api/v1/super-admin/plans
     * Super admin route to list all plans (active + inactive)
     */
    getAllAdminPlans = catchAsync(async (req, res) => {
        await ensureDefaultPlans();
        const plans = await Plan.find().sort({ isActive: -1, price: 1, createdAt: -1 });
        ApiResponse.success(res, plans);
    });

    /**
     * SUPER ADMIN ROUTES
     */

    /**
     * POST /api/v1/super-admin/plans
     */
    createPlan = catchAsync(async (req, res) => {
        const plan = await Plan.create(req.body);
        ApiResponse.created(res, plan, 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¨Ø§Ù‚Ø© Ø¨Ù†Ø¬Ø§Ø­');
    });

    /**
     * PUT /api/v1/super-admin/plans/:id
     */
    updatePlan = catchAsync(async (req, res, next) => {
        const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!plan) return next(AppError.notFound('Ø§Ù„Ø¨Ø§Ù‚Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©'));
        ApiResponse.success(res, plan, 'ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨Ø§Ù‚Ø© Ø¨Ù†Ø¬Ø§Ø­');
    });

    /**
     * DELETE /api/v1/super-admin/plans/:id
     */
    deletePlan = catchAsync(async (req, res, next) => {
        const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!plan) return next(AppError.notFound('Ø§Ù„Ø¨Ø§Ù‚Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©'));
        ApiResponse.success(res, null, 'ØªÙ… Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø¨Ø§Ù‚Ø© Ø¨Ù†Ø¬Ø§Ø­');
    });
}

module.exports = new PlanController();

