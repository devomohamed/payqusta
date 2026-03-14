#!/usr/bin/env node

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

  return { response, body, text };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appUrl = (args['app-url'] || process.env.APP_URL || process.env.CLIENT_URL || '').replace(/\/+$/, '');
  const opsToken = args['ops-token'] || process.env.OPS_BEARER_TOKEN || '';
  const dryRun = Boolean(args['dry-run']);

  if (!appUrl) {
    console.error('Missing --app-url or APP_URL/CLIENT_URL.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`Smoke dry-run ready for ${appUrl}`);
    console.log(`Protected ops checks: ${opsToken ? 'enabled' : 'skipped (missing token)'}`);
    return;
  }

  console.log(`Post-deploy smoke for ${appUrl}`);

  const publicChecks = [
    ['/api/health', (result) => {
      assert(result.response.status === 200, 'public health must return 200');
      assert(typeof result.body?.ready === 'boolean', 'public health must expose ready boolean');
    }],
    ['/api/health/live', (result) => {
      assert(result.response.status === 200, 'liveness must return 200');
      assert(result.body?.status === 'ok', 'liveness payload must report ok');
    }],
    ['/api/health/ready', (result) => {
      assert(result.response.status === 200, 'readiness must return 200');
      assert(result.body?.ready === true, 'readiness payload must report ready=true');
    }],
  ];

  for (const [pathname, validator] of publicChecks) {
    const result = await fetchJson(`${appUrl}${pathname}`);
    validator(result);
    console.log(`OK ${pathname}`);
  }

  if (!opsToken) {
    console.log('WARN Skipping protected ops checks because OPS_BEARER_TOKEN is not set.');
    return;
  }

  const authHeaders = {
    Authorization: `Bearer ${opsToken}`,
  };

  const opsStatus = await fetchJson(`${appUrl}/api/v1/ops/status`, { headers: authHeaders });
  assert(opsStatus.response.status === 200, 'ops status must return 200');
  assert(typeof opsStatus.body?.startup?.total === 'number', 'ops status must include startup summary');
  assert(typeof opsStatus.body?.jobs?.total === 'number', 'ops status must include jobs summary');
  assert(
    typeof opsStatus.body?.config?.integrations?.paymobApiKeyConfigured === 'boolean',
    'ops status must expose paymob integration flag'
  );
  assert(
    typeof opsStatus.body?.config?.integrations?.bostaWebhookSecretConfigured === 'boolean',
    'ops status must expose bosta integration flag'
  );
  console.log('OK /api/v1/ops/status');

  const metricsResponse = await fetch(`${appUrl}/api/v1/ops/metrics`, { headers: authHeaders });
  const metricsText = await metricsResponse.text();
  assert(metricsResponse.status === 200, 'ops metrics must return 200');
  assert(metricsText.includes('payqusta_app_ready'), 'metrics must include payqusta_app_ready');
  assert(metricsText.includes('payqusta_jobs_total'), 'metrics must include payqusta_jobs_total');
  console.log('OK /api/v1/ops/metrics');

  console.log('Post-deploy smoke passed.');
}

main().catch((error) => {
  console.error(`Post-deploy smoke failed: ${error.message}`);
  process.exit(1);
});
