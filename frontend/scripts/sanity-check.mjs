import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const frontendRoot = path.join(repoRoot, 'frontend');
const frontendSrc = path.join(frontendRoot, 'src');
const frontendIndex = path.join(frontendRoot, 'index.html');

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'logs',
  'uploads',
  'backend',
  'client',
]);

const forbiddenPathPatterns = [
  /frontend[\\/].*vite\.config\.js\.timestamp-.*\.mjs$/i,
  /frontend[\\/]src[\\/]pages[\\/].*\.part\d+$/i,
  /frontend[\\/]temp_.*\.(js|jsx|ts|tsx)$/i,
  /(^|[\\/])restored_.*\.(js|jsx|ts|tsx)$/i,
  /(^|[\\/])fix_.*\.ps1$/i,
];

const mojibakePattern = /[\u00D8\u00D9\u00C3\u00E2]/;
const ignoredMojibakeFiles = new Set([
  path.join(frontendSrc, 'App.jsx'),
]);

function walk(dir, collector) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(fullPath, collector);
      }
      continue;
    }
    collector(fullPath);
  }
}

const forbiddenFiles = [];
walk(repoRoot, (fullPath) => {
  const relative = path.relative(repoRoot, fullPath);
  if (forbiddenPathPatterns.some((pattern) => pattern.test(relative))) {
    forbiddenFiles.push(relative);
  }
});

const mojibakeFiles = [];
walk(frontendSrc, (fullPath) => {
  if (!/\.(js|jsx|ts|tsx)$/.test(fullPath)) return;
  if (ignoredMojibakeFiles.has(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  if (mojibakePattern.test(content)) {
    mojibakeFiles.push(path.relative(repoRoot, fullPath));
  }
});

const indexContent = fs.readFileSync(frontendIndex, 'utf8');
if (mojibakePattern.test(indexContent)) {
  mojibakeFiles.push(path.relative(repoRoot, frontendIndex));
}

const problems = [];
if (forbiddenFiles.length) {
  problems.push('Forbidden temporary files detected:');
  for (const file of forbiddenFiles) {
    problems.push(`- ${file}`);
  }
}

if (mojibakeFiles.length) {
  problems.push('Broken-encoding markers detected in frontend sources:');
  for (const file of mojibakeFiles) {
    problems.push(`- ${file}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('Frontend sanity checks passed.');
