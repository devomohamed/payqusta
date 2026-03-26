const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcRoot = path.join(root, 'frontend', 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (['.jsx', '.tsx'].includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = walk(srcRoot);
let changed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const original = src;

  // Remove invalid hook usage inside lowercase helper functions.
  src = src.replace(
    /(function\s+[a-z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{\r?\n)(\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\('admin'\);\r?\n)/g,
    '$1'
  );

  // Remove invalid hook usage inside lowercase arrow helper functions.
  src = src.replace(
    /(const\s+[a-z][A-Za-z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{\r?\n)(\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\('admin'\);\r?\n)/g,
    '$1'
  );

  // Ensure hook exists inside exported component when file uses t().
  if (src.includes("t('") && src.includes("useTranslation") && !src.includes("export default function") ? false : true) {
    // no-op fallback; kept intentionally simple to avoid risky edits
  }

  // If there is an exported component but no hook inside it, insert once.
  if (src.includes("t('") && src.includes("export default function") && !src.includes("const { t } = useTranslation('admin');")) {
    src = src.replace(
      /(export default function\s+[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{\r?\n)/,
      "$1  const { t } = useTranslation('admin');\n"
    );
  }

  // Ensure import exists when t() is used.
  if (src.includes("t('") && !src.includes("from 'react-i18next'")) {
    const importBlockMatch = src.match(/((?:import[^\n]*\n)+)/);
    if (importBlockMatch) {
      src = src.replace(importBlockMatch[1], `${importBlockMatch[1]}import { useTranslation } from 'react-i18next';\n`);
    }
  }

  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    changed += 1;
  }
}

console.log(`fixed_files=${changed}`);
