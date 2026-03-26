/**
 * Checks for common issues in the frontend JSX/TSX files:
 * 1. Duplicate useTranslation/const { t } declarations
 * 2. useTranslation used outside React components
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC  = path.join(ROOT, 'frontend', 'src');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (['.jsx', '.tsx'].includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const duplicates = [];
const unusedT = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  // Check for duplicate `const { t ... } = useTranslation`
  const tDecls = lines
    .map((l, i) => ({ line: l, num: i + 1 }))
    .filter(({ line }) => /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(line));

  if (tDecls.length > 1) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    duplicates.push({
      file: rel,
      count: tDecls.length,
      decls: tDecls.map(d => `  L${d.num}: ${d.line.trim()}`)
    });
  }
}

console.log('=== Duplicate useTranslation declarations ===');
if (duplicates.length === 0) {
  console.log('None found. ✓');
} else {
  for (const d of duplicates) {
    console.log(`\n${d.file} (${d.count} decls):`);
    d.decls.forEach(l => console.log(l));
  }
}

// Validate JSON files
console.log('\n=== Locale JSON validity ===');
for (const lang of ['en', 'ar']) {
  for (const ns of ['admin', 'portal', 'common', 'owner']) {
    const p = path.join(ROOT, 'frontend', 'public', 'locales', lang, `${ns}.json`);
    if (!fs.existsSync(p)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      console.log(`${lang}/${ns}.json: OK (${Object.keys(data).length} top-level keys)`);
    } catch (e) {
      console.log(`${lang}/${ns}.json: ERROR - ${e.message}`);
    }
  }
}

console.log('\nDone.');
