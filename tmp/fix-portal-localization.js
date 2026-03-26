const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcRoot = path.join(root, 'frontend', 'src');
const enAdminPath = path.join(root, 'frontend', 'public', 'locales', 'en', 'admin.json');
const arAdminPath = path.join(root, 'frontend', 'public', 'locales', 'ar', 'admin.json');
const enPortalPath = path.join(root, 'frontend', 'public', 'locales', 'en', 'portal.json');
const arPortalPath = path.join(root, 'frontend', 'public', 'locales', 'ar', 'portal.json');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (['.jsx', '.tsx'].includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

let filesChanged = 0;
for (const file of walk(srcRoot)) {
  let src = fs.readFileSync(file, 'utf8');
  const original = src;

  // Remove injected admin hook when file already uses portal/common namespace hook.
  if (src.includes("useTranslation('portal')") || src.includes("useTranslation(\"portal\")")
    || src.includes("useTranslation('common')") || src.includes("useTranslation(\"common\")")) {
    src = src.replace(/\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\('admin'\);\r?\n/g, '\n');
    src = src.replace(/\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\("admin"\);\r?\n/g, '\n');
  }

  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    filesChanged += 1;
  }
}

// Move generated portal_* keys from admin locale to portal locale.
const enAdmin = JSON.parse(fs.readFileSync(enAdminPath, 'utf8'));
const arAdmin = JSON.parse(fs.readFileSync(arAdminPath, 'utf8'));
const enPortal = JSON.parse(fs.readFileSync(enPortalPath, 'utf8'));
const arPortal = JSON.parse(fs.readFileSync(arPortalPath, 'utf8'));

let moved = 0;
for (const key of Object.keys(enAdmin)) {
  if (!key.startsWith('portal_')) continue;
  if (!enPortal[key]) {
    enPortal[key] = enAdmin[key];
    moved += 1;
  }
}
for (const key of Object.keys(arAdmin)) {
  if (!key.startsWith('portal_')) continue;
  if (!arPortal[key]) {
    arPortal[key] = arAdmin[key];
  }
}

fs.writeFileSync(enPortalPath, JSON.stringify(enPortal, null, 2) + '\n', 'utf8');
fs.writeFileSync(arPortalPath, JSON.stringify(arPortal, null, 2) + '\n', 'utf8');

console.log(`files_changed=${filesChanged}`);
console.log(`portal_keys_moved=${moved}`);
