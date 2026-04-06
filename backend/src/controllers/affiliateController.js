const AffiliateProfile = require('../models/AffiliateProfile');
const AffiliateConversion = require('../models/AffiliateConversion');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

function normalizeCode(code = '') {
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '').slice(0, 40);
}

class AffiliateController {
  getAll = catchAsync(async (req, res) => {
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (numericPage - 1) * numericLimit;

    const filter = { tenant: req.tenantId };
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { name: regex },
        { code: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [affiliates, total] = await Promise.all([
      AffiliateProfile.find(filter)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      AffiliateProfile.countDocuments(filter),
    ]);

    ApiResponse.success(res, {
      affiliates,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
      },
    });
  });

  getStats = catchAsync(async (req, res) => {
    const tenantId = req.tenantId;

    const [affiliateCounts, conversionStats] = await Promise.all([
      AffiliateProfile.aggregate([
        { $match: { tenant: req.tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AffiliateConversion.aggregate([
        { $match: { tenant: req.tenantId } },
        {
          $group: {
            _id: null,
            totalConversions: { $sum: 1 },
            totalCommission: { $sum: '$commissionAmount' },
            pendingCommission: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0],
              },
            },
            approvedCommission: {
              $sum: {
                $cond: [{ $eq: ['$status', 'approved'] }, '$commissionAmount', 0],
              },
            },
            paidCommission: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0],
              },
            },
            revenueAttributed: { $sum: '$orderTotal' },
          },
        },
      ]),
    ]);

    const counts = affiliateCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const totals = conversionStats[0] || {};

    const topAffiliates = await AffiliateConversion.aggregate([
      { $match: { tenant: tenantId } },
      {
        $group: {
          _id: '$affiliate',
          conversions: { $sum: 1 },
          revenue: { $sum: '$orderTotal' },
          commission: { $sum: '$commissionAmount' },
        },
      },
      { $sort: { revenue: -1, conversions: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'affiliateprofiles',
          localField: '_id',
          foreignField: '_id',
          as: 'affiliate',
        },
      },
      { $unwind: '$affiliate' },
      {
        $project: {
          _id: '$affiliate._id',
          name: '$affiliate.name',
          code: '$affiliate.code',
          conversions: 1,
          revenue: 1,
          commission: 1,
        },
      },
    ]);

    ApiResponse.success(res, {
      totalAffiliates: (counts.pending || 0) + (counts.active || 0) + (counts.suspended || 0),
      activeAffiliates: counts.active || 0,
      pendingAffiliates: counts.pending || 0,
      suspendedAffiliates: counts.suspended || 0,
      totalConversions: totals.totalConversions || 0,
      totalCommission: totals.totalCommission || 0,
      pendingCommission: totals.pendingCommission || 0,
      approvedCommission: totals.approvedCommission || 0,
      paidCommission: totals.paidCommission || 0,
      revenueAttributed: totals.revenueAttributed || 0,
      topAffiliates,
    });
  });

  create = catchAsync(async (req, res, next) => {
    const code = normalizeCode(req.body.code || req.body.name);
    if (!req.body.name?.trim()) {
      return next(AppError.badRequest('اسم المسوق مطلوب'));
    }
    if (!code) {
      return next(AppError.badRequest('كود الإحالة غير صالح'));
    }

    const existing = await AffiliateProfile.findOne({ tenant: req.tenantId, code });
    if (existing) {
      return next(AppError.badRequest('هذا الكود مستخدم بالفعل'));
    }

    const affiliate = await AffiliateProfile.create({
      tenant: req.tenantId,
      name: req.body.name.trim(),
      code,
      email: req.body.email,
      phone: req.body.phone,
      status: req.body.status || 'active',
      commissionType: req.body.commissionType || 'percentage',
      commissionValue: Number(req.body.commissionValue || 0),
      payoutMethod: req.body.payoutMethod || '',
      payoutDetails: req.body.payoutDetails,
      notes: req.body.notes,
      createdBy: req.user?._id,
    });

    ApiResponse.success(res, { affiliate }, 'تم إنشاء المسوق بنجاح', 201);
  });

  getById = catchAsync(async (req, res, next) => {
    const affiliate = await AffiliateProfile.findOne({ _id: req.params.id, tenant: req.tenantId })
      .populate('createdBy', 'name')
      .lean();
    if (!affiliate) return next(AppError.notFound('المسوق غير موجود'));

    const [summary] = await AffiliateConversion.aggregate([
      { $match: { tenant: req.tenantId, affiliate: affiliate._id } },
      {
        $group: {
          _id: null,
          conversions: { $sum: 1 },
          revenue: { $sum: '$orderTotal' },
          commission: { $sum: '$commissionAmount' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        },
      },
    ]);

    ApiResponse.success(res, { affiliate, summary: summary || {} });
  });

  update = catchAsync(async (req, res, next) => {
    const updates = {};
    const allowed = ['name', 'email', 'phone', 'status', 'commissionType', 'commissionValue', 'payoutMethod', 'payoutDetails', 'notes'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (req.body.code !== undefined) {
      const code = normalizeCode(req.body.code);
      if (!code) return next(AppError.badRequest('كود الإحالة غير صالح'));
      const duplicate = await AffiliateProfile.findOne({ tenant: req.tenantId, code, _id: { $ne: req.params.id } });
      if (duplicate) return next(AppError.badRequest('هذا الكود مستخدم بالفعل'));
      updates.code = code;
    }

    const affiliate = await AffiliateProfile.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      updates,
      { new: true, runValidators: true }
    );
    if (!affiliate) return next(AppError.notFound('المسوق غير موجود'));

    ApiResponse.success(res, { affiliate }, 'تم تحديث بيانات المسوق');
  });

  updateStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    if (!['pending', 'active', 'suspended'].includes(status)) {
      return next(AppError.badRequest('حالة المسوق غير صالحة'));
    }

    const affiliate = await AffiliateProfile.findOneAndUpdate(
      { _id: req.params.id, tenant: req.tenantId },
      { status },
      { new: true, runValidators: true }
    );
    if (!affiliate) return next(AppError.notFound('المسوق غير موجود'));

    ApiResponse.success(res, { affiliate }, 'تم تحديث حالة المسوق');
  });

  getConversions = catchAsync(async (req, res, next) => {
    const affiliate = await AffiliateProfile.findOne({ _id: req.params.id, tenant: req.tenantId }).lean();
    if (!affiliate) return next(AppError.notFound('المسوق غير موجود'));

    const conversions = await AffiliateConversion.find({ tenant: req.tenantId, affiliate: affiliate._id })
      .populate('invoice', 'invoiceNumber totalAmount status orderStatus createdAt')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    ApiResponse.success(res, { affiliate, conversions });
  });

  getLink = catchAsync(async (req, res, next) => {
    const affiliate = await AffiliateProfile.findOne({ _id: req.params.id, tenant: req.tenantId }).lean();
    if (!affiliate) return next(AppError.notFound('المسوق غير موجود'));

    ApiResponse.success(res, {
      affiliateId: affiliate._id,
      code: affiliate.code,
      linkPath: `?aff=${encodeURIComponent(affiliate.code)}`,
    });
  });
}

module.exports = new AffiliateController();