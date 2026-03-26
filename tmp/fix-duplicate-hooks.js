/**
 * Fix duplicate useTranslation declarations in the same component.
 * When a function has both:
 *   const { t } = useTranslation(...)
 *   const { t, i18n } = useTranslation(...)
 * Remove the simpler one (just t) and keep the complete one (t + i18n).
 * Also handles cases where two identical simple declarations exist.
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

const HOOK_RE = /^(\s*)const\s*\{([^}]+)\}\s*=\s*useTranslation\([^)]*\)\s*;?\s*$/;

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Track which lines to remove
  const toRemove = new Set();

  // Strategy: within a function body, if we see:
  //   const { t } = useTranslation(...)   ← simpler
  //   ...
  //   const { t, i18n } = useTranslation(...)   ← more complete
  // Remove the simpler one.
  
  // Also remove exact duplicate lines
  
  // First pass: find all hook declarations
  const hookDecls = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HOOK_RE.exec(lines[i]);
    if (m) {
      const vars = m[2].split(',').map(v => v.trim()).filter(Boolean);
      hookDecls.push({ lineIdx: i, line: lines[i], vars, indent: m[1] });
    }
  }

  if (hookDecls.length < 2) return false; // no duplicates possible

  // Find duplicate pairs: same indent level (roughly same scope) and both have 't'
  // Group by "approximate scope" - we look at pairs that are close and both have 't'
  for (let i = 0; i < hookDecls.length; i++) {
    if (toRemove.has(hookDecls[i].lineIdx)) continue;
    
    for (let j = i + 1; j < hookDecls.length; j++) {
      if (toRemove.has(hookDecls[j].lineIdx)) continue;
      
      const a = hookDecls[i];
      const b = hookDecls[j];
      
      // Both must be 't' hooks (not something else like useTranslation for a different var)
      if (!a.vars.includes('t') || !b.vars.includes('t')) continue;
      
      // Must have similar indentation (same function scope)
      if (Math.abs(a.indent.length - b.indent.length) > 2) continue;
      
      // Must be within 30 lines of each other (same component body, not different components)
      if (b.lineIdx - a.lineIdx > 30) continue;
      
      // It's a duplicate pair. Decide which to remove:
      // - If one has more vars (like i18n), it's the keeper, remove the simpler one
      // - If they're identical, remove the first one and keep the second
      if (a.vars.length < b.vars.length) {
        // a is simpler (e.g., just { t }), b is more complete (e.g., { t, i18n })
        toRemove.add(a.lineIdx);
      } else if (b.vars.length < a.vars.length) {
        // b is simpler, remove b
        toRemove.add(b.lineIdx);
      } else {
        // Same number of vars - remove the first occurrence (a)
        toRemove.add(a.lineIdx);
      }
      
      // Only fix one duplicate pair per "a" declaration
      break;
    }
  }

  if (toRemove.size === 0) return false;

  const newLines = lines.filter((_, i) => !toRemove.has(i));
  const newContent = newLines.join('\n');
  
  if (newContent === content) return false;
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

const files = walk(SRC);
let fixed = 0;
const fixedFiles = [];

for (const f of files) {
  try {
    if (fixFile(f)) {
      fixed++;
      fixedFiles.push(path.relative(ROOT, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    // skip
  }
}

console.log(`fixed_files=${fixed}`);
if (fixed > 0) {
  fixedFiles.forEach(f => console.log('  ' + f));
}
