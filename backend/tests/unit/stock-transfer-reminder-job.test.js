jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/StockTransfer', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/services/NotificationService', () => ({
  sendDeduped: jest.fn(),
  notifyTenantAdminsDeduped: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../src/utils/shippingHelpers', () => ({
  getTenantShippingSettings: jest.fn(),
}));

jest.mock('../../src/ops/runtimeState', () => ({
  registerJob: jest.fn(),
  markJobRunStarted: jest.fn(),
  markJobRunSuccess: jest.fn(),
  markJobRunFailure: jest.fn(),
  markJobRunSkipped: jest.fn(),
}));

jest.mock('../../src/services/jobLockService', () => ({
  acquireJobLock: jest.fn(),
  releaseJobLock: jest.fn(),
}));

const Tenant = require('../../src/models/Tenant');
const StockTransfer = require('../../src/models/StockTransfer');
const NotificationService = require('../../src/services/NotificationService');
const { getTenantShippingSettings } = require('../../src/utils/shippingHelpers');
const {
  markJobRunStarted,
  markJobRunSuccess,
  markJobRunFailure,
  markJobRunSkipped,
} = require('../../src/ops/runtimeState');
const { acquireJobLock, releaseJobLock } = require('../../src/services/jobLockService');
const StockTransferReminderJob = require('../../src/jobs/StockTransferReminderJob');

function mockSelectQuery(value) {
  return {
    select: jest.fn().mockResolvedValue(value),
  };
}

function mockPopulateQuery(value) {
  const query = {
    populate: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (reject) => Promise.resolve(value).catch(reject),
  };
  return query;
}

describe('StockTransferReminderJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acquireJobLock.mockResolvedValue({ acquired: true, token: 'lock-token' });
    releaseJobLock.mockResolvedValue();
  });

  it('sends overdue reminders and updates transfer reminder state', async () => {
    const tenant = { _id: 'tenant-1', name: 'Tenant 1' };
    const transfer = {
      _id: 'transfer-1',
      tenant: 'tenant-1',
      transferNumber: 'TR-1001',
      status: 'requested',
      timeline: [{ status: 'requested', at: new Date(Date.now() - 8 * 60 * 60 * 1000) }],
      fromBranch: { name: 'Branch Y', manager: 'manager-1' },
      toBranch: { name: 'Branch X' },
      order: { _id: 'order-1', invoiceNumber: 'INV-1001' },
      reminders: {},
      save: jest.fn().mockResolvedValue(),
    };

    Tenant.find.mockReturnValue(mockSelectQuery([tenant]));
    getTenantShippingSettings.mockReturnValue({
      transferReminders: {
        enabled: true,
        hoursToOverdue: 6,
        reminderIntervalHours: 4,
      },
    });
    StockTransfer.find.mockReturnValue(mockPopulateQuery([transfer]));

    await StockTransferReminderJob.processOverdueTransfers();

    expect(markJobRunStarted).toHaveBeenCalledTimes(1);
    expect(NotificationService.sendDeduped).toHaveBeenCalledTimes(1);
    expect(NotificationService.sendDeduped).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: 'tenant-1',
        recipient: 'manager-1',
        relatedId: 'order-1',
      }),
      expect.objectContaining({
        dedupeWindowMinutes: 240,
      })
    );
    expect(NotificationService.notifyTenantAdminsDeduped).toHaveBeenCalledTimes(1);
    expect(NotificationService.notifyTenantAdminsDeduped).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        relatedId: 'order-1',
        link: '/stock-transfers/transfer-1',
      }),
      expect.objectContaining({
        roles: ['admin', 'coordinator'],
        dedupeWindowMinutes: 240,
      })
    );
    expect(transfer.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(transfer.reminders).toEqual(expect.objectContaining({
      overdueSince: expect.any(Date),
      lastOverdueReminderAt: expect.any(Date),
      lastOverdueStatus: 'requested',
    }));
    expect(markJobRunSuccess).toHaveBeenCalledWith(
      'stock_transfer_overdue_reminders',
      expect.objectContaining({
        processedTenants: 1,
        transfersVisited: 1,
        remindersSent: 2,
      })
    );
    expect(markJobRunFailure).not.toHaveBeenCalled();
    expect(markJobRunSkipped).not.toHaveBeenCalled();
    expect(releaseJobLock).toHaveBeenCalledWith(expect.objectContaining({ acquired: true }));
  });

  it('skips transfer scanning when tenant reminders are disabled', async () => {
    const tenant = { _id: 'tenant-2', name: 'Tenant 2' };

    Tenant.find.mockReturnValue(mockSelectQuery([tenant]));
    getTenantShippingSettings.mockReturnValue({
      transferReminders: {
        enabled: false,
        hoursToOverdue: 6,
        reminderIntervalHours: 4,
      },
    });

    await StockTransferReminderJob.processOverdueTransfers();

    expect(StockTransfer.find).not.toHaveBeenCalled();
    expect(NotificationService.sendDeduped).not.toHaveBeenCalled();
    expect(NotificationService.notifyTenantAdminsDeduped).not.toHaveBeenCalled();
    expect(markJobRunSuccess).toHaveBeenCalledWith(
      'stock_transfer_overdue_reminders',
      expect.objectContaining({
        processedTenants: 1,
        transfersVisited: 0,
        remindersSent: 0,
      })
    );
  });
});
