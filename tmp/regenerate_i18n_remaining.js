const fs = require('fs');
const path = require('path');

const root = process.cwd();
const src = path.join(root, 'frontend', 'src');
const exts = new Set(['.jsx', '.tsx']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const rows = [];
for (const filePath of walk(src)) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    if (/[\u0600-\u06FF]/.test(line) && !line.includes('t(') && !line.includes('i18n.t(')) {
      count++;
    }
  }
  if (count > 0) rows.push({ file: rel, count });
}

rows.sort((a, b) => b.count - a.count);

const report = {
  generatedAt: new Date().toISOString(),
  remainingFiles: rows.length,
  top: rows.slice(0, 60),
};

const outPath = path.join(root, 'docs', 'react-components-i18n-remaining.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log(`remainingFiles=${rows.length}`);
console.log(`top1=${rows[0] ? `${rows[0].file}:${rows[0].count}` : 'none:0'}`);
