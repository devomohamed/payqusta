/**
 * Auto-localization script v2 - processes all JSX files 
 * Replaces hardcoded Arabic strings with t() calls
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

function arabicToSlug(text) {
  const DICT = {
    'حفظ': 'save', 'إلغاء': 'cancel', 'حذف': 'delete', 'إضافة': 'add',
    'تعديل': 'edit', 'تحديث': 'update', 'بحث': 'search', 'تأكيد': 'confirm',
    'خطأ': 'error', 'نجاح': 'success', 'تحميل': 'loading', 'طباعة': 'print',
    'تصدير': 'export', 'فلتر': 'filter', 'تصفية': 'filter',
    'إغلاق': 'close', 'إرسال': 'send', 'رفض': 'reject', 'قبول': 'approve',
    'إنشاء': 'create', 'اسم': 'name', 'رقم': 'number', 'تاريخ': 'date',
    'ملاحظات': 'notes', 'عرض': 'view',
  };
  if (DICT[text.trim()]) return DICT[text.trim()];
  // Hash fallback
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return 'k' + Math.abs(h).toString(36).substring(0, 6);
}

function processFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const ns = nsFromPath(filePath);
  
  // Count Arabic lines (not already translated)
  const isArabicLine = l => /[\u0600-\u06FF]/.test(l) && !l.includes('t(') && !l.includes('i18n.t(') && !l.includes('//');
  const before = src.split('\n').filter(isArabicLine).length;
  if (before === 0) return null;
  
  const keys = {}; // group → { arText → key }
  const keyIndex = {}; // group → set of used keys
  
  function addKey(group, text) {
    if (!keys[group]) { keys[group] = {}; keyIndex[group] = new Set(); }
    if (keys[group][text]) return keys[group][text];
    let slug = arabicToSlug(text);
    while (keyIndex[group].has(slug)) slug += '_2';
    keyIndex[group].add(slug);
    keys[group][text] = slug;
    return slug;
  }
  
  let out = src;
  
  // 1. toast.error/success/warning/info('Arabic') 
  out = out.replace(/(toast\.(error|success|warning|info))\('([\u0600-\u06FF][^']*?)'\)/g, (m, func, type, text) => {
    const k = addKey('toasts', text);
    return `${func}(t('${ns}.toasts.${k}'))`;
  });
  
  // 2. notify.error/success/warning/info('Arabic')
  out = out.replace(/(notify\.(error|success|warning|info))\('([\u0600-\u06FF][^']*?)'\)/g, (m, func, type, text) => {
    const k = addKey('toasts', text);
    return `${func}(t('${ns}.toasts.${k}'))`;
  });
  
  // 3. getUserFriendlyErrorMessage(err, 'Arabic')
  out = out.replace(/getUserFriendlyErrorMessage\(([^,)]+),\s*'([\u0600-\u06FF][^']*?)'\)/g, (m, errVar, text) => {
    const k = addKey('toasts', text);
    return `getUserFriendlyErrorMessage(${errVar}, t('${ns}.toasts.${k}'))`;
  });
  
  // 4. label="Arabic"
  out = out.replace(/(\blabel=)"([\u0600-\u06FF][^"]{0,80}?)"/g, (m, attr, text) => {
    const k = addKey('form', text);
    return `${attr}{t('${ns}.form.${k}')}`;
  });
  
  // 5. placeholder="Arabic"
  out = out.replace(/(\bplaceholder=)"([\u0600-\u06FF][^"]{0,80}?)"/g, (m, attr, text) => {
    const k = addKey('placeholders', text);
    return `${attr}{t('${ns}.placeholders.${k}')}`;
  });
  
  // 6. title prop (attribute) ="Arabic"
  out = out.replace(/(\btitle=)"([\u0600-\u06FF][^"]{0,80}?)"/g, (m, attr, text) => {
    const k = addKey('titles', text);
    return `${attr}{t('${ns}.titles.${k}')}`;
  });
  
  // 7. JSX text children: >Arabic text< (between tags, no JSX expressions)
  // This is the tricky one - only match simple text between tags  
  out = out.replace(/(>)([\u0600-\u06FF][^<>{}\n]{0,100})(<)/g, (m, open, text, close) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return m;
    // Skip if text contains template literal markers
    if (trimmed.includes('${') || trimmed.includes('`')) return m;
    const k = addKey('ui', trimmed);
    // Preserve leading/trailing space
    const leadSpace = text.startsWith(' ') ? ' ' : '';
    const trailSpace = text.endsWith(' ') ? ' ' : '';
    return `${open}${leadSpace}{t('${ns}.ui.${k}')}${trailSpace}${close}`;
  });
  
  // 8. JSX text children with leading space: ` Arabic` at line start after whitespace
  // Catches text nodes not bounded by > < but just pure string children
  out = out.replace(/^(\s+)([\u0600-\u06FF][^<>{}\n`'"{]{1,100})$/gm, (m, indent, text) => {
    const trimmed = text.trimEnd();
    if (!trimmed || trimmed.length < 2) return m;
    const k = addKey('ui', trimmed);
    return `${indent}{t('${ns}.ui.${k}')}`;
  });
  
  const changed = Object.values(keys).some(g => Object.keys(g).length > 0);
  if (!changed) return null;
  
  // Inject useTranslation
  if (!out.includes("useTranslation(")) {
    if (!out.includes("from 'react-i18next'")) {
      // Add import after last import statement
      out = out.replace(/((?:import [^;]+;\n)+)/, `$1import { useTranslation } from 'react-i18next';\n`);
    }
    // Add hook in component body
    const hookLine = `  const { t } = useTranslation('admin');`;
    // After export default function / function / const component = 
    out = out.replace(
      /(export default function \w+[^{]*\{|function \w+[^{]*\{|const \w+ = [^=]+=>\s*\{)(\r?\n)/,
      `$1$2${hookLine}\n`
    );
  }
  
  const after = out.split('\n').filter(isArabicLine).length;
  const totalKeys = Object.values(keys).reduce((s, g) => s + Object.keys(g).length, 0);
  
  return { filePath, ns, original: src, modified: out, keys, before, after, totalKeys };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const files = walkJsx(SRC);
const results = [];
for (const f of files) {
  try {
    const r = processFile(f);
    if (r && r.totalKeys > 0) results.push(r);
  } catch (err) {
    // silently skip
  }
}

const enAdmin = JSON.parse(fs.readFileSync(EN_ADMIN, 'utf8'));
const arAdmin = JSON.parse(fs.readFileSync(AR_ADMIN, 'utf8'));

console.log(`\n=== Auto-Localization Summary ===`);
console.log(`Files with changes: ${results.length}`);
console.log(`Total keys generated: ${results.reduce((s, r) => s + r.totalKeys, 0)}`);
console.log('');

for (const r of results.slice(0, 30)) {
  const rel = path.relative(ROOT, r.filePath).replace(/\\/g, '/');
  console.log(`  ${rel}: ${r.before} → ${r.after} Arabic lines (${r.totalKeys} keys)`);
}

if (!DRY_RUN) {
  let filesWritten = 0;
  for (const r of results) {
    fs.writeFileSync(r.filePath, r.modified, 'utf8');
    filesWritten++;
  }
  
  // Update locale files
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
