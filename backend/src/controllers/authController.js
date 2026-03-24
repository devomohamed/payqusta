/**
 * Auth Controller - Registration, Login, Token Management
 */

const crypto = require('crypto');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Plan = require('../models/Plan');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const emailService = require('../services/EmailService');
const ActivationService = require('../services/ActivationService');
const catchAsync = require('../utils/catchAsync');
const { getUserPermissions } = require('../middleware/checkPermission');
const { getStarterCategorySettings, seedStarterCatalogForTenant } = require('../services/starterCatalogService');
const { processImage, deleteFile } = require('../middleware/upload');
const { resolveUserRoleAssignment, resolveUserBranchAssignment } = require('../utils/userAccessHelpers');

class AuthController {
  register = catchAsync(async (req, res, next) => {
    const { name, email, phone, password, storeName, storePhone, storeAddress } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(AppError.conflict('البريد الإلكتروني مسجل بالفعل'));
    }

    const freePlan = await Plan.findOne({ price: 0 });

    const tenant = await Tenant.create({
      name: storeName || `متجر ${name}`,
      businessInfo: {
        phone: storePhone || phone,
        email,
        address: storeAddress || '',
      },
      settings: {
        categories: getStarterCategorySettings(),
      },
      subscription: {
        plan: freePlan ? freePlan._id : null,
        status: 'active',
        trialEndsAt: null,
        maxProducts: freePlan ? freePlan.limits.maxProducts : 50,
        maxCustomers: freePlan ? freePlan.limits.maxCustomers : 100,
        maxUsers: freePlan ? freePlan.limits.maxUsers : 3,
      },
    });

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      tenant: tenant._id,
      invitation: {
        status: 'activated',
        channel: 'none',
        fallbackChannel: 'none',
        activatedAt: new Date(),
      },
    });

    tenant.owner = user._id;
    await tenant.save();
    await seedStarterCatalogForTenant(tenant._id);

    const token = user.generateAuthToken();
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`New vendor registered: ${email} (Tenant: ${tenant.name})`);

    ApiResponse.created(res, {
      token,
      user: Helpers.sanitizeUser(user),
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        subscription: tenant.subscription,
      },
    }, 'تم إنشاء الحساب بنجاح');
  });

  login = catchAsync(async (req, res, next) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return next(AppError.badRequest('يرجى إدخال (البريد الإلكتروني أو رقم الهاتف) وكلمة المرور'));
    }

    const searchIdentifier = String(identifier).trim().toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: searchIdentifier },
        { phone: identifier.trim() }
      ]
    })
      .select('+password')
      .populate('tenant', 'name slug branding settings notificationChannels notificationBranding whatsapp subscription customDomain customDomainStatus customDomainLastCheckedAt');

    if (!user) {
      return next(AppError.unauthorized('بيانات الدخول غير صحيحة'));
    }

    if (!user.password || ['pending', 'sent', 'fallback_sent'].includes(user.invitation?.status)) {
      return next(AppError.unauthorized('الحساب لم يكتمل تفعيله بعد. افتح رابط الدعوة أو اطلب إعادة إرساله.'));
    }

    if (!(await user.comparePassword(password))) {
      return next(AppError.unauthorized('بيانات الدخول غير صحيحة'));
    }

    if (!user.isActive) {
      return next(AppError.unauthorized('تم تعطيل هذا الحساب'));
    }

    const token = user.generateAuthToken();
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    if (user.tenant) {
      AuditLog.log({
        tenant: user.tenant._id,
        user: user._id,
        action: 'login',
        resource: 'auth',
        details: { ip: req.ip },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }).catch(() => {});
    }

    const permissions = await getUserPermissions(user);

    ApiResponse.success(res, {
      token,
      user: Helpers.sanitizeUser(user),
      tenant: user.tenant,
      permissions,
    }, 'تم تسجيل الدخول بنجاح');
  });

  getMe = catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id)
      .populate('tenant', 'name slug branding settings notificationChannels notificationBranding whatsapp subscription customDomain customDomainStatus customDomainLastCheckedAt')
      .populate('branch', 'name')
      .populate('primaryBranch', 'name')
      .populate('assignedBranches', 'name')
      .populate('customRole');

    const permissions = await getUserPermissions(user);

    ApiResponse.success(res, {
      user: Helpers.sanitizeUser(user),
      tenant: user.tenant,
      permissions,
    });
  });

  updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return next(AppError.unauthorized('كلمة المرور الحالية غير صحيحة'));
    }

    user.password = newPassword;
    await user.save();

    const token = user.generateAuthToken();
    ApiResponse.success(res, { token }, 'تم تغيير كلمة المرور بنجاح');
  });

  forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
      return next(AppError.badRequest('البريد الإلكتروني مطلوب'));
    }

    const searchEmail = String(email).trim().toLowerCase();
    logger.info(`[FORGOT_PASSWORD] Attempt for: ${searchEmail} (Original: ${email})`);

    const user = await User.findOne({ email: searchEmail }).populate('tenant');
    if (!user) {
      logger.warn(`[FORGOT_PASSWORD] User not found: ${searchEmail}`);
      return ApiResponse.success(res, null, 'إذا كان البريد الإلكتروني مسجلاً، ستتلقى رسالة لإعادة تعيين كلمة المرور');
    }

    if (!user.isActive) {
      return next(AppError.badRequest('هذا الحساب معطل'));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const emailResult = await emailService.sendPasswordResetEmailModern({
        user,
        resetToken,
        tenant: user.tenant
      });
      if (!emailResult?.success) {
        throw new Error(emailResult?.error || 'Email service reported an unsuccessful send');
      }
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error('Failed to send password reset email:', emailError);
      return next(AppError.internal('حدث خطأ في إرسال البريد الإلكتروني'));
    }

    ApiResponse.success(res, null, 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
  });

  resetPassword = catchAsync(async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return next(AppError.badRequest('كلمة المرور الجديدة مطلوبة'));
    }

    if (password.length < 6) {
      return next(AppError.badRequest('كلمة المرور لا تقل عن 6 أحرف'));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(AppError.badRequest('الرابط غير صالح أو منتهي الصلاحية'));
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const authToken = user.generateAuthToken();
    logger.info(`Password reset successful for ${user.email}`);

    ApiResponse.success(res, { token: authToken }, 'تم إعادة تعيين كلمة المرور بنجاح');
  });

  getActivationDetails = catchAsync(async (req, res) => {
    const preview = await ActivationService.getActivationPreview(req.params.token);
    ApiResponse.success(res, preview);
  });

  activateAccount = catchAsync(async (req, res, next) => {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return next(AppError.badRequest('كلمة المرور يجب أن تكون 8 أحرف على الأقل'));
    }

    const result = await ActivationService.activateByToken(req.params.token, password);

    if (result.actorType === 'user') {
      return ApiResponse.success(res, {
        actorType: result.actorType,
        token: result.actor.generateAuthToken(),
      }, 'تم تفعيل الحساب بنجاح');
    }

    ApiResponse.success(res, { actorType: result.actorType }, 'تم تفعيل الحساب بنجاح');
  });

  updateProfile = catchAsync(async (req, res, next) => {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save({ validateBeforeSave: false });
    ApiResponse.success(res, { user: Helpers.sanitizeUser(user) }, 'تم تحديث الملف الشخصي بنجاح');
  });

  updateAvatar = catchAsync(async (req, res, next) => {
    if (!req.file) return next(AppError.badRequest('يرجى اختيار صورة'));

    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    const previousAvatar = user.avatar;
    const avatarUrl = await processImage(
      req.file.buffer,
      req.file.originalname,
      'avatars',
      req.file.mimetype
    );

    user.avatar = avatarUrl;
    await user.save({ validateBeforeSave: false });

    if (previousAvatar && previousAvatar !== avatarUrl) {
      await deleteFile(previousAvatar);
    }

    ApiResponse.success(res, { avatar: user.avatar }, 'تم تحديث الصورة الشخصية');
  });

  removeAvatar = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    const previousAvatar = user.avatar;
    user.avatar = null;
    await user.save({ validateBeforeSave: false });

    if (previousAvatar) {
      await deleteFile(previousAvatar);
    }

    ApiResponse.success(res, null, 'تم حذف الصورة الشخصية');
  });

  addUser = catchAsync(async (req, res, next) => {
    const {
      name,
      email,
      phone,
      role,
      customRole,
      branch,
      primaryBranch,
      assignedBranches,
      branchAccessMode,
      invitationChannel,
    } = req.body;

    if (!role || typeof role !== 'string') {
      return next(AppError.badRequest('يرجى تحديد الدور'));
    }

    if (!email && !phone) {
      return next(AppError.badRequest('أدخل بريداً إلكترونياً أو رقم هاتف لإرسال الدعوة'));
    }

    const existing = email ? await User.findOne({ email, tenant: req.tenantId }) : null;
    if (existing) {
      return next(AppError.badRequest('البريد الإلكتروني موجود بالفعل في هذا المتجر'));
    }

    const [roleAssignment, branchAssignment] = await Promise.all([
      resolveUserRoleAssignment({ tenantId: req.tenantId, role, customRole }),
      resolveUserBranchAssignment({
        tenantId: req.tenantId,
        branch,
        primaryBranch,
        assignedBranches,
        branchAccessMode,
      }),
    ]);

    const user = await User.create({
      name,
      email,
      phone,
      role: roleAssignment.role,
      customRole: roleAssignment.customRole,
      tenant: req.tenantId,
      isActive: false,
      ...(branchAssignment || {}),
    });

    const invitation = await ActivationService.inviteUser(user, null, {
      preferredChannel: invitationChannel || 'auto',
    });

    ApiResponse.created(res, {
      user: Helpers.sanitizeUser(user),
      invitation,
    }, 'تمت إضافة المستخدم بنجاح');
  });

  resendTenantUserInvitation = catchAsync(async (req, res) => {
    const result = await ActivationService.resendUserInvitation(
      req.params.id,
      req.tenantId,
      req.body?.invitationChannel || 'auto'
    );

    ApiResponse.success(res, result, 'تمت إعادة إرسال الدعوة');
  });

  getTenantUsers = catchAsync(async (req, res) => {
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const filter = {
      tenant: req.tenantId,
      _id: { $ne: req.user._id },
    };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('branch', 'name')
        .populate('primaryBranch', 'name')
        .populate('assignedBranches', 'name')
        .populate('customRole', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('-password'),
      User.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, users, { page, limit, total });
  });

  updateTenantUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, phone, role, customRole, password, isActive, branch, primaryBranch, assignedBranches, branchAccessMode, invitationChannel } = req.body;

    const user = await User.findOne({ _id: id, tenant: req.tenantId });
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) user.password = password;
    
    if (invitationChannel) {
      if (!user.invitation) user.invitation = {};
      user.invitation.channel = invitationChannel;
    }

    if (role !== undefined || customRole !== undefined) {
      const roleAssignment = await resolveUserRoleAssignment({
        tenantId: req.tenantId,
        role: role !== undefined ? role : user.role,
        customRole,
        fallbackRole: user.role || 'vendor',
      });
      user.role = roleAssignment.role;
      user.customRole = roleAssignment.customRole;
    }

    const branchAssignment = await resolveUserBranchAssignment({
      tenantId: req.tenantId,
      branch,
      primaryBranch,
      assignedBranches,
      branchAccessMode,
      existingUser: user,
    });

    if (branchAssignment) {
      user.branch = branchAssignment.branch;
      user.primaryBranch = branchAssignment.primaryBranch;
      user.assignedBranches = branchAssignment.assignedBranches;
      user.branchAccessMode = branchAssignment.branchAccessMode;
    }

    await user.save();
    ApiResponse.success(res, { user: Helpers.sanitizeUser(user) }, 'تم تحديث البيانات بنجاح');
  });

  deleteTenantUser = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, tenant: req.tenantId });
    if (!user) return next(AppError.notFound('المستخدم غير موجود'));

    if (req.query.hardDelete === 'true') {
      await User.deleteOne({ _id: id, tenant: req.tenantId });
      return ApiResponse.success(res, null, 'تم حذف المستخدم نهائياً');
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    ApiResponse.success(res, null, 'تم تعطيل المستخدم');
  });

  logoutAll = catchAsync(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $inc: { sessionVersion: 1 } });

    if (req.user) {
      AuditLog.log({
        tenant: req.user.tenant || req.tenantId,
        user: req.user._id,
        action: 'logout_all',
        resource: 'auth',
        details: { ip: req.ip },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }).catch((err) => logger.error(`Logout-all audit log failed: ${err.message}`));
    }

    ApiResponse.success(res, null, 'تم تسجيل الخروج من جميع الأجهزة بنجاح');
  });

  logout = catchAsync(async (req, res) => {
    if (req.user) {
      AuditLog.log({
        tenant: req.user.tenant || req.tenantId,
        user: req.user._id,
        action: 'logout',
        resource: 'auth',
        details: { ip: req.ip },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }).catch((err) => logger.error(`Logout audit log failed: ${err.message}`));
    }

    ApiResponse.success(res, null, 'تم تسجيل الخروج بنجاح');
  });
}

module.exports = new AuthController();
