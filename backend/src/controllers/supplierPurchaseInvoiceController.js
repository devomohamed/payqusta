/**
 * Supplier Purchase Invoice Controller
 * Manage supplier purchase invoices and installment-level settlements.
 */

const mongoose = require('mongoose');
const SupplierPurchaseInvoice = require('../models/SupplierPurchaseInvoice');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const Helpers = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');

const INVOICE_STATUSES = new Set(['open', 'partial_paid', 'paid', 'cancelled']);
const PAYMENT_TYPES = new Set(['cash', 'deferred']);
const INSTALLMENT_OPEN_STATUSES = new Set(['pending', 'partially_paid', 'overdue']);

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toInstallmentSummary(installment) {
  const amount = Number(installment?.amount || 0);
  const paidAmount = Number(installment?.paidAmount || 0);
  return {
    ...installment,
    amount,
    paidAmount,
    remainingAmount: Math.max(0, amount - paidAmount),
  };
}

function summarizeInvoice(invoice) {
  const raw = typeof invoice.toObject === 'function' ? invoice.toObject() : invoice;
  const schedule = Array.isArray(raw.installmentsSchedule)
    ? raw.installmentsSchedule.map(toInstallmentSummary)
    : [];

  const openInstallments = schedule
    .filter((item) => INSTALLMENT_OPEN_STATUSES.has(String(item.status || '')))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const overdueInstallments = openInstallments.filter((item) => item.status === 'overdue');

  return {
    ...raw,
    installmentsSchedule: schedule,
    analytics: {
      installmentsTotal: schedule.length,
      installmentsOpen: openInstallments.length,
      installmentsOverdue: overdueInstallments.length,
      nextInstallment: openInstallments[0] || null,
      totalOpenInstallmentsAmount: openInstallments.reduce((sum, item) => (
        sum + Number(item.remainingAmount || 0)
      ), 0),
    },
  };
}

function allocateLegacySupplierPayments(supplier, amount) {
  let remaining = Math.max(0, Number(amount || 0));
  if (!remaining || !Array.isArray(supplier?.payments)) return 0;

  const sorted = [...supplier.payments]
    .filter((item) => item.status !== 'paid')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  let applied = 0;
  sorted.forEach((payment) => {
    if (remaining <= 0) return;
    const due = Math.max(0, Number(payment.amount || 0) - Number(payment.paidAmount || 0));
    if (!due) return;

    const chunk = Math.min(due, remaining);
    payment.paidAmount = Number(payment.paidAmount || 0) + chunk;
    payment.paidDate = new Date();
    payment.status = payment.paidAmount >= payment.amount ? 'paid' : 'partially_paid';

    remaining -= chunk;
    applied += chunk;
  });

  return applied;
}

class SupplierPurchaseInvoiceController {
  async getAll(req, res, next) {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
      const filter = { tenant: req.tenantId };

      if (req.query.supplier && mongoose.Types.ObjectId.isValid(req.query.supplier)) {
        filter.supplier = req.query.supplier;
      }

      if (req.query.branch && mongoose.Types.ObjectId.isValid(req.query.branch)) {
        filter.branch = req.query.branch;
      }

      if (req.query.purchaseOrder && mongoose.Types.ObjectId.isValid(req.query.purchaseOrder)) {
        filter.purchaseOrder = req.query.purchaseOrder;
      }

      if (req.query.status && INVOICE_STATUSES.has(req.query.status)) {
        filter.status = req.query.status;
      }

      if (req.query.paymentType && PAYMENT_TYPES.has(req.query.paymentType)) {
        filter.paymentType = req.query.paymentType;
      }

      if (req.query.hasOutstanding === 'true') {
        filter.outstandingAmount = { $gt: 0 };
      }

      if (req.query.search) {
        filter.$or = [
          { invoiceNumber: { $regex: req.query.search, $options: 'i' } },
          { notes: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      const dueScope = String(req.query.dueScope || '').toLowerCase();
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      if (dueScope === 'today') {
        filter.installmentsSchedule = {
          $elemMatch: {
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            dueDate: { $gte: todayStart, $lte: todayEnd },
          },
        };
      } else if (dueScope === 'tomorrow') {
        const tomorrowStart = startOfDay(new Date(now.getTime() + (24 * 60 * 60 * 1000)));
        const tomorrowEnd = endOfDay(tomorrowStart);
        filter.installmentsSchedule = {
          $elemMatch: {
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            dueDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
          },
        };
      } else if (dueScope === 'overdue') {
        filter.installmentsSchedule = {
          $elemMatch: {
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            dueDate: { $lt: todayStart },
          },
        };
      } else if (dueScope === 'upcoming') {
        const days = Math.max(1, Math.min(60, Number(req.query.days || 7)));
        const until = endOfDay(new Date(now.getTime() + (days * 24 * 60 * 60 * 1000)));
        filter.installmentsSchedule = {
          $elemMatch: {
            status: { $in: ['pending', 'partially_paid', 'overdue'] },
            dueDate: { $gte: todayStart, $lte: until },
          },
        };
      }

      const [invoices, total] = await Promise.all([
        SupplierPurchaseInvoice.find(filter)
          .populate('supplier', 'name phone')
          .populate('branch', 'name')
          .populate('purchaseOrder', 'orderNumber status')
          .sort(sort || '-createdAt')
          .skip(skip)
          .limit(limit)
          .lean(),
        SupplierPurchaseInvoice.countDocuments(filter),
      ]);

      const payload = invoices.map((invoice) => summarizeInvoice(invoice));
      ApiResponse.paginated(res, payload, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const invoice = await SupplierPurchaseInvoice.findOne({
        _id: req.params.id,
        tenant: req.tenantId,
      })
        .populate('supplier', 'name phone paymentTerms financials')
        .populate('branch', 'name')
        .populate('purchaseOrder', 'orderNumber status')
        .populate('createdBy', 'name')
        .populate('paymentRecords.recordedBy', 'name');

      if (!invoice) return next(AppError.notFound('فاتورة مشتريات المورد غير موجودة'));

      ApiResponse.success(res, summarizeInvoice(invoice));
    } catch (error) {
      next(error);
    }
  }

  async pay(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const amount = Number(req.body?.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw AppError.badRequest('أدخل مبلغ سداد صحيح أكبر من صفر');
      }

      const installmentId = req.body?.installmentId;
      if (installmentId && !mongoose.Types.ObjectId.isValid(installmentId)) {
        throw AppError.badRequest('القسط المحدد غير صالح');
      }

      const invoice = await SupplierPurchaseInvoice.findOne({
        _id: req.params.id,
        tenant: req.tenantId,
        status: { $ne: 'cancelled' },
      })
        .populate('supplier', 'name financials payments')
        .populate('branch', 'name')
        .populate('purchaseOrder', 'orderNumber')
        .session(session);

      if (!invoice) throw AppError.notFound('فاتورة مشتريات المورد غير موجودة');

      if (Number(invoice.outstandingAmount || 0) <= 0) {
        throw AppError.badRequest('لا يوجد رصيد مستحق على هذه الفاتورة');
      }

      const paymentResult = invoice.recordPayment(amount, {
        installmentId: installmentId || undefined,
        method: req.body?.method || 'cash',
        reference: req.body?.reference || '',
        notes: req.body?.notes || '',
        recordedBy: req.user?._id || null,
      });

      if (Number(paymentResult.appliedAmount || 0) <= 0) {
        throw AppError.badRequest('لم يتم تطبيق أي مبلغ على الفاتورة');
      }

      await invoice.save({ session });

      const supplierId = invoice.supplier?._id || invoice.supplier;
      if (supplierId) {
        const supplier = await Supplier.findOne({
          _id: supplierId,
          tenant: req.tenantId,
        }).session(session);

        if (supplier) {
          const applied = Number(paymentResult.appliedAmount || 0);
          supplier.financials.totalPaid = Number(supplier.financials?.totalPaid || 0) + applied;
          supplier.financials.outstandingBalance = Math.max(
            0,
            Number(supplier.financials?.totalPurchases || 0) - Number(supplier.financials?.totalPaid || 0)
          );
          allocateLegacySupplierPayments(supplier, applied);
          await supplier.save({ session });
        }
      }

      const poId = invoice.purchaseOrder?._id || invoice.purchaseOrder;
      if (poId) {
        const po = await PurchaseOrder.findById(poId).session(session);
        if (po) {
          po.paidAmount = Number(po.paidAmount || 0) + Number(paymentResult.appliedAmount || 0);
          await po.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();

      await invoice.populate('supplier', 'name phone financials');
      await invoice.populate('branch', 'name');
      await invoice.populate('purchaseOrder', 'orderNumber status');
      await invoice.populate('paymentRecords.recordedBy', 'name');

      NotificationService.onSupplierPaymentRecorded(req.tenantId, {
        supplierName: invoice.supplier?.name || 'مورد',
        invoiceNumber: invoice.invoiceNumber,
        purchaseOrderNumber: invoice.purchaseOrder?.orderNumber || '',
        amount: Number(paymentResult.appliedAmount || 0),
        outstandingAmount: Number(invoice.outstandingAmount || 0),
        branchId: invoice.branch?._id || invoice.branch || null,
        branchName: invoice.branch?.name || '',
      }).catch(() => { });

      ApiResponse.success(
        res,
        {
          invoice: summarizeInvoice(invoice),
          paymentResult,
        },
        'تم تسجيل دفعة المورد بنجاح'
      );
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      next(error);
    }
  }

  async getUpcomingInstallments(req, res, next) {
    try {
      const days = Math.max(1, Math.min(60, Number(req.query.days || 7)));
      const from = startOfDay(new Date());
      const to = endOfDay(new Date(Date.now() + (days * 24 * 60 * 60 * 1000)));

      const invoices = await SupplierPurchaseInvoice.getDueInstallments(req.tenantId, { from, to });
      const flattened = [];

      invoices.forEach((invoice) => {
        const schedule = Array.isArray(invoice.installmentsSchedule) ? invoice.installmentsSchedule : [];
        schedule.forEach((installment) => {
          const dueDate = parseDate(installment.dueDate);
          if (!dueDate) return;
          if (dueDate < from || dueDate > to) return;
          if (!INSTALLMENT_OPEN_STATUSES.has(String(installment.status || ''))) return;

          const amount = Number(installment.amount || 0);
          const paidAmount = Number(installment.paidAmount || 0);
          flattened.push({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            installmentId: installment._id,
            installmentNumber: installment.installmentNumber,
            status: installment.status,
            dueDate,
            amount,
            paidAmount,
            remainingAmount: Math.max(0, amount - paidAmount),
            supplier: invoice.supplier,
            branch: invoice.branch,
            totalAmount: Number(invoice.totalAmount || 0),
            outstandingAmount: Number(invoice.outstandingAmount || 0),
          });
        });
      });

      flattened.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      ApiResponse.success(res, {
        installments: flattened,
        days,
        total: flattened.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async syncFromPurchaseOrders(req, res, next) {
    try {
      const orders = await PurchaseOrder.find({
        tenant: req.tenantId,
        supplier: { $exists: true, $ne: null },
        receivedValue: { $gt: 0 },
        status: { $in: ['partial', 'received'] },
      }).select(
        '_id supplier branch paymentType installments paymentFrequency firstInstallmentDate customInstallmentDates receivedValue createdBy'
      );

      if (!orders.length) {
        return ApiResponse.success(
          res,
          {
            scanned: 0,
            created: 0,
            skippedExisting: 0,
            skippedMissingBranch: 0,
          },
          'لا توجد أوامر شراء مستلمة تحتاج مزامنة'
        );
      }

      const purchaseOrderIds = orders.map((order) => order._id);
      const existingInvoices = await SupplierPurchaseInvoice.find({
        tenant: req.tenantId,
        purchaseOrder: { $in: purchaseOrderIds },
      }).select('purchaseOrder');
      const existingByPO = new Set(existingInvoices.map((invoice) => String(invoice.purchaseOrder)));

      let created = 0;
      let skippedExisting = 0;
      let skippedMissingBranch = 0;

      for (const order of orders) {
        if (existingByPO.has(String(order._id))) {
          skippedExisting += 1;
          continue;
        }

        if (!order.branch) {
          skippedMissingBranch += 1;
          continue;
        }

        const paymentType = order.paymentType === 'cash' ? 'cash' : 'deferred';
        const installments = paymentType === 'deferred'
          ? Math.max(1, Math.floor(Number(order.installments || 1)))
          : 1;

        const supplierInvoice = new SupplierPurchaseInvoice({
          tenant: req.tenantId,
          supplier: order.supplier,
          branch: order.branch,
          purchaseOrder: order._id,
          paymentType,
          installments,
          createdBy: req.user?._id || order.createdBy || null,
        });

        supplierInvoice.applyReceipt({
          amount: Number(order.receivedValue || 0),
          paymentType,
          installments,
          paymentFrequency: order.paymentFrequency || 'monthly',
          firstInstallmentDate: order.firstInstallmentDate || null,
          customInstallmentDates: order.customInstallmentDates || [],
        });

        await supplierInvoice.save();
        created += 1;
      }

      ApiResponse.success(
        res,
        {
          scanned: orders.length,
          created,
          skippedExisting,
          skippedMissingBranch,
        },
        created > 0
          ? `تمت مزامنة ${created} فاتورة مشتريات مورد من أوامر شراء سابقة`
          : 'لا توجد فواتير جديدة للمزامنة'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SupplierPurchaseInvoiceController();
