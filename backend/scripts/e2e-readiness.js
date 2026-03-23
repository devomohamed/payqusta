const fs = require('fs');

const testMongoUri = String(process.env.TEST_MONGODB_URI || '').trim();
const testDbName = String(process.env.TEST_MONGODB_DB_NAME || 'payqusta_e2e').trim();
const ci = String(process.env.CI || '').trim() === 'true';
const stepSummaryPath = String(process.env.GITHUB_STEP_SUMMARY || '').trim();

const lines = [];

lines.push('DB-backed E2E readiness');
lines.push(`- TEST_MONGODB_URI: ${testMongoUri ? 'configured' : 'missing'}`);
lines.push(`- TEST_MONGODB_DB_NAME: ${testDbName}`);
lines.push(`- CI mode: ${ci ? 'true' : 'false'}`);

if (testMongoUri) {
  lines.push('- Status: ready');
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(0);
}

lines.push('- Status: skip-safe only');
lines.push('- Action: set TEST_MONGODB_URI to run DB-backed E2E instead of skipping it.');

const output = `${lines.join('\n')}\n`;

if (stepSummaryPath) {
  const summaryLines = [
    '### DB-backed E2E readiness',
    '',
    `- TEST_MONGODB_URI: ${testMongoUri ? 'configured' : 'missing'}`,
    `- TEST_MONGODB_DB_NAME: ${testDbName}`,
    `- CI mode: ${ci ? 'true' : 'false'}`,
    `- Status: ${testMongoUri ? 'ready' : 'skip-safe only'}`,
  ];

  if (!testMongoUri) {
    summaryLines.push('- Action: set `TEST_MONGODB_URI` to run DB-backed E2E instead of skipping it.');
  }

  fs.appendFileSync(stepSummaryPath, `${summaryLines.join('\n')}\n\n`);
}

process.stdout.write(output);
process.exit(0);
