const runtimeState = {
  service: 'payqusta',
  version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
  startedAt: new Date().toISOString(),
  listeningAt: null,
  port: null,
  startupTasks: new Map(),
  jobs: new Map(),
};

function toIso(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
  };
}

function upsertStartupTask(name, nextState = {}) {
  const existing = runtimeState.startupTasks.get(name) || {
    name,
    createdAt: toIso(),
    blocking: true,
  };

  const merged = {
    ...existing,
    ...nextState,
    name,
  };

  runtimeState.startupTasks.set(name, merged);
  return merged;
}

function startStartupTask(name, options = {}) {
  const now = toIso();

  return upsertStartupTask(name, {
    status: 'running',
    description: options.description || null,
    blocking: options.blocking !== false,
    metadata: {
      ...(options.metadata || {}),
    },
    error: null,
    startedAt: now,
    updatedAt: now,
  });
}

function completeStartupTask(name, details = {}) {
  const now = toIso();
  const existing = runtimeState.startupTasks.get(name);

  return upsertStartupTask(name, {
    status: 'ok',
    blocking: existing?.blocking !== false,
    details: {
      ...(existing?.details || {}),
      ...details,
    },
    error: null,
    completedAt: now,
    updatedAt: now,
  });
}

function failStartupTask(name, error, details = {}) {
  const now = toIso();
  const existing = runtimeState.startupTasks.get(name);

  return upsertStartupTask(name, {
    status: 'error',
    blocking: existing?.blocking !== false,
    details: {
      ...(existing?.details || {}),
      ...details,
    },
    error: normalizeError(error),
    completedAt: now,
    updatedAt: now,
  });
}

function skipStartupTask(name, details = {}) {
  const now = toIso();

  return upsertStartupTask(name, {
    status: 'skipped',
    blocking: false,
    details,
    error: null,
    completedAt: now,
    updatedAt: now,
  });
}

function upsertJob(name, nextState = {}) {
  const existing = runtimeState.jobs.get(name) || {
    name,
    createdAt: toIso(),
    runCount: 0,
    consecutiveFailures: 0,
  };

  const merged = {
    ...existing,
    ...nextState,
    name,
  };

  runtimeState.jobs.set(name, merged);
  return merged;
}

function registerJob(name, metadata = {}) {
  return upsertJob(name, {
    status: 'scheduled',
    enabled: true,
    metadata: {
      ...(runtimeState.jobs.get(name)?.metadata || {}),
      ...metadata,
    },
    updatedAt: toIso(),
  });
}

function markJobRunStarted(name, details = {}) {
  const now = toIso();
  const existing = runtimeState.jobs.get(name);

  return upsertJob(name, {
    status: 'running',
    enabled: existing?.enabled !== false,
    lastStartedAt: now,
    lastContext: details,
    currentRunStartedAt: now,
    updatedAt: now,
  });
}

function markJobRunSuccess(name, details = {}) {
  const now = toIso();
  const existing = runtimeState.jobs.get(name) || {};
  const startedAt = existing.currentRunStartedAt ? new Date(existing.currentRunStartedAt) : null;
  const durationMs = startedAt ? Math.max(0, Date.now() - startedAt.getTime()) : null;

  return upsertJob(name, {
    status: 'ok',
    runCount: Number(existing.runCount || 0) + 1,
    consecutiveFailures: 0,
    lastRunAt: now,
    lastSuccessAt: now,
    lastDurationMs: durationMs,
    lastContext: details,
    currentRunStartedAt: null,
    error: null,
    updatedAt: now,
  });
}

function markJobRunFailure(name, error, details = {}) {
  const now = toIso();
  const existing = runtimeState.jobs.get(name) || {};
  const startedAt = existing.currentRunStartedAt ? new Date(existing.currentRunStartedAt) : null;
  const durationMs = startedAt ? Math.max(0, Date.now() - startedAt.getTime()) : null;

  return upsertJob(name, {
    status: 'error',
    runCount: Number(existing.runCount || 0) + 1,
    consecutiveFailures: Number(existing.consecutiveFailures || 0) + 1,
    lastRunAt: now,
    lastFailureAt: now,
    lastDurationMs: durationMs,
    lastContext: details,
    currentRunStartedAt: null,
    error: normalizeError(error),
    updatedAt: now,
  });
}

function setServerListening({ port } = {}) {
  runtimeState.listeningAt = toIso();
  runtimeState.port = port || runtimeState.port;
}

function serializeRecords(records) {
  return Array.from(records.values()).map((entry) => ({ ...entry }));
}

function getRuntimeSnapshot() {
  return {
    service: runtimeState.service,
    version: runtimeState.version,
    startedAt: runtimeState.startedAt,
    listeningAt: runtimeState.listeningAt,
    port: runtimeState.port,
    startupTasks: serializeRecords(runtimeState.startupTasks),
    jobs: serializeRecords(runtimeState.jobs),
  };
}

module.exports = {
  runtimeState,
  startStartupTask,
  completeStartupTask,
  failStartupTask,
  skipStartupTask,
  registerJob,
  markJobRunStarted,
  markJobRunSuccess,
  markJobRunFailure,
  setServerListening,
  getRuntimeSnapshot,
};
