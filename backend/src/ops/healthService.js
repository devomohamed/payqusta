const os = require('os');
const mongoose = require('mongoose');

const { getRuntimeSnapshot } = require('./runtimeState');

const DB_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function getDatabaseCheck() {
  const connection = mongoose.connection;
  const readyState = connection?.readyState ?? 0;

  let status = 'down';
  if (readyState === 1) {
    status = 'up';
  } else if (readyState === 2 || readyState === 3) {
    status = 'degraded';
  }

  return {
    status,
    ready: readyState === 1,
    state: DB_STATE_LABELS[readyState] || 'unknown',
    host: connection?.host || null,
    name: connection?.name || null,
  };
}

function summarizeStartup(tasks = []) {
  const blockingTasks = tasks.filter((task) => task.blocking !== false);
  const running = blockingTasks.filter((task) => task.status === 'running').length;
  const failed = blockingTasks.filter((task) => task.status === 'error').length;
  const completed = blockingTasks.filter((task) => task.status === 'ok' || task.status === 'skipped').length;

  let status = 'ok';
  if (failed > 0) {
    status = 'error';
  } else if (running > 0) {
    status = 'pending';
  }

  return {
    status,
    ready: failed === 0 && running === 0,
    total: blockingTasks.length,
    completed,
    running,
    failed,
    tasks,
  };
}

function summarizeJobs(jobs = []) {
  const running = jobs.filter((job) => job.status === 'running').length;
  const failing = jobs.filter((job) => job.status === 'error').length;
  const scheduled = jobs.filter((job) => job.status === 'scheduled').length;

  let status = 'ok';
  if (jobs.length === 0) {
    status = 'not_configured';
  } else if (failing > 0) {
    status = 'degraded';
  } else if (running > 0) {
    status = 'running';
  } else if (scheduled > 0) {
    status = 'scheduled';
  }

  return {
    status,
    total: jobs.length,
    running,
    failing,
    scheduled,
    items: jobs,
  };
}

function summarizeJobLocks(jobLocks = []) {
  const now = Date.now();
  const activeLocks = jobLocks.filter((lock) => lock.status === 'active');
  const expiredLocks = jobLocks.filter((lock) => lock.status === 'expired');
  const expiresSoon = activeLocks.filter((lock) => {
    const expiresAt = lock?.expiresAt ? new Date(lock.expiresAt).getTime() : 0;
    return expiresAt > now && expiresAt - now <= 60 * 1000;
  });

  let status = 'ok';
  if (expiredLocks.length > 0) {
    status = 'expired';
  } else if (expiresSoon.length > 0) {
    status = 'expiring_soon';
  } else if (activeLocks.length > 0) {
    status = 'active';
  } else {
    status = 'idle';
  }

  return {
    status,
    total: jobLocks.length,
    active: activeLocks.length,
    expired: expiredLocks.length,
    expiresSoon: expiresSoon.length,
    items: jobLocks,
  };
}

function createHealthSnapshot() {
  const runtime = getRuntimeSnapshot();
  const database = getDatabaseCheck();
  const startup = summarizeStartup(runtime.startupTasks);
  const jobs = summarizeJobs(runtime.jobs);
  const jobLocks = summarizeJobLocks(runtime.jobLocks || []);
  const uptimeSeconds = Number(process.uptime().toFixed(1));
  const ready = database.ready && startup.ready;

  let status = 'ok';
  if (!ready || jobs.failing > 0 || jobLocks.expired > 0) {
    status = 'degraded';
  }

  return {
    runtime,
    database,
    startup,
    jobs,
    jobLocks,
    ready,
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds,
  };
}

function createLivenessPayload() {
  const snapshot = createHealthSnapshot();

  return {
    success: true,
    status: 'ok',
    live: true,
    service: snapshot.runtime.service,
    version: snapshot.runtime.version,
    timestamp: snapshot.timestamp,
    uptimeSeconds: snapshot.uptimeSeconds,
  };
}

function createPublicHealthPayload() {
  const snapshot = createHealthSnapshot();

  return {
    success: true,
    status: snapshot.status,
    live: true,
    ready: snapshot.ready,
    message: 'PayQusta API is running',
    service: snapshot.runtime.service,
    version: snapshot.runtime.version,
    timestamp: snapshot.timestamp,
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: snapshot.uptimeSeconds,
    checks: {
      app: { status: 'up' },
      database: snapshot.database,
      startup: {
        status: snapshot.startup.status,
        total: snapshot.startup.total,
        running: snapshot.startup.running,
        failed: snapshot.startup.failed,
      },
      jobs: {
        status: snapshot.jobs.status,
        total: snapshot.jobs.total,
        running: snapshot.jobs.running,
        failing: snapshot.jobs.failing,
      },
      jobLocks: {
        status: snapshot.jobLocks.status,
        active: snapshot.jobLocks.active,
        expired: snapshot.jobLocks.expired,
      },
    },
  };
}

function createReadinessPayload() {
  const snapshot = createHealthSnapshot();
  const ready = snapshot.ready;

  return {
    statusCode: ready ? 200 : 503,
    body: {
      success: ready,
      status: ready ? 'ready' : 'not_ready',
      ready,
      service: snapshot.runtime.service,
      version: snapshot.runtime.version,
      timestamp: snapshot.timestamp,
      checks: {
        database: snapshot.database,
        startup: {
          status: snapshot.startup.status,
          total: snapshot.startup.total,
          running: snapshot.startup.running,
          failed: snapshot.startup.failed,
        },
      },
    },
  };
}

function createOpsStatusPayload({ req } = {}) {
  const snapshot = createHealthSnapshot();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    success: true,
    status: snapshot.status,
    ready: snapshot.ready,
    service: snapshot.runtime.service,
    version: snapshot.runtime.version,
    timestamp: snapshot.timestamp,
    environment: process.env.NODE_ENV || 'development',
    tenantContext: req?.tenantId ? { tenantId: String(req.tenantId) } : null,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      uptimeSeconds: snapshot.uptimeSeconds,
      listeningAt: snapshot.runtime.listeningAt,
      port: snapshot.runtime.port,
      memoryUsage,
      cpuUsage,
    },
    database: snapshot.database,
    startup: snapshot.startup,
    jobs: snapshot.jobs,
    jobLocks: snapshot.jobLocks,
    config: {
      logging: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        silent: process.env.LOG_SILENT === 'true',
      },
      alerting: {
        webhookConfigured: Boolean(process.env.WEBHOOK_URL),
      },
      uploads: {
        gcsBucketConfigured: Boolean(process.env.GCS_BUCKET_NAME),
        uploadMigrationOnStart: Boolean(process.env.UPLOAD_MIGRATION_ON_START),
      },
      integrations: {
        bostaWebhookSecretConfigured: Boolean(process.env.BOSTA_WEBHOOK_SECRET),
        paymobApiKeyConfigured: Boolean(process.env.PAYMOB_API_KEY),
      },
    },
  };
}

function createOpsMetricsPayload() {
  const snapshot = createHealthSnapshot();
  const memoryUsage = process.memoryUsage();
  const startupItems = snapshot.startup?.tasks || [];
  const jobItems = snapshot.jobs?.items || [];

  const lines = [
    '# HELP payqusta_app_ready Application readiness status (1 ready, 0 not ready)',
    '# TYPE payqusta_app_ready gauge',
    `payqusta_app_ready ${snapshot.ready ? 1 : 0}`,
    '# HELP payqusta_app_status Application status (1 ok, 0 degraded)',
    '# TYPE payqusta_app_status gauge',
    `payqusta_app_status ${snapshot.status === 'ok' ? 1 : 0}`,
    '# HELP payqusta_uptime_seconds Process uptime in seconds',
    '# TYPE payqusta_uptime_seconds gauge',
    `payqusta_uptime_seconds ${snapshot.uptimeSeconds}`,
    '# HELP payqusta_db_ready MongoDB readiness status',
    '# TYPE payqusta_db_ready gauge',
    `payqusta_db_ready ${snapshot.database.ready ? 1 : 0}`,
    '# HELP payqusta_startup_blocking_tasks_total Total blocking startup tasks',
    '# TYPE payqusta_startup_blocking_tasks_total gauge',
    `payqusta_startup_blocking_tasks_total ${snapshot.startup.total}`,
    '# HELP payqusta_startup_blocking_tasks_failed Failed blocking startup tasks',
    '# TYPE payqusta_startup_blocking_tasks_failed gauge',
    `payqusta_startup_blocking_tasks_failed ${snapshot.startup.failed}`,
    '# HELP payqusta_jobs_total Total registered runtime jobs',
    '# TYPE payqusta_jobs_total gauge',
    `payqusta_jobs_total ${snapshot.jobs.total}`,
    '# HELP payqusta_jobs_failing Total failing runtime jobs',
    '# TYPE payqusta_jobs_failing gauge',
    `payqusta_jobs_failing ${snapshot.jobs.failing}`,
    '# HELP payqusta_job_locks_active Active runtime job locks observed by this process',
    '# TYPE payqusta_job_locks_active gauge',
    `payqusta_job_locks_active ${snapshot.jobLocks.active}`,
    '# HELP payqusta_job_locks_expired Expired runtime job locks observed by this process',
    '# TYPE payqusta_job_locks_expired gauge',
    `payqusta_job_locks_expired ${snapshot.jobLocks.expired}`,
    '# HELP payqusta_job_locks_expiring_soon Runtime job locks expiring within 60 seconds',
    '# TYPE payqusta_job_locks_expiring_soon gauge',
    `payqusta_job_locks_expiring_soon ${snapshot.jobLocks.expiresSoon}`,
    '# HELP payqusta_process_memory_rss_bytes Resident set memory usage in bytes',
    '# TYPE payqusta_process_memory_rss_bytes gauge',
    `payqusta_process_memory_rss_bytes ${memoryUsage.rss}`,
    '# HELP payqusta_process_heap_used_bytes Heap used memory in bytes',
    '# TYPE payqusta_process_heap_used_bytes gauge',
    `payqusta_process_heap_used_bytes ${memoryUsage.heapUsed}`,
  ];

  startupItems.forEach((task) => {
    const taskName = String(task.name || 'unknown').replace(/[^a-zA-Z0-9_]/g, '_');
    const value = task.status === 'ok' || task.status === 'skipped' ? 1 : 0;
    lines.push(`payqusta_startup_task_status{task="${taskName}"} ${value}`);
  });

  jobItems.forEach((job) => {
    const jobName = String(job.name || 'unknown').replace(/[^a-zA-Z0-9_]/g, '_');
    const isHealthy = job.status !== 'error' ? 1 : 0;
    lines.push(`payqusta_job_status{job="${jobName}"} ${isHealthy}`);
    lines.push(`payqusta_job_run_count{job="${jobName}"} ${Number(job.runCount || 0)}`);
    lines.push(`payqusta_job_consecutive_failures{job="${jobName}"} ${Number(job.consecutiveFailures || 0)}`);
    if (job.lastDurationMs !== undefined && job.lastDurationMs !== null) {
      lines.push(`payqusta_job_last_duration_ms{job="${jobName}"} ${Number(job.lastDurationMs || 0)}`);
    }
  });

  return `${lines.join('\n')}\n`;
}

module.exports = {
  createLivenessPayload,
  createPublicHealthPayload,
  createReadinessPayload,
  createOpsStatusPayload,
  createOpsMetricsPayload,
};
