/**
 * Revenue Analytics Controller
 * Provides key business metrics for Super Admin dashboard
 */
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const { subDays } = require('date-fns');

class RevenueAnalyticsController {
    /**
     * GET /api/v1/admin/analytics/revenue
     * Main revenue analytics endpoint
     */
    getRevenueAnalytics = catchAsync(async (req, res) => {
        const now = new Date();

        // --- 1. DAU / WAU ---
        const dau = await User.countDocuments({ lastLogin: { $gte: subDays(now, 1) } });
        const wau = await User.countDocuments({ lastLogin: { $gte: subDays(now, 7) } });

        // --- 2. Trial to Paid Conversion ---
        const totalTenants = await Tenant.countDocuments();
        const paidTenants = await Tenant.countDocuments({ 'subscription.status': 'active' });
        const trialTenants = await Tenant.countDocuments({ 'subscription.status': 'trial' });
        const conversionRate = totalTenants > 0 ? ((paidTenants / totalTenants) * 100).toFixed(1) : 0;

        // --- 3. ARPU (Average Revenue Per User) & MRR ---
        const paidTenantsData = await Tenant.find({ 'subscription.status': 'active' })
            .populate('subscription.plan', 'price billingCycle');

        let totalMRR = 0;
        for (const t of paidTenantsData) {
            const plan = t.subscription?.plan;
            if (plan?.price) {
                const monthly = plan.billingCycle === 'yearly' ? plan.price / 12 : plan.price;
                totalMRR += monthly;
            }
        }
        const arpu = paidTenants > 0 ? (totalMRR / paidTenants).toFixed(2) : 0;

        // --- 4. Revenue this month vs last month ---
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const revenueThisMonth = await Invoice.aggregate([
            { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]);
        const revenueLastMonth = await Invoice.aggregate([
            { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]);

        const thisMonthRev = revenueThisMonth[0]?.total || 0;
        const lastMonthRev = revenueLastMonth[0]?.total || 0;
        const revenueGrowth = lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : 0;

        // --- 5. Churn (simple: inactive in last 30 days after being active) ---
        const churned = await Tenant.countDocuments({
            'subscription.status': { $in: ['expired', 'cancelled'] },
            'subscription.endDate': { $gte: subDays(now, 30) },
        });
        const churnRate = totalTenants > 0 ? ((churned / totalTenants) * 100).toFixed(1) : 0;

        // --- 6. Tenant growth over last 6 months ---
        const sixMonthsAgo = subDays(now, 180);
        const growthData = await Tenant.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        ApiResponse.success(res, {
            activity: { dau, wau },
            tenants: { total: totalTenants, paid: paidTenants, trial: trialTenants },
            conversion: { rate: parseFloat(conversionRate) },
            revenue: {
                mrr: totalMRR,
                arpu: parseFloat(arpu),
                thisMonth: thisMonthRev,
                lastMonth: lastMonthRev,
                growth: parseFloat(revenueGrowth),
            },
            churn: { count: churned, rate: parseFloat(churnRate) },
            growthOverTime: growthData,
        });
    });
}

module.exports = new RevenueAnalyticsController();
