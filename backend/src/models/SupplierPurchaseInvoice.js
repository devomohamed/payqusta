/**
 * Supplier Purchase Invoice Model
 * Financial document linked to a purchase order receipt lifecycle.
 */

const mongoose = require('mongoose');

const SCHEDULE_STATUSES = ['pending', 'partially_paid', 'paid', 'overdue'];

const installmentScheduleSchema = new mongoose.Schema(
  {
    installmentNumber: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    paidDate: { type: Date },
    status: {
      type: String,
      enum: SCHEDULE_STATUSES,
      default: 'pending',
    },
    reminders: {
      beforeDueSent: { type: Boolean, default: false },
      dueDaySent: { type: Boolean, default: false },
      overdueSent: { type: Boolean, default: false },
    },
    lastReminderAt: { type: Date },
  },
  { _id: true }
);

const paymentRecordSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    method: { type: String, default: 'cash' },
    reference: { type: String },
    notes: { type: String },
    installment: { type: mongoose.Schema.Types.ObjectId },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

const supplierPurchaseInvoiceSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'partial_paid', 'paid', 'cancelled'],
      default: 'open',
    },
    paymentType: {
      type: String,
      enum: ['cash', 'deferred'],
      default: 'deferred',
    },
    paymentFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'custom'],
      default: 'monthly',
    },
    installments: {
      type: Number,
      min: 1,
      default: 1,
    },
    firstInstallmentDate: { type: Date },
    customInstallmentDates: [{ type: Date }],
    installmentsSchedule: [installmentScheduleSchema],
    paymentRecords: [paymentRecordSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    receiptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReceiptAt: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

supplierPurchaseInvoiceSchema.index({ tenant: 1, invoiceNumber: 1 }, { unique: true });
supplierPurchaseInvoiceSchema.index({ tenant: 1, purchaseOrder: 1 }, { unique: true });
supplierPurchaseInvoiceSchema.index({ tenant: 1, supplier: 1, branch: 1, status: 1 });
supplierPurchaseInvoiceSchema.index({ tenant: 1, 'installmentsSchedule.dueDate': 1, 'installmentsSchedule.status': 1 });

supplierPurchaseInvoiceSchema.pre('validate', async function onValidate(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.invoiceNumber = `SPI-${Date.now()}-${count + 1}`;
  }
  next();
});

supplierPurchaseInvoiceSchema.pre('save', function onSave(next) {
  this.totalAmount = Math.max(0, Number(this.totalAmount || 0));
  this.installments = this.paymentType === 'deferred'
    ? Math.max(1, Math.floor(Number(this.installments || 1)))
    : 1;

  if (this.paymentType === 'cash') {
    this.paymentFrequency = 'monthly';
    this.firstInstallmentDate = null;
    this.customInstallmentDates = [];
    this.installmentsSchedule = [];
    this.paidAmount = this.totalAmount;
  } else {
    const now = new Date();
    this.installmentsSchedule = (this.installmentsSchedule || []).map((entry) => {
      const normalized = typeof entry.toObject === 'function' ? entry.toObject() : entry;
      const amount = Math.max(0, Number(normalized.amount || 0));
      const paidAmount = Math.max(0, Math.min(Number(normalized.paidAmount || 0), amount));
      const dueDate = new Date(normalized.dueDate);
      let status = normalized.status || 'pending';

      if (paidAmount >= amount) status = 'paid';
      else if (paidAmount > 0) status = 'partially_paid';
      else if (dueDate < now) status = 'overdue';
      else status = 'pending';

      return {
        ...normalized,
        amount,
        paidAmount,
        dueDate,
        status,
      };
    });

    this.paidAmount = this.installmentsSchedule.reduce(
      (sum, item) => sum + Number(item.paidAmount || 0),
      0
    );
  }

  this.paidAmount = Math.max(0, Math.min(Number(this.paidAmount || 0), this.totalAmount));
  this.outstandingAmount = Math.max(0, this.totalAmount - this.paidAmount);

  if (this.status !== 'cancelled') {
    if (this.outstandingAmount <= 0) this.status = 'paid';
    else if (this.paidAmount > 0) this.status = 'partial_paid';
    else this.status = 'open';
  }

  next();
});

function getStepDays(frequency) {
  switch (frequency) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 15;
    default: return null;
  }
}

function addDueDateByFrequency(baseDate, index, frequency) {
  const dueDate = new Date(baseDate);
  const stepDays = getStepDays(frequency);

  if (stepDays) {
    dueDate.setDate(dueDate.getDate() + (stepDays * index));
    return dueDate;
  }

  if (frequency === 'bimonthly') {
    dueDate.setMonth(dueDate.getMonth() + (2 * index));
    return dueDate;
  }

  dueDate.setMonth(dueDate.getMonth() + index);
  return dueDate;
}

function splitInstallments(total, count) {
  const normalizedTotal = Math.max(0, Number(total || 0));
  const normalizedCount = Math.max(1, Math.floor(Number(count || 1)));
  const base = Math.floor((normalizedTotal / normalizedCount) * 100) / 100;
  const amounts = Array.from({ length: normalizedCount }, () => base);
  const distributed = base * normalizedCount;
  amounts[normalizedCount - 1] = Math.max(0, Number((normalizedTotal - distributed + base).toFixed(2)));
  return amounts;
}

supplierPurchaseInvoiceSchema.methods.generateScheduleForAmount = function generateScheduleForAmount({
  amount,
  installments = 1,
  paymentFrequency = 'monthly',
  firstInstallmentDate = null,
  customInstallmentDates = [],
}) {
  const normalizedInstallments = Math.max(1, Math.floor(Number(installments || 1)));
  const frequency = String(paymentFrequency || 'monthly');
  const scheduleStartIndex = (this.installmentsSchedule || []).length;
  const amountParts = splitInstallments(amount, normalizedInstallments);

  let baseDate = firstInstallmentDate ? new Date(firstInstallmentDate) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const customDates = Array.isArray(customInstallmentDates)
    ? customInstallmentDates.map((date) => new Date(date)).filter((date) => !Number.isNaN(date.getTime()))
    : [];

  const nextSchedule = [];
  for (let i = 0; i < normalizedInstallments; i += 1) {
    const dueDate = frequency === 'custom' && customDates[i]
      ? customDates[i]
      : addDueDateByFrequency(baseDate, i, frequency);

    nextSchedule.push({
      installmentNumber: scheduleStartIndex + i + 1,
      amount: amountParts[i],
      dueDate,
      paidAmount: 0,
      status: 'pending',
      reminders: {
        beforeDueSent: false,
        dueDaySent: false,
        overdueSent: false,
      },
    });
  }

  return nextSchedule;
};

supplierPurchaseInvoiceSchema.methods.applyReceipt = function applyReceipt({
  amount,
  paymentType = 'deferred',
  installments = 1,
  paymentFrequency = 'monthly',
  firstInstallmentDate = null,
  customInstallmentDates = [],
}) {
  const receiptAmount = Math.max(0, Number(amount || 0));
  if (!receiptAmount) return this;

  this.paymentType = paymentType === 'cash' ? 'cash' : 'deferred';
  this.installments = this.paymentType === 'deferred'
    ? Math.max(1, Math.floor(Number(installments || 1)))
    : 1;
  this.paymentFrequency = this.paymentType === 'deferred'
    ? String(paymentFrequency || 'monthly')
    : 'monthly';
  this.firstInstallmentDate = this.paymentType === 'deferred' && firstInstallmentDate
    ? new Date(firstInstallmentDate)
    : null;
  this.customInstallmentDates = this.paymentFrequency === 'custom'
    ? (
      Array.isArray(customInstallmentDates)
        ? customInstallmentDates
          .map((date) => new Date(date))
          .filter((date) => !Number.isNaN(date.getTime()))
        : []
    )
    : [];

  this.totalAmount += receiptAmount;
  if (this.paymentType === 'cash') {
    this.paidAmount += receiptAmount;
  } else {
    const generated = this.generateScheduleForAmount({
      amount: receiptAmount,
      installments: this.installments,
      paymentFrequency: this.paymentFrequency,
      firstInstallmentDate: this.firstInstallmentDate,
      customInstallmentDates: this.customInstallmentDates,
    });
    this.installmentsSchedule.push(...generated);
  }

  this.receiptCount = Number(this.receiptCount || 0) + 1;
  this.lastReceiptAt = new Date();
  return this;
};

supplierPurchaseInvoiceSchema.methods.recordPayment = function recordPayment(amount, options = {}) {
  let remaining = Math.max(0, Number(amount || 0));
  if (!remaining) return { appliedAmount: 0, remainingAmount: 0, touchedInstallments: [] };

  const touchedInstallments = [];
  const applyToInstallment = (installment) => {
    if (!installment || remaining <= 0) return;
    const due = Math.max(0, Number(installment.amount || 0) - Number(installment.paidAmount || 0));
    if (!due) return;

    const chunk = Math.min(remaining, due);
    installment.paidAmount = Number(installment.paidAmount || 0) + chunk;
    installment.paidDate = new Date();

    remaining -= chunk;
    touchedInstallments.push({
      installmentId: installment._id,
      amount: chunk,
    });
  };

  if (this.paymentType === 'deferred' && this.installmentsSchedule.length > 0) {
    if (options.installmentId) {
      const direct = this.installmentsSchedule.id(options.installmentId);
      applyToInstallment(direct);
    }

    if (remaining > 0) {
      const sorted = [...this.installmentsSchedule]
        .filter((item) => item.status !== 'paid')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      sorted.forEach((item) => applyToInstallment(item));
    }
  } else {
    const chunk = Math.min(remaining, Math.max(0, this.totalAmount - this.paidAmount));
    this.paidAmount += chunk;
    remaining -= chunk;
  }

  const appliedAmount = Math.max(0, Number(amount || 0) - remaining);
  if (appliedAmount > 0) {
    this.paymentRecords.push({
      amount: appliedAmount,
      method: options.method || 'cash',
      reference: options.reference || '',
      notes: options.notes || '',
      installment: touchedInstallments[0]?.installmentId,
      recordedBy: options.recordedBy || null,
      date: new Date(),
    });
  }

  return {
    appliedAmount,
    remainingAmount: remaining,
    touchedInstallments,
  };
};

supplierPurchaseInvoiceSchema.statics.getDueInstallments = function getDueInstallments(tenantId, { from, to }) {
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(fromDate);

  return this.find({
    tenant: tenantId,
    status: { $in: ['open', 'partial_paid'] },
    installmentsSchedule: {
      $elemMatch: {
        status: { $in: ['pending', 'partially_paid', 'overdue'] },
        dueDate: { $gte: fromDate, $lte: toDate },
      },
    },
  }).populate('supplier', 'name').populate('branch', 'name').select(
    'invoiceNumber supplier branch purchaseOrder installmentsSchedule paymentType totalAmount paidAmount outstandingAmount'
  );
};

module.exports = mongoose.model('SupplierPurchaseInvoice', supplierPurchaseInvoiceSchema);
