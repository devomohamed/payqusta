/**
 * Fix malformed pattern where localization hook is inserted inside function params:
 *
 * export default function X({
 *   const { t } = useTranslation('admin');
 *   open,
 * }) {
 *
 * Becomes:
 * export default function X({
 *   open,
 * }) {
 *   const { t } = useTranslation('admin');
 *
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

function fixFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  let changed = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\(([^)]*)\)\s*;\s*$/);
    if (!match) continue;

    // Check if previous non-empty line is function param opening like "...({"
    let prev = i - 1;
    while (prev >= 0 && lines[prev].trim() === '') prev--;
    if (prev < 0) continue;
    const prevTrim = lines[prev].trim();
    const looksLikeParamOpen = /\($/.test(prevTrim) || /\(\{$/.test(prevTrim) || /\{$/.test(prevTrim);
    const looksLikeFunctionStart = /(function\s+\w+|function\s*\(|=>\s*\(|export\s+default\s+function)/.test(lines[prev]);
    if (!looksLikeParamOpen || !looksLikeFunctionStart) continue;

    // Find function body opening line (usually ") {" or "}) {")
    let bodyLine = -1;
    for (let j = i + 1; j < Math.min(lines.length, i + 80); j++) {
      const t = lines[j].trim();
      if (/^\)\s*\{\s*$/.test(t) || /^\}\)\s*\{\s*$/.test(t) || /^\)\s*=>\s*\{\s*$/.test(t) || /^\}\)\s*=>\s*\{\s*$/.test(t)) {
        bodyLine = j;
        break;
      }
    }
    if (bodyLine === -1) continue;

    // Remove misplaced line
    const hookLine = line.trim();
    lines.splice(i, 1);
    changed = true;

    // Insert hook as first line in function body if not already there
    const bodyIndent = (lines[bodyLine - 1] || '').match(/^\s*/)[0];
    const innerIndent = bodyIndent + '  ';
    const insertAt = bodyLine;
    if ((lines[insertAt] || '').trim() !== hookLine) {
      lines.splice(insertAt, 0, `${innerIndent}${hookLine}`);
    }

    // Continue after inserted line
    i = insertAt;
  }

  const out = lines.join('\n');
  if (changed && out !== raw) {
    fs.writeFileSync(filePath, out, 'utf8');
    return true;
  }
  return false;
}

const files = walk(SRC);
let fixed = 0;
for (const f of files) {
  try {
    if (fixFile(f)) {
      fixed++;
      console.log(path.relative(ROOT, f).replace(/\\/g, '/'));
    }
  } catch (e) {
    // skip
  }
}
console.log(`fixed_files=${fixed}`);
