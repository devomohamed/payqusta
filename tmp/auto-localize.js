/**
 * Auto-localization script for payqusta frontend
 * Extracts hardcoded Arabic strings from JSX files and replaces them with t() calls
 * Also generates locale key additions for en/admin.json and ar/admin.json
 * 
 * Usage: node tmp/auto-localize.js [--dry-run] [--file=path/to/file.jsx]
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC  = path.join(ROOT, 'frontend', 'src');
const EN_ADMIN = path.join(ROOT, 'frontend', 'public', 'locales', 'en', 'admin.json');
const AR_ADMIN = path.join(ROOT, 'frontend', 'public', 'locales', 'ar', 'admin.json');

const DRY_RUN  = process.argv.includes('--dry-run');
const FILE_ARG = process.argv.find(a => a.startsWith('--file='))?.replace('--file=', '');

// ─── Key-name generation ─────────────────────────────────────────────────────
// Arabic word → English slug mapping (common UI words)
const AR_EN = {
  'حفظ': 'save', 'إلغاء': 'cancel', 'حذف': 'delete', 'إضافة': 'add', 'إضافه': 'add',
  'تعديل': 'edit', 'تحديث': 'update', 'بحث': 'search', 'تأكيد': 'confirm',
  'خطأ': 'error', 'نجاح': 'success', 'تحميل': 'loading', 'طباعة': 'print',
  'تصدير': 'export', 'استيراد': 'import', 'فلتر': 'filter', 'تصفية': 'filter',
  'عرض': 'view', 'إغلاق': 'close', 'ارسال': 'send', 'إرسال': 'send',
  'رفض': 'reject', 'قبول': 'approve', 'موافقة': 'approve', 'إنشاء': 'create',
  'اسم': 'name', 'رقم': 'number', 'تاريخ': 'date', 'ملاحظات': 'notes',
  'المتجر': 'store', 'العملاء': 'customers', 'المنتجات': 'products',
  'الفواتير': 'invoices', 'الطلبات': 'orders', 'المخزون': 'inventory',
  'المورد': 'supplier', 'الفرع': 'branch', 'الموظفين': 'staff',
  'التقارير': 'reports', 'الإعدادات': 'settings', 'إعدادات': 'settings',
};

function arabicToSlug(text) {
  let slug = text.trim();
  // Try word-by-word translation
  for (const [ar, en] of Object.entries(AR_EN)) {
    if (slug === ar) return en;
  }
  // Fallback: hash
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) & 0xffffffff;
  }
  return 'k' + Math.abs(hash).toString(36).substring(0, 6);
}

// ─── File discovery ───────────────────────────────────────────────────────────
function walkJsx(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJsx(p, out);
    else if (['.jsx', '.tsx'].includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

// ─── Namespace from file path ─────────────────────────────────────────────────
function nsFromPath(filePath) {
  const rel = path.relative(SRC, filePath).replace(/\\/g, '/');
  const base = path.basename(rel, path.extname(rel));
  // Convert PascalCase to snake_case
  return base.replace(/([A-Z])/g, m => '_' + m.toLowerCase()).replace(/^_/, '').toLowerCase();
}

// ─── Extraction patterns ──────────────────────────────────────────────────────
// Matches Arabic text in common JSX patterns
const PATTERNS = [
  // toast.error/success/warning/info('Arabic')
  {
    re: /(toast\.(error|success|warning|info))\('([\u0600-\u06FF][^']*?)'\)/g,
    replace: (m, func, type, text, ns, keyMap) => {
      const key = getKey(ns, 'toasts', text, keyMap);
      return `${func}(t('${ns}.toasts.${key}'))`;
    },
  },
  // notify.error/success/warning/info('Arabic')
  {
    re: /(notify\.(error|success|warning|info))\('([\u0600-\u06FF][^']*?)'\)/g,
    replace: (m, func, type, text, ns, keyMap) => {
      const key = getKey(ns, 'toasts', text, keyMap);
      return `${func}(t('${ns}.toasts.${key}'))`;
    },
  },
  // getUserFriendlyErrorMessage(err, 'Arabic')
  {
    re: /getUserFriendlyErrorMessage\(([^,]+),\s*'([\u0600-\u06FF][^']*?)'\)/g,
    replace: (m, errVar, text, ns, keyMap) => {
      const key = getKey(ns, 'toasts', text, keyMap);
      return `getUserFriendlyErrorMessage(${errVar}, t('${ns}.toasts.${key}'))`;
    },
  },
  // label="Arabic" → label={t(...)}
  {
    re: /(\blabel=)"([\u0600-\u06FF][^"]*?)"/g,
    replace: (m, attr, text, ns, keyMap) => {
      const key = getKey(ns, 'form', text, keyMap);
      return `${attr}{t('${ns}.form.${key}')}`;
    },
  },
  // placeholder="Arabic" → placeholder={t(...)}
  {
    re: /(\bplaceholder=)"([\u0600-\u06FF][^"]*?)"/g,
    replace: (m, attr, text, ns, keyMap) => {
      const key = getKey(ns, 'form', text + '_placeholder', keyMap);
      return `${attr}{t('${ns}.form.${key}')}`;
    },
  },
  // title="Arabic" → title={t(...)}
  {
    re: /(\btitle=)"([\u0600-\u06FF][^"]*?)"/g,
    replace: (m, attr, text, ns, keyMap) => {
      const key = getKey(ns, 'titles', text, keyMap);
      return `${attr}{t('${ns}.titles.${key}')}`;
    },
  },
  // >Arabic text< (JSX text children, not inside {})
  // Only matches simple text nodes between tags
  {
    re: />([\u0600-\u06FF][^<{}\n]{0,120}?)</g,
    replace: (m, text, ns, keyMap) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 2) return m;
      const key = getKey(ns, 'ui', trimmed, keyMap);
      return `>{t('${ns}.ui.${key}')}<`;
    },
  },
];

// ─── Key tracking ─────────────────────────────────────────────────────────────
function getKey(ns, group, text, keyMap) {
  const fullKey = `${ns}.${group}.${text}`;
  if (keyMap.has(fullKey)) return keyMap.get(fullKey).key;
  const slug = arabicToSlug(text);
  // Ensure unique within group
  const groupKeys = [...keyMap.values()].filter(v => v.group === `${ns}.${group}`).map(v => v.key);
  let finalSlug = slug;
  let count = 2;
  while (groupKeys.includes(finalSlug)) {
    finalSlug = `${slug}_${count++}`;
  }
  keyMap.set(fullKey, { key: finalSlug, group: `${ns}.${group}`, text });
  return finalSlug;
}

// ─── Check if file already has useTranslation ────────────────────────────────
function hasTranslationHook(src) {
  return src.includes("useTranslation(") || src.includes("from 'react-i18next'");
}

// ─── Inject useTranslation ────────────────────────────────────────────────────
function injectTranslationHook(src, ns) {
  // Add import if not present
  let out = src;
  if (!src.includes("from 'react-i18next'")) {
    // Find a good place for the import (after first import block)
    out = out.replace(
      /(import .+;\n)(\n?import .+;)/,
      `$1$2\nimport { useTranslation } from 'react-i18next';`
    );
    if (!out.includes("from 'react-i18next'")) {
      // Fallback: add at top after first import
      out = out.replace(/^(import .+;)/m, `$1\nimport { useTranslation } from 'react-i18next';`);
    }
  }
  return out;
}

function injectHookInComponent(src, ns) {
  // Try to inject after a common first line in functional components
  const hookLine = `  const { t } = useTranslation('admin');`;
  if (src.includes(hookLine) || src.includes(`useTranslation('admin')`)) return src;
  
  // Find component function start
  const patterns = [
    /(\bexport default function \w+\([^)]*\)\s*\{)\n/,
    /(\bfunction \w+\([^)]*\)\s*\{)\n/,
    /(\bconst \w+ = \([^)]*\) =>\s*\{)\n/,
  ];
  
  for (const p of patterns) {
    if (p.test(src)) {
      return src.replace(p, `$1\n${hookLine}\n`);
    }
  }
  return src;
}

// ─── Process a single file ────────────────────────────────────────────────────
function processFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  const ns = nsFromPath(filePath);
  const keyMap = new Map(); // fullKey → { key, group, text }
  
  // Count Arabic lines before
  const arabicLinesBefore = src.split('\n').filter(l => /[\u0600-\u06FF]/.test(l) && !l.includes('t(') && !l.includes('i18n.t(')).length;
  if (arabicLinesBefore === 0) return null; // Nothing to do
  
  let modified = src;
  
  // Apply patterns
  for (const pattern of PATTERNS) {
    modified = modified.replace(pattern.re, (...args) => {
      return pattern.replace(...args, ns, keyMap);
    });
  }
  
  if (keyMap.size === 0) return null; // No changes made
  
  // Inject useTranslation if needed
  if (!hasTranslationHook(modified)) {
    modified = injectTranslationHook(modified, ns);
    modified = injectHookInComponent(modified, ns);
  } else if (!modified.includes(`const { t }`) && !modified.includes(`const {t}`)) {
    modified = injectHookInComponent(modified, ns);
  }
  
  // Count Arabic lines after
  const arabicLinesAfter = modified.split('\n').filter(l => /[\u0600-\u06FF]/.test(l) && !l.includes('t(') && !l.includes('i18n.t(')).length;
  
  return {
    filePath,
    ns,
    original: src,
    modified,
    keyMap,
    arabicLinesBefore,
    arabicLinesAfter,
    changed: arabicLinesBefore !== arabicLinesAfter,
  };
}

// ─── Build locale additions ───────────────────────────────────────────────────
function buildLocaleAdditions(results) {
  const additions = {}; // ns → { group → { key → arText } }
  
  for (const r of results) {
    if (!r || !r.changed) continue;
    if (!additions[r.ns]) additions[r.ns] = {};
    
    for (const [, v] of r.keyMap) {
      const groupKey = v.group.split('.').slice(1).join('.'); // remove ns prefix
      if (!additions[r.ns][groupKey]) additions[r.ns][groupKey] = {};
      additions[r.ns][groupKey][v.key] = v.text;
    }
  }
  return additions;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const files = FILE_ARG 
  ? [path.resolve(ROOT, FILE_ARG)]
  : walkJsx(SRC);

const results = [];
for (const f of files) {
  try {
    const r = processFile(f);
    if (r) results.push(r);
  } catch (err) {
    console.error(`Error processing ${f}: ${err.message}`);
  }
}

const localeAdditions = buildLocaleAdditions(results);

// Read existing locale files
const enAdmin = JSON.parse(fs.readFileSync(EN_ADMIN, 'utf8'));
const arAdmin = JSON.parse(fs.readFileSync(AR_ADMIN, 'utf8'));

// Summary
const changed = results.filter(r => r.changed);
console.log(`\n=== Auto-Localization Summary ===`);
console.log(`Files processed: ${results.length}`);
console.log(`Files with changes: ${changed.length}`);
console.log(`Total keys generated: ${changed.reduce((s, r) => s + r.keyMap.size, 0)}`);
console.log('');

// Show per-file results
for (const r of changed.slice(0, 20)) {
  const rel = path.relative(ROOT, r.filePath).replace(/\\/g, '/');
  console.log(`  ${rel}: ${r.arabicLinesBefore} → ${r.arabicLinesAfter} Arabic lines (${r.keyMap.size} keys generated)`);
}

if (!DRY_RUN) {
  // Write modified files
  let filesWritten = 0;
  for (const r of changed) {
    fs.writeFileSync(r.filePath, r.modified, 'utf8');
    filesWritten++;
  }
  console.log(`\nWrote ${filesWritten} modified files`);
  
  // Add keys to locale files
  let enKeysAdded = 0, arKeysAdded = 0;
  for (const [ns, groups] of Object.entries(localeAdditions)) {
    if (!enAdmin[ns]) enAdmin[ns] = {};
    if (!arAdmin[ns]) arAdmin[ns] = {};
    
    for (const [group, keys] of Object.entries(groups)) {
      // Navigate/create nested path
      const groupParts = group.split('.');
      
      let enTarget = enAdmin[ns];
      let arTarget = arAdmin[ns];
      
      for (const part of groupParts) {
        if (!enTarget[part]) { enTarget[part] = {}; enKeysAdded++; }
        if (!arTarget[part]) { arTarget[part] = {}; arKeysAdded++; }
        enTarget = enTarget[part];
        arTarget = arTarget[part];
      }
      
      for (const [key, arText] of Object.entries(keys)) {
        if (!enTarget[key]) {
          enTarget[key] = arText; // Use Arabic as English placeholder (TODO: translate)
          enKeysAdded++;
        }
        if (!arTarget[key]) {
          arTarget[key] = arText;
          arKeysAdded++;
        }
      }
    }
  }
  
  // Sort keys alphabetically
  const sortObj = obj => {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
    const sorted = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = sortObj(obj[k]);
    return sorted;
  };
  
  fs.writeFileSync(EN_ADMIN, JSON.stringify(enAdmin, null, 4) + '\n', 'utf8');
  fs.writeFileSync(AR_ADMIN, JSON.stringify(arAdmin, null, 4) + '\n', 'utf8');
  
  console.log(`Added ~${enKeysAdded} keys to en/admin.json`);
  console.log(`Added ~${arKeysAdded} keys to ar/admin.json`);
}

// Output locale additions preview
const addNs = Object.keys(localeAdditions);
if (addNs.length > 0) {
  console.log(`\nNamespaces with additions: ${addNs.join(', ')}`);
}
