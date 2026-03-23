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

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
}

function printResult(icon, label, message) {
  console.log(`${icon} ${label}: ${message}`);
}

function normalizeUploadStorage(env) {
  const explicitMode = String(env.UPLOAD_STORAGE || '').trim().toLowerCase();

  if (['gcs', 'google'].includes(explicitMode)) return 'gcs';
  if (['mongodb', 'mongo', 'db'].includes(explicitMode)) return 'mongodb';
  if (['local', 'filesystem', 'fs'].includes(explicitMode)) return 'local';
  if (env.GCS_BUCKET_NAME) return 'gcs';
  return 'unknown';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const envFileArg = args['env-file'];
  const envFile = envFileArg
    ? path.resolve(process.cwd(), envFileArg)
    : path.resolve(process.cwd(), '..', 'cloudrun.env');
  const dryRun = Boolean(args['dry-run']);
  const strictIntegrations = Boolean(args['strict-integrations']);

  if (!fs.existsSync(envFile)) {
    console.error(`Preflight failed: env file not found at ${envFile}`);
    process.exit(1);
  }

  const fileEnv = parseEnvFile(envFile);
  const env = { ...fileEnv, ...process.env };

  const required = [
    'JWT_SECRET',
    'CLIENT_URL',
    'APP_URL',
    'PLATFORM_ROOT_DOMAIN',
  ];
  const recommended = [
    'PAYMOB_API_KEY',
    'PAYMOB_HMAC_SECRET',
    'BOSTA_API_KEY',
    'BOSTA_WEBHOOK_SECRET',
  ];

  const hasMongoConnection = Boolean(env.MONGODB_URI || env.MONGO_URI);
  const missingRequired = required.filter((key) => !env[key]);
  const missingRecommended = recommended.filter((key) => !env[key]);
  const uploadStorageMode = normalizeUploadStorage(env);

  console.log('Release preflight');
  console.log(`Env file: ${envFile}`);
  console.log('');

  if (!hasMongoConnection) {
    printResult('X', 'MONGODB_URI', 'missing required value (legacy fallback: MONGO_URI)');
  } else {
    printResult('OK', 'Mongo connection', env.MONGODB_URI ? 'MONGODB_URI present' : 'legacy MONGO_URI present');
  }

  if (missingRequired.length) {
    missingRequired.forEach((key) => printResult('X', key, 'missing required value'));
  } else {
    required.forEach((key) => printResult('OK', key, 'present'));
  }

  if (!env.APP_URL || !isHttpUrl(env.APP_URL)) {
    printResult('X', 'APP_URL', 'must be a valid http/https URL');
  } else {
    printResult('OK', 'APP_URL format', env.APP_URL);
  }

  if (!env.CLIENT_URL || !isHttpUrl(env.CLIENT_URL)) {
    printResult('X', 'CLIENT_URL', 'must be a valid http/https URL');
  } else {
    printResult('OK', 'CLIENT_URL format', env.CLIENT_URL);
  }

  if (env.PLATFORM_ROOT_DOMAIN && env.PLATFORM_ROOT_DOMAIN.includes(' ')) {
    printResult('X', 'PLATFORM_ROOT_DOMAIN', 'must not contain spaces');
  } else if (env.PLATFORM_ROOT_DOMAIN) {
    printResult('OK', 'PLATFORM_ROOT_DOMAIN format', env.PLATFORM_ROOT_DOMAIN);
  }

  if (missingRecommended.length) {
    missingRecommended.forEach((key) => {
      const severity = strictIntegrations ? 'X' : 'WARN';
      printResult(severity, key, 'missing integration value');
    });
  } else {
    recommended.forEach((key) => printResult('OK', key, 'present'));
  }

  if (uploadStorageMode === 'gcs') {
    if (!env.GCS_BUCKET_NAME) {
      printResult('X', 'UPLOAD_STORAGE', 'gcs mode requires GCS_BUCKET_NAME');
    } else {
      printResult('OK', 'UPLOAD_STORAGE', `durable mode selected (${uploadStorageMode})`);
      printResult('OK', 'GCS_BUCKET_NAME', env.GCS_BUCKET_NAME);
    }
  } else if (uploadStorageMode === 'mongodb') {
    printResult('OK', 'UPLOAD_STORAGE', 'durable fallback selected (mongodb)');
  } else if (uploadStorageMode === 'local') {
    printResult('X', 'UPLOAD_STORAGE', 'local storage is not allowed for production rollout');
  } else {
    printResult(
      'X',
      'UPLOAD_STORAGE',
      'production rollout requires an explicit durable mode: set UPLOAD_STORAGE=gcs or UPLOAD_STORAGE=mongodb'
    );
  }

  const hasErrors =
    !hasMongoConnection ||
    missingRequired.length > 0 ||
    !env.APP_URL ||
    !isHttpUrl(env.APP_URL) ||
    !env.CLIENT_URL ||
    !isHttpUrl(env.CLIENT_URL) ||
    (strictIntegrations && missingRecommended.length > 0) ||
    (env.PLATFORM_ROOT_DOMAIN && env.PLATFORM_ROOT_DOMAIN.includes(' ')) ||
    uploadStorageMode === 'local' ||
    uploadStorageMode === 'unknown' ||
    (uploadStorageMode === 'gcs' && !env.GCS_BUCKET_NAME);

  console.log('');
  if (dryRun) {
    printResult('INFO', 'dry-run', 'preflight completed without deployment side effects');
  }

  if (hasErrors) {
    console.error('Preflight failed. Fix the items above before rollout.');
    process.exit(1);
  }

  console.log('Preflight passed.');
}

main();
