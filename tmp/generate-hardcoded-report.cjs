const fs = require("fs");
const path = require("path");

const root = process.cwd();
const srcRoot = path.join(root, "frontend", "src");
const outPath = path.join(root, "docs", "hardcoded-text-refactor-report.json");
const exts = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", "dev-dist"].includes(e.name) || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (exts.has(path.extname(e.name))) files.push(full);
  }
  return files;
}

function add(arr, file, line, text, reason) {
  const t = text.trim();
  if (!t) return;
  if (t.length < 2) return;
  if (t.includes("i18n") || t.includes("useTranslation") || t.includes("t(")) return;
  arr.push({ file, line, text: t.slice(0, 200), reason });
}

const replacedTexts = [
  { file: "frontend/src/pages/ActivateAccountPage.jsx", before: "Local TRANSLATIONS object + conditional literals", after: "common.activation.* keys via useTranslation(common)" },
  { file: "frontend/src/components/Header.jsx", before: "Theme/quick-sale/super-badge literals", after: "admin.header.* keys" },
  { file: "frontend/src/components/AnimatedNotification.jsx", before: "Default Arabic notification titles", after: "common.notifications.* keys" }
];

const newKeys = [
  "admin.header.quick_sale","admin.header.super_badge","admin.header.theme.system","admin.header.theme.to_light","admin.header.theme.to_dark",
  "common.notifications.success_title","common.notifications.error_title","common.notifications.warning_title","common.notifications.info_title",
  "common.activation.loading","common.activation.invalid_title","common.activation.invalid_sub","common.activation.back_home",
  "common.activation.lang.english","common.activation.lang.arabic","common.activation.brand","common.activation.welcome","common.activation.subtitle",
  "common.activation.account","common.activation.team_invite","common.activation.customer_portal","common.activation.fallback_title",
  "common.activation.fallback_desc","common.activation.done_title","common.activation.done_sub","common.activation.redirecting",
  "common.activation.step_title","common.activation.step_heading","common.activation.pass_label","common.activation.pass_placeholder",
  "common.activation.confirm_label","common.activation.confirm_placeholder","common.activation.form.access_for","common.activation.support",
  "common.activation.activating","common.activation.activate_btn","common.activation.powered_by",
  "common.activation.validation.password_min","common.activation.validation.password_mismatch"
];

const candidates = [];
for (const abs of walk(srcRoot)) {
  const file = path.relative(root, abs).replace(/\\/g, "/");
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("import ") || line.startsWith("//")) continue;

    if (/[\u0600-\u06FF]/.test(raw)) {
      add(candidates, file, i + 1, line, "arabic_literal");
      continue;
    }

    // JSX direct text node heuristic: >Some text<
    const m = raw.match(/>\s*([A-Za-z][^<{]{2,})\s*</);
    if (m && !line.includes("t(")) {
      add(candidates, file, i + 1, m[1], "jsx_text_node_en");
    }
  }
}

const seen = new Set();
const dedup = [];
for (const c of candidates) {
  const k = `${c.file}:${c.line}:${c.text}`;
  if (seen.has(k)) continue;
  seen.add(k);
  dedup.push(c);
}

const byFile = {};
for (const c of dedup) byFile[c.file] = (byFile[c.file] || 0) + 1;
const topFiles = Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .map(([file, count]) => ({ file, count }));

const report = {
  generatedAt: new Date().toISOString(),
  scope: "frontend/src/**",
  migrationStatus: "partial-high-confidence-pass",
  replacedTexts,
  newlyAddedLocalizationKeys: newKeys,
  ambiguousManualReview: {
    totalCandidates: dedup.length,
    topFiles,
    samples: dedup.slice(0, 400)
  },
  notes: [
    "Candidates are prioritized as Arabic literals and direct JSX English text nodes.",
    "Samples are truncated for manual triage. Use file summaries to drive batch refactors."
  ]
};

fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(`report=${path.relative(root, outPath).replace(/\\/g, "/")}`);
console.log(`candidates=${dedup.length}`);
