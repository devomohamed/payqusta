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

function buildCheck(name, passed, details, severity = 'error') {
  return { name, passed: Boolean(passed), details, severity };
}

function renderMarkdown(summary) {
  const lines = [
    '# Tenant Onboarding Readiness',
    '',
    '- Collected at: ' + summary.collectedAt,
    '- App URL: ' + summary.appUrl,
    '- Tenant ID: ' + (summary.tenantId || 'unknown'),
    '- Result: ' + (summary.passed ? 'PASS' : 'FAIL'),
    '',
    '## Checks',
    '',
  ];

  summary.checks.forEach((check) => {
    lines.push('- [' + (check.passed ? 'x' : ' ') + '] ' + check.name + ': ' + check.details);
  });

  if (summary.failures.length > 0) {
    lines.push('', '## Failures', '');
    summary.failures.forEach((failure) => {
      lines.push('- ' + failure.name + ': ' + failure.details);
    });
  }

  if (summary.warnings.length > 0) {
    lines.push('', '## Warnings', '');
    summary.warnings.forEach((warning) => {
      lines.push('- ' + warning.name + ': ' + warning.details);
    });
  }

  return lines.join('\n') + '\n';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appUrl = (args['app-url'] || process.env.APP_URL || process.env.CLIENT_URL || '').replace(/\/+$/, '');
  const authToken = args['auth-token'] || process.env.AUTH_TOKEN || '';
  const providedTenantId = args['tenant-id'] || process.env.TENANT_ID || '';
  const dryRun = Boolean(args['dry-run']);
  const writeJson = args['write-json'] ? path.resolve(process.cwd(), args['write-json']) : null;
  const writeMarkdown = args['write-markdown'] ? path.resolve(process.cwd(), args['write-markdown']) : null;

  if (!appUrl) {
    console.error('Missing --app-url or APP_URL/CLIENT_URL.');
    process.exit(1);
  }

  if (!authToken && !dryRun) {
    console.error('Missing --auth-token or AUTH_TOKEN.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('Onboarding readiness dry-run ready for ' + appUrl);
    return;
  }

  const authHeaders = {
    Authorization: 'Bearer ' + authToken,
  };

  const health = await fetchJson(appUrl + '/api/health');
  const me = await fetchJson(appUrl + '/api/v1/auth/me', { headers: authHeaders });
  const settings = await fetchJson(appUrl + '/api/v1/settings', { headers: authHeaders });
  const overview = await fetchJson(appUrl + '/api/v1/dashboard/overview', { headers: authHeaders });
  const backupStats = await fetchJson(appUrl + '/api/v1/backup/stats', { headers: authHeaders });

  const tenantId =
    providedTenantId ||
    settings.body?.data?.tenant?._id ||
    me.body?.data?.tenant?._id ||
    me.body?.data?.user?.tenant ||
    '';

  const storefrontSettings = tenantId
    ? await fetchJson(appUrl + '/api/v1/storefront/settings?tenant=' + encodeURIComponent(tenantId))
    : { response: { status: 0 }, body: null };
  const publicCatalog = tenantId
    ? await fetchJson(appUrl + '/api/v1/products?tenant=' + encodeURIComponent(tenantId) + '&page=1&limit=1')
    : { response: { status: 0 }, body: null };

  const checks = [
    buildCheck('public health endpoint', health.response.status === 200, 'status=' + health.response.status),
    buildCheck('authenticated auth/me', me.response.status === 200, 'status=' + me.response.status),
    buildCheck('authenticated settings', settings.response.status === 200, 'status=' + settings.response.status),
    buildCheck('dashboard overview', overview.response.status === 200, 'status=' + overview.response.status),
    buildCheck('backup stats access', backupStats.response.status === 200, 'status=' + backupStats.response.status),
    buildCheck('tenant id resolved', Boolean(tenantId), tenantId ? 'tenantId=' + tenantId : 'tenant id missing in auth/settings payloads'),
    buildCheck('storefront settings resolve', storefrontSettings.response.status === 200, 'status=' + storefrontSettings.response.status),
    buildCheck('public catalog resolves', publicCatalog.response.status === 200, 'status=' + publicCatalog.response.status),
    buildCheck(
      'tenant slug available',
      Boolean(settings.body?.data?.tenant?.slug || storefrontSettings.body?.data?.slug),
      'slug=' + (settings.body?.data?.tenant?.slug || storefrontSettings.body?.data?.slug || 'missing'),
      'warning'
    ),
    buildCheck(
      'backup auto-settings visible',
      typeof backupStats.body?.data?.autoBackup?.enabled === 'boolean' || typeof backupStats.body?.data?.autoSettings?.enabled === 'boolean',
      'auto backup visibility checked',
      'warning'
    ),
  ];

  const failures = checks.filter((check) => !check.passed && check.severity !== 'warning');
  const warnings = checks.filter((check) => !check.passed && check.severity === 'warning');

  const summary = {
    collectedAt: new Date().toISOString(),
    appUrl,
    tenantId,
    passed: failures.length === 0,
    checks,
    failures,
    warnings,
    snapshot: {
      health: health.body,
      me: me.body,
      settings: settings.body,
      overview: overview.body,
      backupStats: backupStats.body,
      storefrontSettings: storefrontSettings.body,
      publicCatalog: publicCatalog.body,
    },
  };

  if (writeJson) {
    ensureParentDir(writeJson);
    fs.writeFileSync(writeJson, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  }

  if (writeMarkdown) {
    ensureParentDir(writeMarkdown);
    fs.writeFileSync(writeMarkdown, renderMarkdown(summary), 'utf8');
  }

  console.log('Tenant onboarding readiness for ' + appUrl);
  checks.forEach((check) => {
    const label = check.passed ? 'OK' : (check.severity === 'warning' ? 'WARN' : 'FAIL');
    console.log(label + ' ' + check.name + ': ' + check.details);
  });

  if (failures.length > 0) {
    console.error('Onboarding readiness failed with ' + failures.length + ' blocking issue(s).');
    process.exit(1);
  }

  console.log('Onboarding readiness passed.');
}

main().catch((error) => {
  console.error('Onboarding readiness failed: ' + error.message);
  process.exit(1);
});
