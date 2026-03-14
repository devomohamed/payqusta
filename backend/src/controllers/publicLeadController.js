const PublicLead = require('../models/PublicLead');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value, maxLength = 3000) => String(value || '').trim().slice(0, maxLength);

class PublicLeadController {
  createLead = catchAsync(async (req, res, next) => {
    const honeypot = normalizeText(req.body?.website, 255);
    if (honeypot) {
      return ApiResponse.success(res, { accepted: true }, 'تم استلام طلبك بنجاح');
    }

    const name = normalizeText(req.body?.name, 120);
    const email = normalizeText(req.body?.email, 160).toLowerCase();
    const phone = normalizeText(req.body?.phone, 40);
    const businessName = normalizeText(req.body?.businessName, 160);
    const message = normalizeText(req.body?.message, 3000);
    const sourcePage = normalizeText(req.body?.sourcePage, 120) || '/contact';
    const requestType = normalizeText(req.body?.requestType, 40) || 'general';
    const teamSize = normalizeText(req.body?.teamSize, 40) || 'unknown';

    if (!name || !email || !message) {
      return next(AppError.badRequest('الاسم والبريد الإلكتروني والرسالة حقول مطلوبة'));
    }

    if (!EMAIL_REGEX.test(email)) {
      return next(AppError.badRequest('يرجى إدخال بريد إلكتروني صحيح'));
    }

    if (message.length < 20) {
      return next(AppError.badRequest('يرجى كتابة تفاصيل أكثر قليلًا حتى نعرف كيف نساعدك'));
    }

    const lead = await PublicLead.create({
      name,
      email,
      phone,
      businessName,
      requestType: ['demo', 'pricing', 'migration', 'partnership', 'general'].includes(requestType) ? requestType : 'general',
      teamSize: ['solo', 'small', 'medium', 'large', 'enterprise', 'unknown'].includes(teamSize) ? teamSize : 'unknown',
      message,
      sourcePage,
      submittedAt: new Date(),
      meta: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        referrer: req.get('referer') || '',
      },
    });

    ApiResponse.created(res, {
      id: lead._id,
      status: lead.status,
      submittedAt: lead.submittedAt,
    }, 'تم استلام طلبك بنجاح وسنتواصل معك قريبًا');
  });

  getLeads = catchAsync(async (req, res) => {
    const status = normalizeText(req.query?.status, 40) || 'all';
    const requestType = normalizeText(req.query?.requestType, 40) || 'all';
    const search = normalizeText(req.query?.search, 120);

    const query = {};
    if (status !== 'all') query.status = status;
    if (requestType !== 'all') query.requestType = requestType;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await PublicLead.find(query)
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(200);

    const stats = await PublicLead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    ApiResponse.success(res, {
      leads,
      stats,
    });
  });

  updateLead = catchAsync(async (req, res, next) => {
    const lead = await PublicLead.findById(req.params.id);
    if (!lead) {
      return next(AppError.notFound('الطلب غير موجود'));
    }

    const nextStatus = normalizeText(req.body?.status, 40);
    const internalNotes = normalizeText(req.body?.internalNotes, 3000);

    if (nextStatus) {
      const allowedStatuses = ['new', 'contacted', 'qualified', 'closed', 'spam'];
      if (!allowedStatuses.includes(nextStatus)) {
        return next(AppError.badRequest('حالة الطلب غير صحيحة'));
      }
      lead.status = nextStatus;
      if (nextStatus === 'contacted' || nextStatus === 'qualified' || nextStatus === 'closed') {
        lead.lastContactedAt = new Date();
      }
    }

    if (req.body?.internalNotes !== undefined) {
      lead.internalNotes = internalNotes;
    }

    await lead.save();

    ApiResponse.success(res, lead, 'تم تحديث الطلب بنجاح');
  });
}

module.exports = new PublicLeadController();
