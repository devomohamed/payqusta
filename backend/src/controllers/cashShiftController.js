/**
 * Cash Shift Controller
 */

const CashShift = require('../models/CashShift');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const mongoose = require('mongoose');

class CashShiftController {
  constructor() {
    // No manual binding needed with arrow functions
  }

  _calculateShiftStats = async (shiftId, tenantId, userId) => {
    // 1. Direct Cash Sales (Invoices created as 'CASH' linked strictly to this shift)
    const cashInvoices = await Invoice.aggregate([
      {
        $match: {
          tenant: tenantId,
          shift: shiftId,
          paymentMethod: 'cash'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Cash Payments on Invoices (Installments, Deferred, Partial)
    // These are stored in the 'payments' array and must be strictly linked to this shift
    const cashPayments = await Invoice.aggregate([
      {
        $match: {
          tenant: tenantId,
          'payments.shift': shiftId,
          'payments.method': 'cash'
        }
      },
      { $unwind: '$payments' },
      {
        $match: {
           'payments.shift': shiftId,
           'payments.method': 'cash'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalInvoices = cashInvoices[0]?.total || 0;
    const countInvoices = cashInvoices[0]?.count || 0;

    const totalPayments = cashPayments[0]?.total || 0;
    const countPayments = cashPayments[0]?.count || 0;

    return {
      totalCashSales: totalInvoices + totalPayments,
      breakdown: {
        directSales: totalInvoices,
        directCount: countInvoices,
        collections: totalPayments,
        collectionsCount: countPayments,
        totalTransactions: countInvoices + countPayments
      }
    };
  }

  // Get current active shift for the logged-in user
  getCurrent = async (req, res, next) => {
    try {
      const shift = await CashShift.findOne({
        user: req.user._id,
        status: 'open',
        ...req.tenantFilter
      });

      if (!shift) {
        return ApiResponse.success(res, null, 'لا توجد وردية مفتوحة');
      }

      // Lazy Auto-Close check
      if (shift.autoCloseAt && new Date() > shift.autoCloseAt) {
        shift.status = 'closed';
        shift.closedBySystem = true;
        shift.endTime = shift.autoCloseAt;
        await shift.save();
        return ApiResponse.success(res, null, 'انتهى وقت الوردية وتم إغلاقها تلقائياً');
      }

      // Calculate current sales in real-time
      const stats = await this._calculateShiftStats(
        shift._id,
        shift.tenant,
        req.user._id
      );

      const response = shift.toObject();
      response.currentSales = stats.totalCashSales;
      response.expectedNow = shift.openingBalance + stats.totalCashSales;
      response.breakdown = stats.breakdown;

      ApiResponse.success(res, response);
    } catch (error) {
      next(error);
    }
  }

  openShift = async (req, res, next) => {
    try {
      // Check if already open
      const existing = await CashShift.findOne({
        user: req.user._id,
        status: 'open',
        ...req.tenantFilter
      });

      if (existing) {
        return next(AppError.badRequest('لديك وردية مفتوحة بالفعل'));
      }

      // Fetch tenant settings for shift duration
      const Tenant = require('../models/Tenant');
      const tenantDoc = await Tenant.findById(req.tenantId).select('settings.shiftDurationHours');
      const durationHours = tenantDoc?.settings?.shiftDurationHours || 8;
      const startTime = new Date();
      const autoCloseAt = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

      const { openingBalance } = req.body;

      const shift = await CashShift.create({
        tenant: req.tenantId,
        branch: req.user.branch?._id || req.user.branch || null,
        user: req.user._id,
        openingBalance: openingBalance || 0,
        status: 'open',
        startTime,
        autoCloseAt
      });

      ApiResponse.created(res, shift, 'تم فتح الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  closeShift = async (req, res, next) => {
    try {
      const { actualCash, notes } = req.body;

      const shift = await CashShift.findOne({
        user: req.user._id,
        status: 'open',
        ...req.tenantFilter
      });

      if (!shift) return next(AppError.badRequest('لا توجد وردية مفتوحة لإغلاقها'));

      // Calculate final stats
      const endTime = new Date();
      const stats = await this._calculateShiftStats(
        shift._id,
        shift.tenant,
        req.user._id
      );

      const expectedCash = shift.openingBalance + stats.totalCashSales;
      const variance = (actualCash || 0) - expectedCash;

      shift.status = 'closed';
      shift.endTime = endTime;
      shift.totalCashSales = stats.totalCashSales;
      shift.expectedCash = expectedCash;
      shift.actualCash = actualCash || 0;
      shift.variance = variance;
      shift.notes = notes;
      shift.closedBy = req.user._id;

      await shift.save();

      ApiResponse.success(res, shift, 'تم إغلاق الوردية بنجاح');
    } catch (error) {
      next(error);
    }
  }

  getHistory = async (req, res, next) => {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
      const filter = { ...req.tenantFilter };

      if (req.query.status) {
        filter.status = req.query.status;
      }

      // Date Range Filtering
      if (req.query.startDate || req.query.endDate) {
        filter.startTime = {};
        if (req.query.startDate) filter.startTime.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filter.startTime.$lte = new Date(req.query.endDate);
      }

      // Admin/Vendor sees all (or filters by branch), others see only their own
      if (req.user.role !== 'admin' && req.user.role !== 'vendor' && !req.user.isSuperAdmin) {
        filter.user = req.user._id;
      } else if (req.query.branch) {
        filter.branch = req.query.branch;
      }

      const [shifts, total] = await Promise.all([
        CashShift.find(filter)
          .sort(sort || '-createdAt')
          .skip(skip)
          .limit(limit)
          .populate({
            path: 'user',
            select: 'name branch',
            populate: { path: 'branch', select: 'name' }
          })
          .populate('branch', 'name')
          .lean(),
        CashShift.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, shifts, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Force close any shift
  adminForceClose = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { actualCash, notes } = req.body;

      const shift = await CashShift.findOne({
        _id: id,
        status: 'open',
        ...req.tenantFilter
      });

      if (!shift) return next(AppError.notFound('الوردية غير موجودة أو مغلقة بالفعل'));

      const endTime = new Date();
      const stats = await this._calculateShiftStats(
        shift._id,
        shift.tenant,
        shift.user // Use shift's user, not req.user
      );

      const expectedCash = shift.openingBalance + stats.totalCashSales;
      const variance = (actualCash || 0) - expectedCash;

      shift.status = 'closed';
      shift.endTime = endTime;
      shift.totalCashSales = stats.totalCashSales;
      shift.expectedCash = expectedCash;
      shift.actualCash = actualCash || 0;
      shift.variance = variance;
      shift.notes = (notes ? `[إغلاق إداري]: ${notes}` : '[تم الإغلاق بواسطة المدير]');
      shift.closedBy = req.user._id;

      await shift.save();
      ApiResponse.success(res, shift, 'تم إغلاق الوردية إدارياً بنجاح');
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get daily analytics for shifts
  getAnalytics = async (req, res, next) => {
    try {
      const { startDate, endDate, branch } = req.query;
      const filter = { 
        ...req.tenantFilter,
        status: 'closed'
      };

      if (startDate || endDate) {
        filter.startTime = {};
        if (startDate) filter.startTime.$gte = new Date(startDate);
        if (endDate) filter.startTime.$lte = new Date(endDate);
      }

      if (branch) {
        filter.branch = new mongoose.Types.ObjectId(branch);
      }

      const stats = await CashShift.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
              branch: "$branch"
            },
            totalSales: { $sum: "$totalCashSales" },
            totalExpected: { $sum: "$expectedCash" },
            totalActual: { $sum: "$actualCash" },
            totalVariance: { $sum: "$variance" },
            shiftCount: { $sum: 1 }
          }
        },
        { $sort: { "_id.day": -1 } },
        {
          $lookup: {
            from: 'branches',
            localField: '_id.branch',
            foreignField: '_id',
            as: 'branchDetails'
          }
        },
        { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            day: "$_id.day",
            branchName: "$branchDetails.name",
            totalSales: 1,
            totalVariance: 1,
            shiftCount: 1,
            totalActual: 1
          }
        }
      ]);

      ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CashShiftController();
