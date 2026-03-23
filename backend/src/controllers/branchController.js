const Branch = require('../models/Branch');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const { ROLES } = require('../config/constants');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const crypto = require('crypto');
const ActivationService = require('../services/ActivationService');

const BRANCH_TYPE_VALUES = ['store', 'warehouse', 'fulfillment_center', 'hybrid'];
const SHIPPING_ORIGIN_KEYS = ['governorate', 'city', 'area', 'addressLine', 'postalCode'];

function readBooleanFlag(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function normalizeShippingOrigin(shippingOrigin = {}, fallback = {}) {
  const nextShippingOrigin = {};

  for (const key of SHIPPING_ORIGIN_KEYS) {
    nextShippingOrigin[key] = normalizeString(
      shippingOrigin?.[key],
      normalizeString(fallback?.[key], ''),
    );
  }

  return nextShippingOrigin;
}

function normalizeBranchCommercePayload(payload = {}, existingBranch = null) {
  const fallbackBranchType = existingBranch?.branchType || 'store';
  const nextBranchType = payload.branchType !== undefined
    ? normalizeString(payload.branchType, fallbackBranchType)
    : fallbackBranchType;

  if (!BRANCH_TYPE_VALUES.includes(nextBranchType)) {
    throw AppError.badRequest('نوع الفرع غير صالح');
  }

  let nextOnlinePriority = existingBranch?.onlinePriority ?? 100;
  if (payload.onlinePriority !== undefined && payload.onlinePriority !== '') {
    const parsedPriority = Number(payload.onlinePriority);
    if (!Number.isInteger(parsedPriority) || parsedPriority < 1 || parsedPriority > 9999) {
      throw AppError.badRequest('أولوية الطلبات الأونلاين يجب أن تكون رقمًا صحيحًا بين 1 و 9999');
    }
    nextOnlinePriority = parsedPriority;
  }

  const defaultPickupEnabled = existingBranch
    ? existingBranch.pickupEnabled
    : nextBranchType !== 'warehouse';
  const defaultFulfillmentCenter = existingBranch
    ? existingBranch.isFulfillmentCenter
    : nextBranchType === 'fulfillment_center';

  return {
    branchType: nextBranchType,
    participatesInOnlineOrders: readBooleanFlag(
      payload.participatesInOnlineOrders,
      existingBranch?.participatesInOnlineOrders ?? false,
    ),
    isFulfillmentCenter: readBooleanFlag(
      payload.isFulfillmentCenter,
      defaultFulfillmentCenter,
    ),
    onlinePriority: nextOnlinePriority,
    pickupEnabled: readBooleanFlag(
      payload.pickupEnabled,
      defaultPickupEnabled,
    ),
    shippingOrigin: normalizeShippingOrigin(
      payload.shippingOrigin,
      existingBranch?.shippingOrigin,
    ),
  };
}

async function populateBranch(branchId) {
  return Branch.findById(branchId)
    .populate('manager', 'name email phone role')
    .populate('tenant', 'name email phone')
    .lean();
}

function ensureBranchAccess(branch, req) {
  if (req.user?.isSuperAdmin) return;
  if (!req.tenantId || branch.tenant.toString() !== req.tenantId) {
    throw AppError.forbidden('ليس لديك صلاحية للوصول إلى هذا الفرع');
  }
}

class BranchController {
  async getBranches(req, res, next) {
    try {
      const filter = { ...req.tenantFilter };
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
      const skip = (page - 1) * limit;

      if (req.user?.isSuperAdmin && !req.tenantFilter) {
        delete filter.tenant;
      }

      if (req.query.isActive === 'true' || req.query.isActive === 'false') {
        filter.isActive = req.query.isActive === 'true';
      }
      if (req.query.participatesInOnlineOrders === 'true' || req.query.participatesInOnlineOrders === 'false') {
        filter.participatesInOnlineOrders = req.query.participatesInOnlineOrders === 'true';
      }
      if (req.query.isFulfillmentCenter === 'true' || req.query.isFulfillmentCenter === 'false') {
        filter.isFulfillmentCenter = req.query.isFulfillmentCenter === 'true';
      }
      if (req.query.branchType && BRANCH_TYPE_VALUES.includes(req.query.branchType)) {
        filter.branchType = req.query.branchType;
      }
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search.trim(), 'i');
        filter.$or = [{ name: searchRegex }, { phone: searchRegex }, { address: searchRegex }];
      }

      const countBaseFilter = filter.tenant ? { tenant: filter.tenant } : {};

      const [branches, total, activeCount] = await Promise.all([
        Branch.find(filter)
          .populate('manager', 'name email phone role')
          .populate('tenant', 'name email phone')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Branch.countDocuments(filter),
        Branch.countDocuments({ ...countBaseFilter, isActive: true }),
      ]);

      res.json({
        success: true,
        data: {
          branches,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
          counters: { active: activeCount, inactive: Math.max(total - activeCount, 0) },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createBranch(req, res, next) {
    try {
      const {
        name,
        address,
        phone,
        managerId,
        managerName,
        managerEmail,
        managerPhone,
        cameras,
        tenantId,
      } = req.body;

      if (!name) {
        return next(AppError.badRequest('اسم الفرع مطلوب'));
      }

      const targetTenantId = req.user?.isSuperAdmin && tenantId ? tenantId : req.tenantId;
      if (!targetTenantId) {
        return next(AppError.badRequest('لم يتم تحديد المتجر'));
      }

      const tenant = await Tenant.findById(targetTenantId);
      if (!tenant) {
        return next(AppError.notFound('المتجر غير موجود'));
      }

      const activeBranchesCount = await Branch.countDocuments({ tenant: targetTenantId, isActive: true });
      const maxBranches = tenant.subscription?.maxBranches || 1;
      if (activeBranchesCount >= maxBranches) {
        return next(AppError.badRequest(`عذرًا، باقتك الحالية تسمح بحد أقصى ${maxBranches} فرع.`));
      }

      if (managerEmail || managerName || managerPhone) {
        if (!managerEmail || !managerName || !managerPhone) {
          return next(AppError.badRequest('يرجى إدخال جميع بيانات مدير الفرع: الاسم، البريد، الهاتف'));
        }
        const existingUser = await User.findOne({ email: managerEmail });
        if (existingUser) {
          return next(AppError.badRequest('البريد الإلكتروني لمدير الفرع مستخدم بالفعل'));
        }
      }

      const commercePayload = normalizeBranchCommercePayload(req.body);

      const [branch] = await Branch.create([{
        name,
        address,
        phone,
        cameras,
        tenant: targetTenantId,
        ...commercePayload,
      }]);

      let managerUser = null;
      if (managerId) {
        managerUser = await User.findById(managerId);
        if (!managerUser) {
          return next(AppError.notFound('المستخدم المحدد غير موجود'));
        }
        if (!managerUser.assignedBranches.includes(branch._id)) {
          managerUser.assignedBranches.push(branch._id);
          await managerUser.save();
        }
        branch.manager = managerUser._id;
        await branch.save();
      } else if (managerEmail) {
        [managerUser] = await User.create([{
          name: managerName,
          email: managerEmail,
          phone: managerPhone,
          role: ROLES.COORDINATOR,
          tenant: targetTenantId,
          branch: branch._id,
          primaryBranch: branch._id,
          assignedBranches: [branch._id],
          branchAccessMode: 'single_branch',
          isActive: false,
          isEmailVerified: false,
          isPhoneVerified: false,
        }]);

        branch.manager = managerUser._id;
        await branch.save();

        if (managerUser) {
          // Send activation asynchronously
          ActivationService.inviteUser(managerUser, tenant, {
            preferredChannel: 'auto',
          }).catch((err) => {
            console.error('Failed to send manager activation:', err);
          });
        }
      }

      const hydratedBranch = await populateBranch(branch._id);
      ApiResponse.success(res, { branch: hydratedBranch, manager: managerUser }, 'تم إنشاء الفرع وحساب المدير بنجاح', 201);
    } catch (error) {
      if (error?.code === 11000) {
        return next(AppError.badRequest('اسم الفرع مستخدم بالفعل داخل نفس المتجر'));
      }
      next(error);
    }
  }

  async updateBranch(req, res, next) {
    try {
      const {
        name,
        address,
        phone,
        cameras,
        isActive,
        managerId,
        managerName,
        managerEmail,
        managerPhone,
      } = req.body;

      const branch = await Branch.findById(req.params.id);
      if (!branch) {
        return next(AppError.notFound('الفرع غير موجود'));
      }

      ensureBranchAccess(branch, req);

      if (name) branch.name = name;
      if (address !== undefined) branch.address = address;
      if (phone !== undefined) branch.phone = phone;
      if (cameras !== undefined) branch.cameras = cameras;
      if (isActive !== undefined) branch.isActive = isActive;

      Object.assign(branch, normalizeBranchCommercePayload(req.body, branch));
      await branch.save();

      if (managerId === null || managerId === '') {
        branch.manager = null;
        await branch.save();
      } else if (managerId) {
        const managerUser = await User.findById(managerId);
        if (!managerUser) {
          return next(AppError.notFound('المستخدم المحدد غير موجود'));
        }
        if (!managerUser.assignedBranches.includes(branch._id)) {
          managerUser.assignedBranches.push(branch._id);
          await managerUser.save();
        }
        branch.manager = managerUser._id;
        await branch.save();
      } else if (managerName || managerEmail || managerPhone || managerPassword) {
        if (branch.manager) {
          const managerUser = await User.findById(branch.manager);
          if (managerUser) {
            if (managerEmail) {
              const existing = await User.findOne({ email: managerEmail, _id: { $ne: managerUser._id } });
              if (existing) {
                return next(AppError.badRequest('البريد الإلكتروني لمدير الفرع مستخدم بالفعل'));
              }
            }

            if (managerName) managerUser.name = managerName;
            if (managerEmail) managerUser.email = managerEmail;
            if (managerPhone) managerUser.phone = managerPhone;
            await managerUser.save();
          }
        } else if (managerEmail && managerName && managerPhone) {
          const existing = await User.findOne({ email: managerEmail });
          if (existing) {
            return next(AppError.badRequest('البريد الإلكتروني لمدير الفرع مستخدم بالفعل'));
          }

          const generatedPassword = crypto.randomBytes(8).toString('hex');
          const managerUser = await User.create({
            name: managerName,
            email: managerEmail,
            password: generatedPassword,
            phone: managerPhone,
            role: ROLES.COORDINATOR,
            tenant: req.user?.isSuperAdmin ? branch.tenant : req.tenantId,
            branch: branch._id,
            primaryBranch: branch._id,
            assignedBranches: [branch._id],
            branchAccessMode: 'single_branch',
            isEmailVerified: false,
            isPhoneVerified: false,
          });

          branch.manager = managerUser._id;
          await branch.save();

          // Send activation asynchronously
          ActivationService.sendSystemSetup({
            actorId: managerUser._id,
            actorType: 'user',
            tenantId: managerUser.tenant,
          }).catch((err) => {
            console.error('Failed to send manager activation:', err);
          });
        }
      }

      const hydratedBranch = await populateBranch(branch._id);
      ApiResponse.success(res, { branch: hydratedBranch }, 'تم تحديث الفرع بنجاح');
    } catch (error) {
      if (error?.code === 11000) {
        return next(AppError.badRequest('اسم الفرع مستخدم بالفعل داخل نفس المتجر'));
      }
      next(error);
    }
  }

  async deleteBranch(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) {
        return next(AppError.notFound('الفرع غير موجود'));
      }

      ensureBranchAccess(branch, req);

      if (branch.currentShift?.startTime && !branch.currentShift?.endTime) {
        return next(AppError.badRequest('لا يمكن حذف الفرع أثناء وجود وردية نشطة'));
      }

      await User.updateMany(
        {
          isActive: true,
          $or: [{ branch: branch._id }, { primaryBranch: branch._id }],
        },
        { isActive: false },
      );

      branch.isActive = false;
      await branch.save();

      ApiResponse.success(res, null, 'تم حذف الفرع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  async getBranchStats(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) {
        return next(AppError.notFound('الفرع غير موجود'));
      }

      ensureBranchAccess(branch, req);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const todayInvoices = await Invoice.find({
        tenant: branch.tenant,
        branch: branch._id,
        createdAt: { $gte: todayStart, $lt: todayEnd },
      });

      const todaySales = todayInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const todayPaid = todayInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const todayCount = todayInvoices.length;

      const todayExpenses = await Expense.find({
        tenant: branch.tenant,
        branch: branch._id,
        date: { $gte: todayStart, $lt: todayEnd },
      });

      const todayExpensesTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      let currentShift = null;
      if (branch.currentShift?.startTime) {
        const shiftInvoices = await Invoice.find({
          tenant: branch.tenant,
          branch: branch._id,
          createdAt: { $gte: branch.currentShift.startTime },
        });
        const shiftExpenses = await Expense.find({
          tenant: branch.tenant,
          branch: branch._id,
          date: { $gte: branch.currentShift.startTime },
        });

        const shiftSales = shiftInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const shiftExpensesTotal = shiftExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        currentShift = {
          ...branch.currentShift.toObject(),
          sales: shiftSales,
          paid: shiftInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
          invoicesCount: shiftInvoices.length,
          expenses: shiftExpensesTotal,
          profit: shiftSales - shiftExpensesTotal,
        };
      }

      const recentInvoices = await Invoice.find({
        tenant: branch.tenant,
        branch: branch._id,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customer', 'name phone')
        .lean();

      let gamification = null;
      if (req.user?.role === ROLES.COORDINATOR && req.user?.gamification) {
        const dailyTarget = req.user.gamification.dailyTarget || 10000;
        const progress = Math.min(100, Math.round((todayPaid / dailyTarget) * 100));
        gamification = {
          dailyTarget,
          currentSales: todayPaid,
          progress,
          points: req.user.gamification.points || 0,
          level: req.user.gamification.level || 1,
          badges: req.user.gamification.badges || [],
        };
      }

      res.json({
        success: true,
        data: {
          today: {
            sales: todaySales,
            paid: todayPaid,
            invoicesCount: todayCount,
            expenses: todayExpensesTotal,
            profit: todaySales - todayExpensesTotal,
          },
          currentShift,
          recentInvoices,
          gamification,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async startShift(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) {
        return next(AppError.notFound('الفرع غير موجود'));
      }

      ensureBranchAccess(branch, req);

      if (branch.currentShift?.startTime && !branch.currentShift?.endTime) {
        return next(AppError.badRequest('هناك وردية نشطة بالفعل'));
      }

      const { openingBalance, notes } = req.body;

      branch.currentShift = {
        startTime: new Date(),
        openingBalance: openingBalance || 0,
        startedBy: req.user._id,
        notes: notes || '',
      };

      await branch.save();
      ApiResponse.success(res, { shift: branch.currentShift }, 'تم بدء الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  async endShift(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) {
        return next(AppError.notFound('الفرع غير موجود'));
      }

      ensureBranchAccess(branch, req);

      if (!branch.currentShift?.startTime || branch.currentShift?.endTime) {
        return next(AppError.badRequest('لا توجد وردية نشطة'));
      }

      const { closingBalance, notes } = req.body;

      branch.currentShift.endTime = new Date();
      branch.currentShift.closingBalance = closingBalance || 0;
      branch.currentShift.endedBy = req.user._id;
      if (notes) {
        branch.currentShift.notes += `${branch.currentShift.notes ? '\n' : ''}[إنهاء]: ${notes}`;
      }

      await branch.save();
      ApiResponse.success(res, { shift: branch.currentShift }, 'تم إنهاء الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  async settleBranch(req, res, next) {
    try {
      const branch = await Branch.findById(req.params.id);
      if (!branch) {
        return next(AppError.notFound('الفرع غير موجود'));
      }

      ensureBranchAccess(branch, req);

      const { date, notes, cashInHand, expectedCash, variance } = req.body;
      const settlementDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(settlementDate.getFullYear(), settlementDate.getMonth(), settlementDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const invoices = await Invoice.find({
        tenant: branch.tenant,
        branch: branch._id,
        createdAt: { $gte: startOfDay, $lt: endOfDay },
      });

      const expenses = await Expense.find({
        tenant: branch.tenant,
        branch: branch._id,
        date: { $gte: startOfDay, $lt: endOfDay },
      });

      const totalSales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const cashSales = invoices
        .filter((inv) => inv.paymentMethod === 'cash')
        .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const cardSales = invoices
        .filter((inv) => inv.paymentMethod === 'card')
        .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const creditSales = invoices
        .filter((inv) => inv.paymentMethod === 'credit' || inv.paymentMethod === 'installments')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const netCash = cashSales - totalExpenses;

      const settlement = {
        date: settlementDate,
        totalSales,
        cashSales,
        cardSales,
        creditSales,
        totalExpenses,
        netCash,
        cashInHand: cashInHand || netCash,
        expectedCash: expectedCash || netCash,
        variance: variance !== undefined ? variance : 0,
        invoicesCount: invoices.length,
        settledBy: req.user._id,
        notes: notes || '',
      };

      if (!Array.isArray(branch.settlementHistory)) {
        branch.settlementHistory = [];
      }
      branch.settlementHistory.push(settlement);

      if (branch.currentShift?.startTime) {
        branch.currentShift = {
          startTime: null,
          endTime: null,
          openingBalance: 0,
          closingBalance: 0,
          startedBy: null,
          endedBy: null,
          notes: '',
        };
      }

      await branch.save();
      ApiResponse.success(res, { settlement }, 'تمت التسوية بنجاح', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BranchController();
