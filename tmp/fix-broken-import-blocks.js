/**
 * Fix malformed import block pattern introduced by automation:
 *
 * import {
 * import { useTranslation } from 'react-i18next';
 *   ...
 * } from '...';
 *
 * to:
 * import { useTranslation } from 'react-i18next';
 * import {
 *   ...
 * } from '...';
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'frontend', 'src');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = walk(SRC);
let fixed = 0;

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  let out = raw;

  out = out.replace(
    /import\s*\{\s*\r?\n\s*import\s*\{\s*useTranslation\s*\}\s*from\s*'react-i18next';\s*\r?\n/g,
    "import { useTranslation } from 'react-i18next';\nimport {\n"
  );

  if (out !== raw) {
    fs.writeFileSync(f, out, 'utf8');
    fixed++;
    console.log(path.relative(ROOT, f).replace(/\\/g, '/'));
  }
}

console.log(`fixed_files=${fixed}`);
