/**
 * Auto-localization v3 - handles remaining patterns missed by v2:
 * - `|| 'Arabic'` fallback in function calls
 * - `? 'Arabic' : 'Arabic2'` ternary strings
 * - `key: 'Arabic'` in JS object literals (inside components)
 * - `label: 'Arabic'` in option arrays
 * - Simple string-only lines (standalone 'Arabic' not yet covered)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC  = path.join(ROOT, 'frontend', 'src');
const EN_ADMIN = path.join(ROOT, 'frontend', 'public', 'locales', 'en', 'admin.json');
const AR_ADMIN = path.join(ROOT, 'frontend', 'public', 'locales', 'ar', 'admin.json');
const DRY_RUN  = process.argv.includes('--dry-run');

function walkJsx(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJsx(p, out);
    else if (['.jsx', '.tsx'].includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

function nsFromPath(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.replace(/([A-Z])/g, m => '_' + m.toLowerCase()).replace(/^_/, '').toLowerCase();
}

function toSlug(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return 'k' + Math.abs(h).toString(36).substring(0, 7);
}

function processFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const ns = nsFromPath(filePath);
  
  const isArabicUntranslated = l => /[\u0600-\u06FF]/.test(l) && !l.includes('t(') && !l.includes('i18n.t(');
  const before = src.split('\n').filter(isArabicUntranslated).length;
  if (before === 0) return null;
  
  const keys = {}; // group → { arText → key }
  function addKey(group, text) {
    if (!keys[group]) keys[group] = {};
    if (keys[group][text]) return keys[group][text];
    const slug = toSlug(text);
    keys[group][text] = slug;
    return slug;
  }
  
  let out = src;
  
  // 1. || 'Arabic' fallback pattern: expr || 'Arabic'
  //    (already inside function calls like toast.error(expr || 'Arabic'))
  out = out.replace(/\|\|\s*'([\u0600-\u06FF][^']{0,100}?)'/g, (m, text) => {
    const k = addKey('toasts', text);
    return `|| t('${ns}.toasts.${k}')`;
  });
  
  // 2. || "Arabic" (double-quoted)
  out = out.replace(/\|\|\s*"([\u0600-\u06FF][^"]{0,100})"/g, (m, text) => {
    const k = addKey('toasts', text);
    return `|| t('${ns}.toasts.${k}')`;
  });
  
  // 3. ? 'Arabic' : ... (ternary true branch) - careful not to break non-Arabic ternaries
  out = out.replace(/\?\s*'([\u0600-\u06FF][^']{0,100}?)'\s*:/g, (m, text) => {
    const k = addKey('ui', text);
    return `? t('${ns}.ui.${k}') :`;
  });
  
  // 4. : 'Arabic' (ternary false branch, at end or before comma/newline)
  //    Pattern: `: 'Arabic'` but only when preceded by ternary context
  //    Use simpler: match `: 'Arabic'` when at end of line or before comma/newline
  out = out.replace(/:\s*'([\u0600-\u06FF][^']{0,100}?)'([\s,;\n\)])/g, (m, text, after) => {
    // Don't match object property definitions like `label: 'Arabic'` on same line
    // That will be handled separately below
    const k = addKey('ui', text);
    return `: t('${ns}.ui.${k}')${after}`;
  });
  
  // 5. Object property label/title/name/text/message: 'Arabic'
  //    Handles: `label: 'Arabic'`, `title: 'Arabic'`, `text: 'Arabic'`, etc.
  out = out.replace(/\b(label|title|text|message|name|description|header|placeholder|hint|caption|suffix|prefix):\s*'([\u0600-\u06FF][^']{0,100}?)'/g, (m, prop, text) => {
    const group = prop === 'label' || prop === 'placeholder' ? 'form' : 'ui';
    const k = addKey(group, text);
    return `${prop}: t('${ns}.${group}.${k}')`;
  });
  
  // 6. Status/type dictionary: `key: 'Arabic'` in simple dictionaries
  //    Pattern: identifier followed by colon followed by quoted Arabic string
  //    e.g. `draft: 'مسودة'`
  out = out.replace(/\b(draft|pending|approved|partial|received|cancelled|active|inactive|paid|unpaid|completed|processing|shipped|delivered|returned|refunded|open|closed|new|used|damaged):\s*'([\u0600-\u06FF][^']{0,60}?)'/g, (m, status, text) => {
    const k = addKey('status', text);
    return `${status}: t('${ns}.status.${k}')`;
  });
  
  // 7. Standalone 'Arabic' strings in expressions (not yet handled)
  //    This is the broadest pattern - handle carefully
  //    Match 'Arabic' when NOT preceded by = (already handled by JSX attr patterns)
  //    and NOT inside template literals
  //    After method args, after commas, after opening parens
  out = out.replace(/(?<=[\(,\s])[']([\u0600-\u06FF][^']{0,100}?)['](?=[\),\s;])/g, (m, text) => {
    const k = addKey('ui', text);
    return `t('${ns}.ui.${k}')`;
  });
  
  const changed = Object.values(keys).some(g => Object.keys(g).length > 0);
  if (!changed) return null;
  
  const after = out.split('\n').filter(isArabicUntranslated).length;
  const totalKeys = Object.values(keys).reduce((s, g) => s + Object.keys(g).length, 0);
  if (totalKeys === 0) return null;
  
  return { filePath, ns, original: src, modified: out, keys, before, after, totalKeys };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const files = walkJsx(SRC);
const results = [];
for (const f of files) {
  try {
    const r = processFile(f);
    if (r && r.totalKeys > 0 && r.before > r.after) results.push(r);
  } catch (err) {
    // silently skip
  }
}

const enAdmin = JSON.parse(fs.readFileSync(EN_ADMIN, 'utf8'));
const arAdmin = JSON.parse(fs.readFileSync(AR_ADMIN, 'utf8'));

console.log(`\n=== Auto-Localization v3 Summary ===`);
console.log(`Files with additional changes: ${results.length}`);
console.log(`Additional keys: ${results.reduce((s, r) => s + r.totalKeys, 0)}`);
console.log('');

for (const r of results.slice(0, 30)) {
  const rel = path.relative(ROOT, r.filePath).replace(/\\/g, '/');
  console.log(`  ${rel}: ${r.before} → ${r.after} (${r.totalKeys} keys)`);
}

if (!DRY_RUN) {
  let filesWritten = 0;
  for (const r of results) {
    fs.writeFileSync(r.filePath, r.modified, 'utf8');
    filesWritten++;
  }
  
  for (const r of results) {
    if (!enAdmin[r.ns]) enAdmin[r.ns] = {};
    if (!arAdmin[r.ns]) arAdmin[r.ns] = {};
    
    for (const [group, groupKeys] of Object.entries(r.keys)) {
      if (!enAdmin[r.ns][group]) enAdmin[r.ns][group] = {};
      if (!arAdmin[r.ns][group]) arAdmin[r.ns][group] = {};
      for (const [arText, key] of Object.entries(groupKeys)) {
        if (!enAdmin[r.ns][group][key]) enAdmin[r.ns][group][key] = arText;
        if (!arAdmin[r.ns][group][key]) arAdmin[r.ns][group][key] = arText;
      }
    }
  }
  
  fs.writeFileSync(EN_ADMIN, JSON.stringify(enAdmin, null, 4) + '\n', 'utf8');
  fs.writeFileSync(AR_ADMIN, JSON.stringify(arAdmin, null, 4) + '\n', 'utf8');
  
  console.log(`\nWrote ${filesWritten} files + updated locale JSONs`);
}