/**
 * Installment Scheduler - Cron Job
 * Runs daily checks for customer installments and supplier purchase installments.
 */

const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const SupplierPurchaseInvoice = require('../models/SupplierPurchaseInvoice');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const WhatsAppService = require('../services/WhatsAppService');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');
const {
  registerJob,
  markJobRunStarted,
  markJobRunSuccess,
  markJobRunFailure,
} = require('../ops/runtimeState');

const CUSTOMER_INSTALLMENTS_JOB = 'customer_installment_reminders';
const SUPPLIER_PAYMENTS_JOB = 'supplier_payment_reminders';
const OVERDUE_SYNC_JOB = 'installment_overdue_sync';

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

class InstallmentScheduler {
  /**
   * Start scheduler
   */
  start() {
    registerJob(CUSTOMER_INSTALLMENTS_JOB, {
      schedule: '0 8 * * *',
      timezone: 'Africa/Cairo',
      category: 'billing',
    });

    // Customer installment reminders - daily at 8 AM (Cairo)
    cron.schedule('0 8 * * *', () => this.checkCustomerInstallments(), {
      timezone: 'Africa/Cairo',
    });

    registerJob(SUPPLIER_PAYMENTS_JOB, {
      schedule: '0 9 * * *',
      timezone: 'Africa/Cairo',
      category: 'billing',
    });

    // Supplier purchase installment reminders - daily at 9 AM
    cron.schedule('0 9 * * *', () => this.checkSupplierPayments(), {
      timezone: 'Africa/Cairo',
    });

    registerJob(OVERDUE_SYNC_JOB, {
      schedule: '0 12 * * *',
      timezone: 'Africa/Cairo',
      category: 'billing',
    });

    // Overdue checks - daily at 12 PM
    cron.schedule('0 12 * * *', () => this.markOverdueInstallments(), {
      timezone: 'Africa/Cairo',
    });

    logger.info('Installment Scheduler started');
  }

  /**
   * Customer installment reminders (due tomorrow)
   */
  async checkCustomerInstallments() {
    markJobRunStarted(CUSTOMER_INSTALLMENTS_JOB, { operation: 'checkCustomerInstallments' });

    try {
      logger.info('Checking customer installments...');

      const tenants = await Tenant.find({ isActive: true });
      let remindersSent = 0;
      let invoicesVisited = 0;

      for (const tenant of tenants) {
        const tomorrowStart = startOfDay(new Date(Date.now() + (24 * 60 * 60 * 1000)));
        const tomorrowEnd = endOfDay(tomorrowStart);

        const invoices = await Invoice.find({
          tenant: tenant._id,
          'installments.status': { $in: ['pending'] },
          'installments.dueDate': { $gte: tomorrowStart, $lte: tomorrowEnd },
          'installments.reminderSent': { $ne: true },
        }).populate('customer', 'name phone whatsapp');

        for (const invoice of invoices) {
          invoicesVisited += 1;

          const dueInstallments = (invoice.installments || []).filter((installment) => (
            installment.status === 'pending'
            && !installment.reminderSent
            && installment.dueDate >= tomorrowStart
            && installment.dueDate <= tomorrowEnd
          ));

          for (const installment of dueInstallments) {
            try {
              NotificationService.onInstallmentDue(
                tenant._id,
                invoice.customer?.name || 'عميل',
                invoice.invoiceNumber,
                installment.amount,
                installment.dueDate,
                invoice.branch
              ).catch(() => { });

              const customerWA = invoice.customer?.whatsapp;
              if (
                tenant.whatsapp?.enabled
                && tenant.whatsapp?.notifications?.installmentReminder
                && customerWA?.enabled
                && customerWA?.notifications?.reminders !== false
              ) {
                const phone = customerWA?.number || invoice.customer?.phone;
                if (phone) {
                  await WhatsAppService.sendInstallmentReminder(
                    phone,
                    invoice.customer,
                    invoice,
                    installment,
                    tenant.whatsapp
                  );
                }

                const vendor = await User.findOne({
                  tenant: tenant._id,
                  role: 'vendor',
                  isActive: true,
                }).select('phone');

                if (vendor?.phone) {
                  const vendorMessage = `تذكير: العميل ${invoice.customer?.name || 'عميل'} عليه قسط ${Number(installment.amount || 0).toLocaleString('ar-EG')} ج.م مستحق غدًا - فاتورة ${invoice.invoiceNumber}`;
                  await WhatsAppService.sendMessage(vendor.phone, vendorMessage, tenant.whatsapp);
                }
              }

              installment.reminderSent = true;
              installment.lastReminderDate = new Date();
              remindersSent += 1;
            } catch (err) {
              logger.error(`Failed to send customer installment reminder: ${err.message}`);
            }
          }

          await invoice.save();
        }
      }

      logger.info('Customer installment check completed');
      markJobRunSuccess(CUSTOMER_INSTALLMENTS_JOB, {
        operation: 'checkCustomerInstallments',
        processedTenants: tenants.length,
        invoicesVisited,
        remindersSent,
      });
    } catch (error) {
      logger.error(`Customer installment scheduler error: ${error.message}`);
      markJobRunFailure(CUSTOMER_INSTALLMENTS_JOB, error, {
        operation: 'checkCustomerInstallments',
      });
    }
  }

  /**
   * Supplier purchase installment reminders (due today + tomorrow)
   */
  async checkSupplierPayments() {
    markJobRunStarted(SUPPLIER_PAYMENTS_JOB, { operation: 'checkSupplierPayments' });

    try {
      logger.info('Checking supplier purchase installments...');

      const tenants = await Tenant.find({ isActive: true }).select('_id whatsapp');
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const tomorrowStart = startOfDay(new Date(now.getTime() + (24 * 60 * 60 * 1000)));
      const tomorrowEnd = endOfDay(tomorrowStart);
      let remindersSent = 0;
      let invoicesVisited = 0;

      for (const tenant of tenants) {
        const [todayInvoices, tomorrowInvoices, users] = await Promise.all([
          SupplierPurchaseInvoice.getDueInstallments(tenant._id, { from: todayStart, to: todayEnd }),
          SupplierPurchaseInvoice.getDueInstallments(tenant._id, { from: tomorrowStart, to: tomorrowEnd }),
          User.find({
            tenant: tenant._id,
            role: { $in: ['admin', 'vendor'] },
            isActive: true,
          }).select('_id name phone role branch'),
        ]);

        const invoicesMap = new Map();
        [...todayInvoices, ...tomorrowInvoices].forEach((invoice) => {
          invoicesMap.set(invoice._id.toString(), invoice);
        });

        for (const invoice of invoicesMap.values()) {
          invoicesVisited += 1;
          const schedule = Array.isArray(invoice.installmentsSchedule) ? invoice.installmentsSchedule : [];
          let hasUpdates = false;

          for (const installment of schedule) {
            const dueDate = installment?.dueDate ? new Date(installment.dueDate) : null;
            if (!dueDate || Number.isNaN(dueDate.getTime())) continue;
            if (!['pending', 'partially_paid', 'overdue'].includes(String(installment.status || ''))) continue;

            const isToday = dueDate >= todayStart && dueDate <= todayEnd;
            const isTomorrow = dueDate >= tomorrowStart && dueDate <= tomorrowEnd;
            if (!isToday && !isTomorrow) continue;

            const reminderState = installment.reminders || {};
            if (isToday && reminderState.dueDaySent) continue;
            if (isTomorrow && reminderState.beforeDueSent) continue;

            const installmentAmount = Number(installment.amount || 0);
            const installmentPaid = Number(installment.paidAmount || 0);
            const remainingAmount = Math.max(0, installmentAmount - installmentPaid);
            if (remainingAmount <= 0) continue;

            try {
              NotificationService.onSupplierPaymentDue(tenant._id, {
                supplierName: invoice.supplier?.name || 'مورد',
                amount: remainingAmount,
                dueDate,
                dueLabel: isTomorrow ? 'مستحق غدًا' : 'مستحق',
                isTomorrow,
                invoiceNumber: invoice.invoiceNumber,
                branchId: invoice.branch?._id || invoice.branch || null,
                branchName: invoice.branch?.name || '',
                outstandingAmount: Number(invoice.outstandingAmount || 0),
                relatedModel: 'SupplierPurchaseInvoice',
                relatedId: invoice._id,
              }).catch(() => { });

              if (tenant.whatsapp?.enabled && tenant.whatsapp?.notifications?.supplierPaymentDue) {
                const branchId = invoice.branch?._id || invoice.branch || null;
                const recipients = users.filter((user) => {
                  if (!user.phone) return false;
                  if (user.role === 'admin') return true;
                  if (!branchId) return true;
                  return user.branch && user.branch.toString() === branchId.toString();
                });

                for (const recipient of recipients) {
                  await WhatsAppService.sendVendorSupplierPaymentReminder(
                    recipient.phone,
                    {
                      supplierName: invoice.supplier?.name || 'مورد',
                      amount: remainingAmount,
                      dueDate,
                      invoiceNumber: invoice.invoiceNumber,
                      branchName: invoice.branch?.name || '',
                      outstandingAmount: Number(invoice.outstandingAmount || 0),
                      isTomorrow,
                    },
                    null,
                    {
                      recipientName: recipient.name,
                      tenantWhatsapp: tenant.whatsapp,
                    }
                  );
                }
              }

              installment.reminders = installment.reminders || {};
              if (isToday) installment.reminders.dueDaySent = true;
              if (isTomorrow) installment.reminders.beforeDueSent = true;
              installment.lastReminderAt = new Date();
              hasUpdates = true;
              remindersSent += 1;
            } catch (err) {
              logger.error(`Failed to send supplier reminder: ${err.message}`);
            }
          }

          if (hasUpdates) {
            await invoice.save();
          }
        }
      }

      logger.info('Supplier installment check completed');
      markJobRunSuccess(SUPPLIER_PAYMENTS_JOB, {
        operation: 'checkSupplierPayments',
        processedTenants: tenants.length,
        invoicesVisited,
        remindersSent,
      });
    } catch (error) {
      logger.error(`Supplier installment scheduler error: ${error.message}`);
      markJobRunFailure(SUPPLIER_PAYMENTS_JOB, error, {
        operation: 'checkSupplierPayments',
      });
    }
  }

  /**
   * Mark customer + supplier installments as overdue and send one-time overdue reminders.
   */
  async markOverdueInstallments() {
    markJobRunStarted(OVERDUE_SYNC_JOB, { operation: 'markOverdueInstallments' });

    try {
      logger.info('Marking overdue installments...');

      const now = new Date();
      let remindersSent = 0;

      // -------------------------
      // Customer overdue handling
      // -------------------------
      const overdueInvoices = await Invoice.find({
        'installments.status': 'pending',
        'installments.dueDate': { $lt: now },
      }).populate('customer', 'name phone whatsapp');

      for (const invoice of overdueInvoices) {
        const overdueInstallments = (invoice.installments || []).filter((installment) => (
          installment.status === 'pending' && installment.dueDate < now
        ));

        for (const installment of overdueInstallments) {
          try {
            NotificationService.onInstallmentOverdue(
              invoice.tenant,
              invoice.customer?.name || 'عميل',
              invoice.invoiceNumber,
              installment.amount,
              invoice.branch
            ).catch(() => { });

            const tenant = await Tenant.findById(invoice.tenant).select('whatsapp');
            if (tenant?.whatsapp?.enabled && tenant.whatsapp?.notifications?.installmentReminder) {
              const customerWA = invoice.customer?.whatsapp;
              const phone = customerWA?.number || invoice.customer?.phone;
              if (phone && customerWA?.enabled !== false) {
                const message = `تنبيه تأخير سداد: العميل ${invoice.customer?.name || 'عميل'} لديه قسط متأخر بقيمة ${Number(installment.amount || 0).toLocaleString('ar-EG')} ج.م (فاتورة ${invoice.invoiceNumber}).`;
                await WhatsAppService.sendMessage(phone, message, tenant.whatsapp);
              }
            }

            remindersSent += 1;
          } catch (err) {
            logger.error(`Failed to send customer overdue reminder: ${err.message}`);
          }
        }
      }

      const customerResult = await Invoice.updateMany(
        { 'installments.status': 'pending', 'installments.dueDate': { $lt: now } },
        { $set: { 'installments.$[elem].status': 'overdue' } },
        { arrayFilters: [{ 'elem.status': 'pending', 'elem.dueDate': { $lt: now } }] }
      );

      // -------------------------
      // Supplier overdue handling
      // -------------------------
      const tenants = await Tenant.find({ isActive: true }).select('_id whatsapp');
      let supplierInvoicesUpdated = 0;

      for (const tenant of tenants) {
        const users = await User.find({
          tenant: tenant._id,
          role: { $in: ['admin', 'vendor'] },
          isActive: true,
        }).select('_id name phone role branch');

        const supplierInvoices = await SupplierPurchaseInvoice.find({
          tenant: tenant._id,
          status: { $in: ['open', 'partial_paid'] },
          installmentsSchedule: {
            $elemMatch: {
              status: { $in: ['pending', 'partially_paid', 'overdue'] },
              dueDate: { $lt: now },
            },
          },
        }).populate('supplier', 'name').populate('branch', 'name');

        for (const invoice of supplierInvoices) {
          const schedule = Array.isArray(invoice.installmentsSchedule) ? invoice.installmentsSchedule : [];
          let hasUpdates = false;

          for (const installment of schedule) {
            const dueDate = installment?.dueDate ? new Date(installment.dueDate) : null;
            if (!dueDate || Number.isNaN(dueDate.getTime()) || dueDate >= now) continue;

            const canBeOverdue = ['pending', 'partially_paid', 'overdue'].includes(String(installment.status || ''));
            if (!canBeOverdue) continue;

            const amount = Number(installment.amount || 0);
            const paidAmount = Number(installment.paidAmount || 0);
            const remainingAmount = Math.max(0, amount - paidAmount);
            if (remainingAmount <= 0) continue;

            // Ensure status is overdue
            if (installment.status !== 'overdue') {
              installment.status = 'overdue';
              hasUpdates = true;
            }

            // Send overdue reminder once
            if (installment.reminders?.overdueSent) continue;

            try {
              NotificationService.onSupplierPaymentOverdue(tenant._id, {
                supplierName: invoice.supplier?.name || 'مورد',
                amount: remainingAmount,
                dueDate,
                invoiceNumber: invoice.invoiceNumber,
                branchId: invoice.branch?._id || invoice.branch || null,
                branchName: invoice.branch?.name || '',
                outstandingAmount: Number(invoice.outstandingAmount || 0),
                relatedModel: 'SupplierPurchaseInvoice',
                relatedId: invoice._id,
              }).catch(() => { });

              if (tenant.whatsapp?.enabled && tenant.whatsapp?.notifications?.supplierPaymentDue) {
                const branchId = invoice.branch?._id || invoice.branch || null;
                const recipients = users.filter((user) => {
                  if (!user.phone) return false;
                  if (user.role === 'admin') return true;
                  if (!branchId) return true;
                  return user.branch && user.branch.toString() === branchId.toString();
                });

                for (const recipient of recipients) {
                  await WhatsAppService.sendVendorSupplierPaymentReminder(
                    recipient.phone,
                    {
                      supplierName: invoice.supplier?.name || 'مورد',
                      amount: remainingAmount,
                      dueDate,
                      invoiceNumber: invoice.invoiceNumber,
                      branchName: invoice.branch?.name || '',
                      outstandingAmount: Number(invoice.outstandingAmount || 0),
                      isOverdue: true,
                    },
                    null,
                    {
                      recipientName: recipient.name,
                      tenantWhatsapp: tenant.whatsapp,
                    }
                  );
                }
              }

              installment.reminders = installment.reminders || {};
              installment.reminders.overdueSent = true;
              installment.lastReminderAt = new Date();
              hasUpdates = true;
              remindersSent += 1;
            } catch (err) {
              logger.error(`Failed to send supplier overdue reminder: ${err.message}`);
            }
          }

          if (hasUpdates) {
            await invoice.save();
            supplierInvoicesUpdated += 1;
          }
        }
      }

      logger.info(`Marked ${customerResult.modifiedCount} customer invoices overdue and updated ${supplierInvoicesUpdated} supplier purchase invoices`);
      markJobRunSuccess(OVERDUE_SYNC_JOB, {
        operation: 'markOverdueInstallments',
        customerInvoicesUpdated: customerResult.modifiedCount,
        supplierInvoicesUpdated,
        remindersSent,
      });
    } catch (error) {
      logger.error(`Overdue scheduler error: ${error.message}`);
      markJobRunFailure(OVERDUE_SYNC_JOB, error, {
        operation: 'markOverdueInstallments',
      });
    }
  }
}

module.exports = InstallmentScheduler;
