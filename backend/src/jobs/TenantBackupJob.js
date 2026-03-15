const cron = require('node-cron');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');
const NotificationService = require('../services/NotificationService');
const { buildTenantJsonBackup } = require('../services/backupExportService');
const {
  saveAutoBackup,
  enforceRetention,
} = require('../services/autoBackupStorageService');
const {
  registerJob,
  markJobRunStarted,
  markJobRunSuccess,
  markJobRunFailure,
  markJobRunSkipped,
} = require('../ops/runtimeState');
const { acquireJobLock, releaseJobLock } = require('../services/jobLockService');

const TENANT_BACKUP_JOB = 'tenant_auto_backup';

function shouldNotifyFailure(autoBackup = {}, errorMessage) {
  const hadFailure = Boolean(autoBackup.lastFailureAt);
  const hadSuccessAfterFailure = autoBackup.lastSuccessAt
    && autoBackup.lastFailureAt
    && new Date(autoBackup.lastSuccessAt) >= new Date(autoBackup.lastFailureAt);

  if (!hadFailure || hadSuccessAfterFailure) return true;
  return String(autoBackup.lastError || '') !== String(errorMessage || '');
}

class TenantBackupJob {
  start() {
    registerJob(TENANT_BACKUP_JOB, {
      schedule: '0 3 * * *',
      timezone: 'Africa/Cairo',
      category: 'backup',
    });

    cron.schedule('0 3 * * *', () => this.run(), {
      timezone: 'Africa/Cairo',
    });

    logger.info('Tenant Auto Backup Job started');
  }

  async run() {
    const lock = await acquireJobLock({
      jobName: TENANT_BACKUP_JOB,
      leaseMs: 6 * 60 * 60 * 1000,
      metadata: { operation: 'run' },
    });
    if (!lock.acquired) {
      markJobRunSkipped(TENANT_BACKUP_JOB, { operation: 'run', reason: 'lock_not_acquired' });
      return;
    }

    markJobRunStarted(TENANT_BACKUP_JOB, { operation: 'run' });

    try {
      const tenants = await Tenant.find({
        isActive: true,
        'settings.autoBackup.enabled': true,
      })
        .select('name settings.autoBackup')
        .lean();

      let processedTenants = 0;
      let successCount = 0;
      let failureCount = 0;
      let deletedOldBackups = 0;

      for (const tenant of tenants) {
        processedTenants += 1;
        const tenantId = tenant._id;
        const autoBackup = tenant.settings?.autoBackup || {};
        const startedAt = new Date();

        try {
          const backupPayload = await buildTenantJsonBackup(tenantId);
          const storedBackup = await saveAutoBackup({
            tenantId,
            payload: backupPayload,
            date: startedAt,
          });

          deletedOldBackups += await enforceRetention(
            tenantId,
            Math.max(1, Number(autoBackup.retention?.keepLast || 14)),
            [storedBackup.key]
          );

          await Tenant.updateOne(
            { _id: tenantId },
            {
              $set: {
                'settings.autoBackup.lastRunAt': startedAt,
                'settings.autoBackup.lastSuccessAt': startedAt,
                'settings.autoBackup.lastError': '',
                'settings.autoBackup.lastBackupKey': storedBackup.key,
              },
            }
          );

          successCount += 1;
        } catch (error) {
          const errorMessage = String(error?.message || 'Unknown auto backup error');

          const updateData = {
            'settings.autoBackup.lastRunAt': startedAt,
            'settings.autoBackup.lastFailureAt': startedAt,
            'settings.autoBackup.lastError': errorMessage,
          };

          await Tenant.updateOne({ _id: tenantId }, { $set: updateData });

          if (shouldNotifyFailure(autoBackup, errorMessage)) {
            await NotificationService.onAutoBackupFailure(tenantId, {
              failedAt: startedAt,
              error: errorMessage,
            }).catch(() => {});
          }

          failureCount += 1;
          logger.error(`Auto backup failed for tenant ${tenantId}: ${errorMessage}`);
        }
      }

      markJobRunSuccess(TENANT_BACKUP_JOB, {
        operation: 'run',
        processedTenants,
        successCount,
        failureCount,
        deletedOldBackups,
      });
    } catch (error) {
      logger.error(`Tenant auto backup job error: ${error.message}`);
      markJobRunFailure(TENANT_BACKUP_JOB, error, {
        operation: 'run',
      });
    } finally {
      await releaseJobLock(lock);
    }
  }
}

module.exports = TenantBackupJob;
