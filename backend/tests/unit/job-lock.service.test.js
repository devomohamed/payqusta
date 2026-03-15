jest.mock('../../src/models/JobLock', () => ({
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
}));

const JobLock = require('../../src/models/JobLock');
const { runtimeState } = require('../../src/ops/runtimeState');
const {
  buildLockKey,
  cleanupExpiredJobLocks,
  acquireJobLock,
  releaseJobLock,
  withJobLock,
} = require('../../src/services/jobLockService');

describe('jobLockService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runtimeState.jobLocks.clear();
    JobLock.deleteMany.mockResolvedValue({ acknowledged: true, deletedCount: 0 });
  });

  it('builds stable lock keys', () => {
    expect(buildLockKey('tenant_auto_backup')).toBe('tenant_auto_backup:global');
    expect(buildLockKey('stock_monitor', 'tenant-1')).toBe('stock_monitor:tenant-1');
  });

  it('cleans up expired locks', async () => {
    JobLock.deleteMany.mockResolvedValue({ acknowledged: true, deletedCount: 2 });

    const result = await cleanupExpiredJobLocks(new Date('2026-03-15T12:00:00.000Z'));

    expect(result.deletedCount).toBe(2);
    expect(JobLock.deleteMany).toHaveBeenCalledWith({
      expiresAt: { $lte: new Date('2026-03-15T12:00:00.000Z') },
    });
  });

  it('acquires a lock when the backing store upserts successfully', async () => {
    JobLock.findOneAndUpdate.mockResolvedValue({ _id: 'lock-1', key: 'stock_monitor:global' });

    const result = await acquireJobLock({
      jobName: 'stock_monitor',
      contextKey: 'global',
      ownerId: 'worker-1',
      leaseMs: 60000,
      metadata: { operation: 'checkStockLevels' },
    });

    expect(result.acquired).toBe(true);
    expect(result.key).toBe('stock_monitor:global');
    expect(runtimeState.jobLocks.get('stock_monitor:global')).toEqual(expect.objectContaining({
      status: 'active',
      ownerId: 'worker-1',
      jobName: 'stock_monitor',
    }));
    expect(JobLock.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'stock_monitor:global',
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          jobName: 'stock_monitor',
          contextKey: 'global',
          ownerId: 'worker-1',
          metadata: { operation: 'checkStockLevels' },
        }),
        $setOnInsert: { key: 'stock_monitor:global' },
      }),
      { upsert: true, new: true }
    );
  });

  it('returns skipped acquisition when another worker already owns the lock', async () => {
    const duplicateError = new Error('duplicate key');
    duplicateError.code = 11000;
    JobLock.findOneAndUpdate.mockRejectedValue(duplicateError);

    const result = await acquireJobLock({
      jobName: 'tenant_auto_backup',
      ownerId: 'worker-2',
    });

    expect(result).toEqual(expect.objectContaining({
      acquired: false,
      key: 'tenant_auto_backup:global',
      ownerId: 'worker-2',
    }));
  });

  it('releases a lock after the wrapped runner completes', async () => {
    JobLock.findOneAndUpdate.mockResolvedValue({ _id: 'lock-2', key: 'product_trends:global' });
    JobLock.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

    const runner = jest.fn().mockResolvedValue('ok');
    const result = await withJobLock(
      { jobName: 'product_trends', ownerId: 'worker-3' },
      runner
    );

    expect(result.executed).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.result).toBe('ok');
    expect(runner).toHaveBeenCalledTimes(1);
    expect(JobLock.deleteOne).toHaveBeenCalledWith({
      key: 'product_trends:global',
      ownerId: 'worker-3',
    });
    expect(runtimeState.jobLocks.has('product_trends:global')).toBe(false);
  });

  it('can release a lock directly by key', async () => {
    JobLock.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 });
    runtimeState.jobLocks.set('customer_installment_reminders:global', {
      key: 'customer_installment_reminders:global',
      status: 'active',
      ownerId: 'worker-4',
    });

    await releaseJobLock({ key: 'customer_installment_reminders:global', ownerId: 'worker-4' });

    expect(JobLock.deleteOne).toHaveBeenCalledWith({
      key: 'customer_installment_reminders:global',
      ownerId: 'worker-4',
    });
    expect(runtimeState.jobLocks.has('customer_installment_reminders:global')).toBe(false);
  });
});
