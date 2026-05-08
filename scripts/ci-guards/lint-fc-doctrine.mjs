#!/usr/bin/env node
// F14 — Foundation Console doctrine hard gate.
//
// Scans products/foundation-console/{app/src,packages/* /src,services/* /src,ops}
// for forbidden tokens. Fails non-zero on any violation outside the explicitly
// allowed UI-OS resolver/service boundary.
//
// Doctrine sources:
//   - AGENTS.md  (ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / ZERO MIRROR /
//                 ZERO BROWSER NORMALIZATION / ZERO HARDCODED /workspace-home)
//   - extra-zero-rules + missing-data-rule + maintenance-mode-rule
//
// Exit codes:
//   0 = GREEN
//   1 = violations
//   2 = invocation error

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO_ROOT = process.cwd();
const FC_ROOT = join(REPO_ROOT, 'products', 'foundation-console');
if (!existsSync(FC_ROOT)) { console.error('[fc-doctrine] FC_ROOT missing:', FC_ROOT); process.exit(2); }

const SCAN_ROOTS = [
  join(FC_ROOT, 'app', 'src'),
  join(FC_ROOT, 'packages'),
  join(FC_ROOT, 'services'),
  join(FC_ROOT, 'ops'),
  join(FC_ROOT, 'db', 'migrations'),
];

const ALLOWED_DIR_FOR_SNAKE_CASE = [
  // Doctrine: UI-OS resolver/service boundary may read DB snake_case.
  // Must NOT leave UI-OS as wire payload. We allow snake_case ONLY in resolver source files
  // and the canonical DB migration/seed SQL.
  join(FC_ROOT, 'services', 'foundation-ui-os', 'src'),
  join(FC_ROOT, 'services', 'foundation-dynamic-ui', 'src'),
  join(FC_ROOT, 'db', 'migrations'),
];

const SKIP_DIR_NAMES = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.angular', '.turbo', '.cache',
  '.git', '.pnpm-store',
]);

const SKIP_EXT = new Set([
  '.png','.jpg','.jpeg','.gif','.webp','.ico','.woff','.woff2','.ttf','.otf',
  '.map','.lock','.zip','.gz','.pdf',
]);

// (token, regex, scope-allow-fn)
const RULES = [
  // --- legacy frontend/runtime fields ---
  { id: 'label_key',                re: /\blabel_key\b/,                allowDir: dirIsResolver },
  { id: 'label_fallback',           re: /\blabel_fallback\b/,           allowDir: dirIsResolver },
  { id: 'labelKey',                 re: /\blabelKey\b/,                 allowDir: never },
  { id: 'labelEn_or_labelAr',       re: /\b(labelEn|labelAr)\b/,        allowDir: never },
  { id: 'component_key',            re: /\bcomponent_key\b/,            allowDir: dirIsResolver },
  { id: 'perms_required',           re: /\bperms_required\b/,           allowDir: dirIsResolver },
  { id: 'detailRoute_or_detail_route', re: /\b(detailRoute|detail_route)\b/, allowDir: never },
  { id: 'evidenceUri_or_evidence_uri', re: /\b(evidenceUri|evidence_uri)\b/, allowDir: never },
  { id: 'chromeStrings',            re: /\bchromeStrings\b/,            allowDir: never },
  { id: 'shellActionFromLegacyRecord', re: /\bshellActionFromLegacyRecord\b/, allowDir: never },
  { id: 'buildPlatformNav',         re: /\bbuildPlatformNav\b/,         allowDir: never },
  { id: 'buildFoundationGroup',     re: /\bbuildFoundationGroup\b/,     allowDir: never },
  { id: 'buildFoundationNavChildren', re: /\bbuildFoundationNavChildren\b/, allowDir: never },
  { id: 'props_accountMenu',        re: /props\[\s*['"]accountMenu['"]\s*\]/, allowDir: never },
  // --- hardcoded routes/labels ---
  { id: 'hardcoded_workspace_home', re: /\/workspace-home\b/,           allowDir: never },
  { id: 'hardcoded_settings_subscription', re: /\/settings\/subscription\b/, allowDir: never },
  { id: 'labelFromKey',             re: /\blabelFromKey\b/,             allowDir: never },
  { id: 'document_querySelector',   re: /document\.querySelector/,      allowDir: never },
  // --- frontend invention sentinels ---
  { id: 'fallback_to_static_comment', re: /fallback to static/i,        allowDir: never },
  { id: 'static_spa_list_comment',  re: /static SPA list/i,             allowDir: never },
  { id: 'temporary_fallback_comment', re: /temporary fallback/i,        allowDir: never },
  { id: 'legacy_compatibility_comment', re: /legacy compatibility/i,    allowDir: never },
  { id: 'fake_green_comment',       re: /fake green/i,                  allowDir: never },
  // --- no platform/* import from FC code ---
  { id: 'platform_namespace_import', re: /from\s+['"](?:@dos\/|platform\/(?:core|ui-system|config-center)\/)/, allowDir: never },
  // --- browser auth doctrine ---
  { id: 'localStorage_token',       re: /localStorage\.(?:setItem|getItem)\(\s*['"][^'"]*token[^'"]*['"]/i, allowDir: never },
  { id: 'sessionStorage_token',     re: /sessionStorage\.(?:setItem|getItem)\(\s*['"][^'"]*token[^'"]*['"]/i, allowDir: never },
  { id: 'authorization_bearer_in_browser', re: /Authorization['"]\s*:\s*['"`]\s*Bearer/i, allowDir: dirIsServerSide },
  // --- CSS fallback / hardcoded media query (browser-side) ---
  { id: 'css_var_with_fallback',    re: /var\(\s*--[a-z0-9-]+\s*,\s*[^)]+\)/i, allowDir: dirIsServerSide },
  { id: 'hardcoded_media_480',      re: /@media\s*\(\s*max-width:\s*480px/i, allowDir: never },
];

function dirIsResolver(absFile) {
  return ALLOWED_DIR_FOR_SNAKE_CASE.some((d) => absFile.startsWith(d + sep));
}
function dirIsServerSide(absFile) {
  return absFile.startsWith(join(FC_ROOT, 'services') + sep);
}
function never() { return false; }

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIR_NAMES.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) {
      const dot = e.name.lastIndexOf('.');
      const ext = dot >= 0 ? e.name.slice(dot) : '';
      if (SKIP_EXT.has(ext)) continue;
      yield full;
    }
  }
}

const violations = [];
let scannedFiles = 0;
let scannedBytes = 0;

for (const root of SCAN_ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    if (text.length > 2_000_000) continue;
    scannedFiles += 1;
    scannedBytes += text.length;
    const lines = text.split(/\r?\n/);
    for (const rule of RULES) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!rule.re.test(line)) continue;
        if (rule.allowDir(file)) continue;
        // Self-ignore: this guard file itself contains the regex literals.
        if (file === new URL(import.meta.url).pathname) continue;
        // Inline allow: a comment `fc-doctrine-allow` on the same line, the previous
        // line, or anywhere in the same enclosing block-comment is honored. Used to
        // tag defensive sanitizer/blocklist constants that ENFORCE doctrine.
        const prev = i > 0 ? lines[i - 1] : '';
        if (line.includes('fc-doctrine-allow') || prev.includes('fc-doctrine-allow')) continue;
        violations.push({
          rule: rule.id,
          file: relative(REPO_ROOT, file),
          line: i + 1,
          excerpt: line.slice(0, 200),
        });
      }
    }
  }
}

const summary = {
  generated_at: new Date().toISOString(),
  fc_root: relative(REPO_ROOT, FC_ROOT),
  scanned_roots: SCAN_ROOTS.map((p) => relative(REPO_ROOT, p)),
  scanned_files: scannedFiles,
  scanned_bytes: scannedBytes,
  rules_total: RULES.length,
  violations_total: violations.length,
  violations,
};

const json = process.env.FC_DOCTRINE_JSON === '1';
if (json) {
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} else {
  console.log(`[fc-doctrine] scanned ${scannedFiles} files (${scannedBytes} bytes) across ${SCAN_ROOTS.length} roots`);
  console.log(`[fc-doctrine] rules: ${RULES.length}`);
  if (violations.length === 0) {
    console.log('[fc-doctrine] GREEN — zero forbidden tokens.');
  } else {
    console.error(`[fc-doctrine] FAIL — ${violations.length} violation(s):`);
    for (const v of violations) console.error(`  [${v.rule}] ${v.file}:${v.line}  ${v.excerpt}`);
  }
}
process.exit(violations.length === 0 ? 0 : 1);
