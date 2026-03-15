#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [key, value] = raw.slice(2).split('=');
    args[key] = value === undefined ? true : value;
  }
  return args;
}

function ensureParentDir(filePath) {
  const targetDir = path.dirname(filePath);
  fs.mkdirSync(targetDir, { recursive: true });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    body = text;
  }

  return { response, body, text };
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  return { response, text };
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildCheck(name, passed, details, severity = 'error') {
  return { name, passed: Boolean(passed), details, severity };
}

function renderMarkdown(summary) {
  const lines = [
    '# Release Validation',
    '',
    `- Collected at: ${summary.collectedAt}`,
    `- App URL: ${summary.appUrl}`,
    `- Result: ${summary.passed ? 'PASS' : 'FAIL'}`,
    '',
    '## Checks',
    '',
  ];

  summary.checks.forEach((check) => {
    lines.push(`- [${check.passed ? 'x' : ' '}] ${check.name}: ${check.details}`);
  });

  if (summary.failures.length > 0) {
    lines.push('', '## Failures', '');
    summary.failures.forEach((failure) => {
      lines.push(`- ${failure.name}: ${failure.details}`);
    });
  }

  if (summary.warnings.length > 0) {
    lines.push('', '## Warnings', '');
    summary.warnings.forEach((warning) => {
      lines.push(`- ${warning.name}: ${warning.details}`);
    });
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appUrl = (args['app-url'] || process.env.APP_URL || process.env.CLIENT_URL || '').replace(/\/+$/, '');
  const opsToken = args['ops-token'] || process.env.OPS_BEARER_TOKEN || '';
  const maxFailingJobs = toInt(args['max-failing-jobs'], 0);
  const maxExpiredLocks = toInt(args['max-expired-locks'], 0);
  const maxExpiringSoonLocks = toInt(args['max-expiring-soon-locks'], 5);
  const requireWebhookConfigured = Boolean(args['require-webhook-configured']);
  const writeJson = args['write-json'] ? path.resolve(process.cwd(), args['write-json']) : null;
  const writeMarkdown = args['write-markdown'] ? path.resolve(process.cwd(), args['write-markdown']) : null;

  if (!appUrl) {
    console.error('Missing --app-url or APP_URL/CLIENT_URL.');
    process.exit(1);
  }

  if (!opsToken) {
    console.error('Missing OPS_BEARER_TOKEN or --ops-token. Release validation requires protected ops access.');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${opsToken}`,
  };

  const [health, readiness, opsStatus, metrics] = await Promise.all([
    fetchJson(`${appUrl}/api/health`),
    fetchJson(`${appUrl}/api/health/ready`),
    fetchJson(`${appUrl}/api/v1/ops/status`, { headers }),
    fetchText(`${appUrl}/api/v1/ops/metrics`, { headers }),
  ]);

  const checks = [
    buildCheck('public health status', health.response.status === 200, `status=${health.response.status}`),
    buildCheck('public health ready flag', health.body?.ready === true, `ready=${String(health.body?.ready)}`),
    buildCheck('readiness endpoint', readiness.response.status === 200 && readiness.body?.ready === true, `status=${readiness.response.status}, ready=${String(readiness.body?.ready)}`),
    buildCheck('ops status endpoint', opsStatus.response.status === 200, `status=${opsStatus.response.status}`),
    buildCheck('ops status ready flag', opsStatus.body?.ready === true, `ready=${String(opsStatus.body?.ready)}`),
    buildCheck('startup failures', Number(opsStatus.body?.startup?.failed || 0) === 0, `failed=${Number(opsStatus.body?.startup?.failed || 0)}`),
    buildCheck('failing jobs threshold', Number(opsStatus.body?.jobs?.failing || 0) <= maxFailingJobs, `failing=${Number(opsStatus.body?.jobs?.failing || 0)}, allowed=${maxFailingJobs}`),
    buildCheck('expired job locks threshold', Number(opsStatus.body?.jobLocks?.expired || 0) <= maxExpiredLocks, `expired=${Number(opsStatus.body?.jobLocks?.expired || 0)}, allowed=${maxExpiredLocks}`),
    buildCheck('expiring-soon job locks threshold', Number(opsStatus.body?.jobLocks?.expiresSoon || 0) <= maxExpiringSoonLocks, `expiresSoon=${Number(opsStatus.body?.jobLocks?.expiresSoon || 0)}, allowed=${maxExpiringSoonLocks}`, 'warning'),
    buildCheck('metrics endpoint', metrics.response.status === 200, `status=${metrics.response.status}`),
    buildCheck('metrics readiness gauge', metrics.text.includes('payqusta_app_ready'), 'payqusta_app_ready present'),
    buildCheck('metrics job gauge', metrics.text.includes('payqusta_jobs_total'), 'payqusta_jobs_total present'),
    buildCheck('metrics job lock gauge', metrics.text.includes('payqusta_job_locks_active'), 'payqusta_job_locks_active present'),
  ];

  if (requireWebhookConfigured) {
    checks.push(
      buildCheck(
        'alerting webhook configured',
        opsStatus.body?.config?.alerting?.webhookConfigured === true,
        `webhookConfigured=${String(opsStatus.body?.config?.alerting?.webhookConfigured)}`
      )
    );
  }

  const failures = checks.filter((check) => !check.passed && check.severity !== 'warning');
  const warnings = checks.filter((check) => !check.passed && check.severity === 'warning');

  const summary = {
    collectedAt: new Date().toISOString(),
    appUrl,
    passed: failures.length === 0,
    thresholds: {
      maxFailingJobs,
      maxExpiredLocks,
      maxExpiringSoonLocks,
      requireWebhookConfigured,
    },
    checks,
    failures,
    warnings,
    snapshot: {
      health: health.body,
      readiness: readiness.body,
      opsStatus: opsStatus.body,
    },
  };

  if (writeJson) {
    ensureParentDir(writeJson);
    fs.writeFileSync(writeJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  if (writeMarkdown) {
    ensureParentDir(writeMarkdown);
    fs.writeFileSync(writeMarkdown, renderMarkdown(summary), 'utf8');
  }

  console.log(`Release validation for ${appUrl}`);
  checks.forEach((check) => {
    const label = check.passed ? 'OK' : (check.severity === 'warning' ? 'WARN' : 'FAIL');
    console.log(`${label} ${check.name}: ${check.details}`);
  });

  if (failures.length > 0) {
    console.error(`Release validation failed with ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  console.log('Release validation passed.');
}

main().catch((error) => {
  console.error(`Release validation failed: ${error.message}`);
  process.exit(1);
});
