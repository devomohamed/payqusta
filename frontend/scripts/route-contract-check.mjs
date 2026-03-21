import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const appPath = path.join(repoRoot, 'frontend', 'src', 'App.jsx');
const boundariesPath = path.join(repoRoot, 'docs', 'feature-boundaries.md');

const appSource = fs.readFileSync(appPath, 'utf8');
const boundariesSource = fs.readFileSync(boundariesPath, 'utf8');

const requiredAppSnippets = [
  { surface: 'public', snippet: 'path="/features"' },
  { surface: 'public', snippet: 'path="/faq"' },
  { surface: 'public', snippet: 'path="/contact"' },
  { surface: 'storefront', snippet: "path={storefrontPath('/products')}" },
  { surface: 'storefront', snippet: "path={storefrontPath('/checkout')}" },
  { surface: 'storefront', snippet: "path={storefrontPath('/track-order')}" },
  { surface: 'portal', snippet: 'path="/portal"' },
  { surface: 'portal', snippet: 'path="orders"' },
  { surface: 'portal', snippet: 'path="support"' },
  { surface: 'backoffice', snippet: 'path="/dashboard"' },
  { surface: 'backoffice', snippet: 'path="/products"' },
  { surface: 'backoffice', snippet: 'path="/customers"' },
  { surface: 'backoffice', snippet: 'path="/quick-sale"' },
  { surface: 'backoffice', snippet: 'path="/settings"' },
  { surface: 'super-admin', snippet: 'path="/super-admin/plans"' },
  { surface: 'super-admin', snippet: 'path="/admin/tenants"' },
];

const requiredBoundarySnippets = [
  '### Public marketing site',
  '### Storefront',
  '### Customer portal',
  '### Tenant backoffice',
  '### Super admin',
  '- `/portal/*`',
  '- `/store/*` in local/platform-path mode',
  '- authenticated routes under `/`',
  '- `/super-admin/*`',
];

const missingAppSnippets = requiredAppSnippets.filter(({ snippet }) => !appSource.includes(snippet));
const missingBoundarySnippets = requiredBoundarySnippets.filter((snippet) => !boundariesSource.includes(snippet));

const problems = [];

if (missingAppSnippets.length) {
  problems.push('Critical route contracts are missing from frontend/src/App.jsx:');
  for (const item of missingAppSnippets) {
    problems.push(`- [${item.surface}] ${item.snippet}`);
  }
}

if (missingBoundarySnippets.length) {
  problems.push('Critical ownership notes are missing from docs/feature-boundaries.md:');
  for (const snippet of missingBoundarySnippets) {
    problems.push(`- ${snippet}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('Frontend route contract checks passed.');
