const os = require('os');
const JobLock = require('../models/JobLock');
const {
  trackJobLockAcquired,
  trackJobLockReleased,
  removeTrackedJobLock,
} = require('../ops/runtimeState');

const DEFAULT_LEASE_MS = 20 * 60 * 1000;
const DEFAULT_OWNER_ID = `${os.hostname()}:${process.pid}`;

function buildLockKey(jobName, contextKey = 'global') {
  return `${jobName}:${contextKey || 'global'}`;
}

async function cleanupExpiredJobLocks(referenceTime = new Date()) {
  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
  const result = await JobLock.deleteMany({ expiresAt: { $lte: now } });

  return {
    deletedCount: Number(result?.deletedCount || 0),
    cleanedAt: now,
  };
}

async function acquireJobLock({
  jobName,
  contextKey = 'global',
  ownerId = DEFAULT_OWNER_ID,
  leaseMs = DEFAULT_LEASE_MS,
  metadata = {},
} = {}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(1000, Number(leaseMs || DEFAULT_LEASE_MS)));
  const key = buildLockKey(jobName, contextKey);

  await cleanupExpiredJobLocks(now).catch(() => null);

  try {
    const lock = await JobLock.findOneAndUpdate(
      {
        key,
        $or: [
          { expiresAt: { $lte: now } },
          { ownerId },
        ],
      },
      {
        $set: {
          jobName,
          contextKey,
          ownerId,
          acquiredAt: now,
          expiresAt,
          metadata,
        },
        $setOnInsert: {
          key,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    trackJobLockAcquired({
      key,
      jobName,
      contextKey,
      ownerId,
      acquiredAt: now,
      expiresAt,
      metadata,
    });

    return {
      acquired: true,
      key,
      ownerId,
      leaseMs,
      expiresAt,
      lock,
    };
  } catch (error) {
    if (error?.code === 11000) {
      return {
        acquired: false,
        key,
        ownerId,
        leaseMs,
      };
    }

    throw error;
  }
}

async function releaseJobLock({ jobName, contextKey = 'global', key, ownerId = DEFAULT_OWNER_ID } = {}) {
  const effectiveKey = key || buildLockKey(jobName, contextKey);

  await JobLock.deleteOne({
    key: effectiveKey,
    ownerId,
  });

  trackJobLockReleased({
    key: effectiveKey,
    ownerId,
    reason: 'released',
  });
  removeTrackedJobLock(effectiveKey);
}

async function withJobLock(options = {}, runner) {
  const lock = await acquireJobLock(options);
  if (!lock.acquired) return { executed: false, skipped: true, reason: 'lock_not_acquired' };

  try {
    const result = await runner(lock);
    return {
      executed: true,
      skipped: false,
      result,
      lock,
    };
  } finally {
    await releaseJobLock({
      key: lock.key,
      ownerId: lock.ownerId,
    });
  }
}

module.exports = {
  DEFAULT_LEASE_MS,
  DEFAULT_OWNER_ID,
  buildLockKey,
  cleanupExpiredJobLocks,
  acquireJobLock,
  releaseJobLock,
  withJobLock,
};
