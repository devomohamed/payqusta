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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return body;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return text;
}

function ensureParentDir(filePath) {
  const targetDir = path.dirname(filePath);
  fs.mkdirSync(targetDir, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appUrl = (args['app-url'] || process.env.APP_URL || process.env.CLIENT_URL || '').replace(/\/+$/, '');
  const opsToken = args['ops-token'] || process.env.OPS_BEARER_TOKEN || '';
  const writeJson = args['write-json'] ? path.resolve(process.cwd(), args['write-json']) : null;
  const writeMetrics = args['write-metrics'] ? path.resolve(process.cwd(), args['write-metrics']) : null;

  if (!appUrl) {
    console.error('Missing --app-url or APP_URL/CLIENT_URL.');
    process.exit(1);
  }

  const publicHealth = await fetchJson(`${appUrl}/api/health`);
  const readiness = await fetchJson(`${appUrl}/api/health/ready`);

  const snapshot = {
    collectedAt: new Date().toISOString(),
    appUrl,
    publicHealth,
    readiness,
  };

  console.log(`Ops snapshot for ${appUrl}`);
  console.log(`Ready: ${publicHealth.ready === true ? 'yes' : 'no'}`);
  console.log(`Database state: ${publicHealth.database?.state || 'unknown'}`);
  console.log(`Jobs total: ${publicHealth.jobs?.total ?? 'n/a'}`);

  if (opsToken) {
    const headers = {
      Authorization: `Bearer ${opsToken}`,
    };

    const opsStatus = await fetchJson(`${appUrl}/api/v1/ops/status`, { headers });
    const metrics = await fetchText(`${appUrl}/api/v1/ops/metrics`, { headers });
    snapshot.opsStatus = opsStatus;
    snapshot.metricsPreview = metrics.split('\n').filter(Boolean).slice(0, 20);

    console.log(`Startup tasks: ${opsStatus.startup?.total ?? 'n/a'}`);
    console.log(`Failing jobs : ${opsStatus.jobs?.failing ?? 'n/a'}`);

    if (writeMetrics) {
      ensureParentDir(writeMetrics);
      fs.writeFileSync(writeMetrics, metrics, 'utf8');
      console.log(`Metrics written to ${writeMetrics}`);
    }
  } else {
    console.log('Protected ops endpoints skipped because OPS_BEARER_TOKEN is not set.');
  }

  if (writeJson) {
    ensureParentDir(writeJson);
    fs.writeFileSync(writeJson, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`Snapshot written to ${writeJson}`);
  }
}

main().catch((error) => {
  console.error(`Ops snapshot failed: ${error.message}`);
  process.exit(1);
});
