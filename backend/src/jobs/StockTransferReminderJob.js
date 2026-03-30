const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const StockTransfer = require('../models/StockTransfer');
const User = require('../models/User');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');
const { userHasPermission } = require('../middleware/checkPermission');
const { getTenantShippingSettings } = require('../utils/shippingHelpers');
const {
  registerJob,
  markJobRunStarted,
  markJobRunSuccess,
  markJobRunFailure,
  markJobRunSkipped,
} = require('../ops/runtimeState');
const { acquireJobLock, releaseJobLock } = require('../services/jobLockService');

const JOB_NAME = 'stock_transfer_overdue_reminders';
const REMINDABLE_STATUSES = new Set(['requested', 'approved', 'prepared']);

function getStatusTimestamp(transfer) {
  const timeline = Array.isArray(transfer.timeline) ? transfer.timeline : [];
  const matchingEntry = [...timeline].reverse().find((entry) => entry?.status === transfer.status);
  return matchingEntry?.at ? new Date(matchingEntry.at) : new Date(transfer.updatedAt || transfer.createdAt || Date.now());
}

class StockTransferReminderJob {
  start() {
    registerJob(JOB_NAME, {
      schedule: '0 * * * *',
      timezone: 'Africa/Cairo',
      category: 'operations',
    });

    cron.schedule('0 * * * *', () => this.processOverdueTransfers(), {
      timezone: 'Africa/Cairo',
    });

    logger.info('Stock Transfer Reminder Job started');
  }

  async processOverdueTransfers() {
    const lock = await acquireJobLock({
      jobName: JOB_NAME,
      leaseMs: 45 * 60 * 1000,
      metadata: { operation: 'processOverdueTransfers' },
    });

    if (!lock.acquired) {
      markJobRunSkipped(JOB_NAME, { operation: 'processOverdueTransfers', reason: 'lock_not_acquired' });
      return;
    }

    markJobRunStarted(JOB_NAME, { operation: 'processOverdueTransfers' });

    try {
      const tenants = await Tenant.find({ isActive: true }).select('settings.shipping name');
      let transfersVisited = 0;
      let remindersSent = 0;

      for (const tenant of tenants) {
        const shippingSettings = getTenantShippingSettings(tenant);
        const reminderSettings = shippingSettings.transferReminders || {};

        if (reminderSettings.enabled === false) {
          continue;
        }

        const transfers = await StockTransfer.find({
          tenant: tenant._id,
          status: { $in: [...REMINDABLE_STATUSES] },
        })
          .populate('fromBranch', 'name manager')
          .populate('toBranch', 'name')
          .populate('order', 'invoiceNumber');

        for (const transfer of transfers) {
          transfersVisited += 1;

          const statusAt = getStatusTimestamp(transfer);
          const overdueMs = Math.max(Number(reminderSettings.hoursToOverdue || 6), 1) * 60 * 60 * 1000;
          const reminderIntervalMs = Math.max(Number(reminderSettings.reminderIntervalHours || 4), 1) * 60 * 60 * 1000;
          const now = Date.now();

          if ((now - statusAt.getTime()) < overdueMs) {
            continue;
          }

          const lastReminderAt = transfer.reminders?.lastOverdueReminderAt
            ? new Date(transfer.reminders.lastOverdueReminderAt).getTime()
            : 0;

          if (lastReminderAt && (now - lastReminderAt) < reminderIntervalMs) {
            continue;
          }

          const baseLink = `/stock-transfers/${transfer._id}`;
          const invoiceNumber = transfer.order?.invoiceNumber || 'تزويد مباشر';
          const relatedPayload = transfer.order?._id
            ? { relatedModel: 'Invoice', relatedId: transfer.order._id }
            : { relatedModel: 'StockTransfer', relatedId: transfer._id };
          const statusLabel = transfer.status === 'requested'
            ? 'بانتظار قبول الفرع المرسل'
            : transfer.status === 'approved'
              ? 'بانتظار التجهيز'
              : 'بانتظار الشحن الداخلي';

          if (transfer.fromBranch?.manager) {
            const managerUser = await User.findOne({
              _id: transfer.fromBranch.manager,
              tenant: tenant._id,
              isActive: true,
            }).select('_id role customRole tenant isSuperAdmin email');

            if (managerUser && await userHasPermission(managerUser, 'invoices', 'update')) {
              await NotificationService.sendDeduped({
              tenant: tenant._id,
              recipient: managerUser._id,
              type: 'order_status',
              title: 'طلب تحويل متأخر',
              message: `التحويل ${transfer.transferNumber} للطلب #${invoiceNumber} ما زال ${statusLabel}.`,
              icon: 'clock-3',
              color: 'warning',
              link: baseLink,
              ...relatedPayload,
            }, {
              dedupeWindowMinutes: Math.ceil(reminderIntervalMs / (60 * 1000)),
              extraMatch: { message: `التحويل ${transfer.transferNumber} للطلب #${invoiceNumber} ما زال ${statusLabel}.` },
            });
              remindersSent += 1;
            }
          }

          await NotificationService.notifyTenantAdminsDeduped(tenant._id, {
            type: 'order_status',
            title: 'تحويل يحتاج متابعة',
            message: `التحويل ${transfer.transferNumber} من ${transfer.fromBranch?.name || 'فرع غير محدد'} إلى ${transfer.toBranch?.name || 'فرع غير محدد'} تجاوز المهلة المتوقعة.`,
            icon: 'alert-triangle',
            color: 'warning',
            link: baseLink,
            ...relatedPayload,
          }, {
            roles: ['admin', 'coordinator'],
            permission: { resource: 'invoices', action: 'update' },
            dedupeWindowMinutes: Math.ceil(reminderIntervalMs / (60 * 1000)),
          });
          remindersSent += 1;

          transfer.reminders = {
            ...(transfer.reminders || {}),
            overdueSince: transfer.reminders?.overdueSince || statusAt,
            lastOverdueReminderAt: new Date(now),
            lastOverdueStatus: transfer.status,
          };
          await transfer.save({ validateBeforeSave: false });
        }
      }

      markJobRunSuccess(JOB_NAME, {
        operation: 'processOverdueTransfers',
        processedTenants: tenants.length,
        transfersVisited,
        remindersSent,
      });
    } catch (error) {
      logger.error(`Stock transfer reminder job error: ${error.message}`);
      markJobRunFailure(JOB_NAME, error, { operation: 'processOverdueTransfers' });
    } finally {
      await releaseJobLock(lock);
    }
  }
}

module.exports = new StockTransferReminderJob();
