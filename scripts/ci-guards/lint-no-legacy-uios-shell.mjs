#!/usr/bin/env node
/**
 * CI guard: HARD-KILL LEGACY MODE — Dynamic UI / UI-OS freedom pass.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-legacy-uios-shell.mjs [OPTIONS]

Hard-kill legacy mode - enforces Dynamic UI / UI-OS freedom pass.

Options:
  --help, -h           Show this help message
  --stdin              Read file paths from stdin (one per line)
  --json, -j           Output results as structured JSON

Doctrine:
  DB stores. UI-OS resolves. Frontend renders only normalized runtime.
  No /workspace-home literal outside approved DB migration/seed boundary.
  No DEFAULT_HOME_FALLBACK, no static defaultHomeRoute, no WorkspaceHomeComponent.
  No hardcoded Shahin-AI brand outside tenant-branding seed.

Scope:
  FE_SCAN_DIRS - strict frontend doctrine (snake_case DB DTOs, legacy adapters, static nav)
  WIDE_SCAN_DIRS - every layer that has leaked hardcoded /workspace-home or brand labels

Exit codes:
  0 — PASS
  1 — FAIL

Examples:
  # Run legacy UI-OS shell check
  node scripts/ci-guards/lint-no-legacy-uios-shell.mjs

  # Output as JSON
  node scripts/ci-guards/lint-no-legacy-uios-shell.mjs --json

  # Pipe file paths from another command
  git ls-files '*.ts' | node scripts/ci-guards/lint-no-legacy-uios-shell.mjs --stdin
`);
  process.exit(0);
}

const useJson = process.argv.includes('--json') || process.argv.includes('-j');

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();

// Strict frontend doctrine zones — full FORBIDDEN_FE band applies here.
const FE_SCAN_DIRS = [
  'platform/core/platform/shell',
  'platform/core/platform/navigation',
  'platform/core/services/platform',
  'platform/ui-system/dos-ui-system/src/shell',
  'platform/ui-system/dos-ui-contracts/src',
];

// Wide /workspace-home / brand / fallback literal kill-zone.
const WIDE_SCAN_DIRS = [
  'platform/access',
  'platform/runtime',
  'platform/foundation',
  'platform/dauth',
  'platform/config-center',
  'platform/ai',
  'platform/core',
  'platform/ui-system',
  'platform/app/src',
  'services/gateway',
  'services/tenant-service',
  'services/ui-os-service',
  'services/auth-service',
  'services/platform',
  'services/platform-app-shell',
  'services/platform-core-service',
  'services/platform-product-service',
  'services/product-shell',
  'services/workspace-bff',
  'services/tenant-admin-bff',
  'services/signup-bff',
  'services/marketing-shell-service',
  'products/shahin-ai',
];

// Files that may legitimately reference forbidden literals because they
// are an approved DB boundary, the doctrine guard itself, or a build
// artifact. Tests + seeds are NOT globally skipped — the report must
// count them. Only the approved migration boundary
// (platform/dos/migrations/) and the approved tenant-branding seed
// boundary (path explicitly listed below) are exempt.
const SKIP_PATTERNS = [
  /node_modules/,
  /\/dist\//,
  /\.git\//,
  /\.angular\/cache\//,
  // Approved DB boundary — SQL migration files under platform/dos/migrations
  // (where the DB schema/defaults/seeds are authored).
  /platform\/dos\/migrations\//,
  // Doctrine guard itself self-references forbidden tokens.
  /scripts\/ci-guards\//,
  // Pre-approved exceptions (carry-overs from previous guard versions).
  /platform-mode\.service\.ts/,
  /command-palette\.registry\.ts/,
  /module-template\.types\.ts$/,
];

// Approved tenant-branding seed boundary — only this exact path may
// contain the 'Shahin-AI' brand literal. Every other seed pack must
// stay generic.
const BRAND_SEED_ALLOWED = [
  /platform\/dos\/migrations\//,                // SQL brand seed migrations
  /tenant_branding/,                            // any file dedicated to tenant branding
];

// Frontend-only band: snake_case DB DTOs, legacy adapters, dot-path
// scans, static builders, CSS fallback. Applied only to FE_SCAN_DIRS.
const FORBIDDEN_FE = [
  // Legacy action adapters
  { pattern: /shellActionFromLegacyRecord/g, label: 'shellActionFromLegacyRecord' },

  // DB DTO fields forbidden in frontend shell/navigation/ui-system (snake_case)
  { pattern: /\blabel_key\b/g, label: 'label_key DB field leaked to frontend' },
  { pattern: /\blabel_fallback\b/g, label: 'label_fallback DB field leaked to frontend' },
  { pattern: /\bgroup_id\b/g, label: 'group_id DB field leaked to frontend' },
  { pattern: /\bitem_id\b/g, label: 'item_id DB field leaked to frontend' },
  { pattern: /\bparent_code\b/g, label: 'parent_code DB field leaked to frontend' },
  { pattern: /\bmodule_code\b/g, label: 'module_code DB field leaked to frontend' },
  { pattern: /\bsort_order\b/g, label: 'sort_order DB field leaked to frontend' },
  { pattern: /\bcomponent_key\b/g, label: 'component_key DB field leaked to frontend' },
  { pattern: /\bperms_required\b/g, label: 'perms_required DB field leaked to frontend' },
  { pattern: /\bdetail_route\b/g, label: 'detail_route DB field leaked to frontend' },
  { pattern: /\bevidence_uri\b/g, label: 'evidence_uri DB field leaked to frontend' },

  // Old runtime aliases
  { pattern: /\bchromeStrings\b/g, label: 'chromeStrings old flat key' },
  { pattern: /props\[['"]accountMenu['"]\]/g, label: 'props accountMenu flat prop read' },
  { pattern: /\bDynamicFoundationNavRow\b/g, label: 'DynamicFoundationNavRow legacy DTO' },
  { pattern: /\blabelKey\b/g, label: 'labelKey legacy field name (use i18nKey)' },
  { pattern: /\blabelEn\b/g, label: 'labelEn legacy field (use i18n contract)' },
  { pattern: /\blabelAr\b/g, label: 'labelAr legacy field (use i18n contract)' },
  { pattern: /\bdetailRoute\b/g, label: 'detailRoute legacy field (use ShellAction)' },
  { pattern: /\bevidenceUri\b/g, label: 'evidenceUri legacy field (use ShellAction)' },

  // Envelope drift
  { pattern: /\bWorkspaceShellCatalogEntry\b/g, label: 'WorkspaceShellCatalogEntry — catalog moved to /workspace-shell-catalog' },
  { pattern: /registerWorkspaceShellCatalog\s*\(/g, label: 'registerWorkspaceShellCatalog runtime register (catalog endpoint owns this)' },
  { pattern: /resp\??\.\s*navigation\b/g, label: 'resp.navigation legacy alias (use resp.shell.nav)' },
  { pattern: /resp\??\.\s*surfaces\b/g, label: 'resp.surfaces legacy alias (use resp.shell.surfaces)' },
  { pattern: /resp\??\.\s*componentRegistry\b/g, label: 'resp.componentRegistry legacy alias' },
  { pattern: /\bglobalPropArray\s*\(/g, label: 'globalPropArray dot-path scan (read shell.{chrome,banners,policies,shortcuts})' },
  { pattern: /\bnestedRecordProp\s*\(/g, label: 'nestedRecordProp dot-path scan (use first-class envelope reads)' },
  { pattern: /\bnestedNumberProp\s*\(/g, label: 'nestedNumberProp dot-path scan (use first-class envelope reads)' },
  { pattern: /\bwalkNested\s*\(/g, label: 'walkNested dot-path scan (use first-class envelope reads)' },
  { pattern: /shell\.chrome\.labels/g, label: 'shell.chrome.labels dot-path (chrome is flat KV)' },
  { pattern: /shell\.surfaces\.[A-Za-z]+/g, label: 'shell.surfaces.X dot-path scan (use first-class envelope reads)' },

  // Static nav builders/fallbacks
  { pattern: /\bbuildPlatformNav\b/g, label: 'buildPlatformNav static nav builder' },
  { pattern: /\bbuildFoundationNavChildren\b/g, label: 'buildFoundationNavChildren frontend nav mapper/fallback' },
  { pattern: /\bbuildFoundationGroup\b/g, label: 'buildFoundationGroup static nav builder' },
  { pattern: /\blabelFromKey\b/g, label: 'labelFromKey synthesised label (use resolver i18n)' },
  { pattern: /fallback\s+to\s+static/gi, label: 'fallback to static comment/code' },
  { pattern: /static\s+SPA\s+list/gi, label: 'static SPA list comment/code' },
  { pattern: /static\s+nav/gi, label: 'static nav comment/code' },

  // Shell-host hardcoded fallback/policy
  { pattern: /FALLBACK_GROUP_ICON/g, label: 'FALLBACK_GROUP_ICON' },
  { pattern: /FALLBACK_ITEM_ICON/g, label: 'FALLBACK_ITEM_ICON' },
  { pattern: /CARBON_BREAKPOINT_LARGE_PX/g, label: 'CARBON_BREAKPOINT_LARGE_PX' },
  { pattern: /document\.querySelector/g, label: 'document.querySelector shell DOM coupling' },
  { pattern: /\/settings\/subscription/g, label: '/settings/subscription hardcoded product route' },

  // CSS fallback values forbidden in shell inline styles
  { pattern: /var\([^)]*,[^)]*\)/g, label: 'CSS var fallback value var(..., ...)' },
  { pattern: /@media\s*\(\s*max-width\s*:\s*480px\s*\)/g, label: 'hardcoded 480px media query' },
];

// Wide kill-zone: hardcoded /workspace-home literal, fallback constants,
// brand literal, dead WorkspaceHomeComponent / workspace-home-cockpit.
// Applied to BOTH FE_SCAN_DIRS and WIDE_SCAN_DIRS.
const FORBIDDEN_WIDE = [
  { pattern: /\/workspace-home/g, label: '/workspace-home hardcoded route literal (must come from DB → UI-OS runtime)' },
  { pattern: /\bDEFAULT_HOME_FALLBACK\b/g, label: 'DEFAULT_HOME_FALLBACK static fallback constant' },
  { pattern: /\bdefaultHomeRoute\b/g, label: 'defaultHomeRoute static field (route must come from DB)' },
  { pattern: /\bdefaultLandingPage\b/g, label: 'defaultLandingPage static field (route must come from DB)' },
  { pattern: /\bDEFAULT_HOME_ROUTE\b/g, label: 'DEFAULT_HOME_ROUTE static env fallback' },
  { pattern: /\bWorkspaceHomeComponent\b/g, label: 'WorkspaceHomeComponent — workspace-home is shell-only (DB classification)' },
  { pattern: /workspace-home-cockpit/g, label: 'workspace-home-cockpit dead widget key (template binding deleted)' },
  { pattern: /\bloadWorkspaceHomeProps\b/g, label: 'loadWorkspaceHomeProps dead loader (no template binding)' },
  // Brand literal — owned by tenant_branding DB seed only. Source code
  // must read it through resolver/runtime, never hardcode it.
  { pattern: /['"`]Shahin-AI['"`]/g, label: "'Shahin-AI' brand literal (tenant_branding owns this)" },
];

function shouldSkip(full) {
  return SKIP_PATTERNS.some((p) => p.test(full));
}

// Scanned extensions. Tests/seeds are not auto-excluded — they show up
// in the report and must be cleaned in a dedicated batch.
const SCAN_EXTS = ['.ts', '.html', '.json', '.scss', '.css', '.sql'];

function walk(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      if (shouldSkip(full)) continue;
      files.push(...walk(full));
      continue;
    }
    if (!SCAN_EXTS.some((e) => full.endsWith(e))) continue;
    if (shouldSkip(full)) continue;
    files.push(full);
  }
  return files;
}

// Pure-comment line detection per file extension. We still elide
// comment-only lines so JSDoc / SQL-comment doctrine citations don't
// fire false positives, but we do it per-syntax.
function isCommentLine(trimmed, ext) {
  if (ext === '.ts' || ext === '.scss' || ext === '.css') {
    return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
  }
  if (ext === '.html') {
    return trimmed.startsWith('<!--');
  }
  if (ext === '.sql') {
    return trimmed.startsWith('--');
  }
  // .json — no comments
  return false;
}

function scan(file, patterns, hits) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const rel = relative(ROOT, file);
  const ext = '.' + file.split('.').pop();
  const brandAllowed = BRAND_SEED_ALLOWED.some((p) => p.test(rel));
  for (const { pattern, label } of patterns) {
    const isBrandPattern = label.startsWith("'Shahin-AI'");
    if (isBrandPattern && brandAllowed) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (isCommentLine(trimmed, ext)) continue;
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        hits.push({ file: rel, line: i + 1, label, text: trimmed.slice(0, 160), ext });
      }
    }
  }
}

const hits = [];

// Frontend strict band — full FORBIDDEN_FE + FORBIDDEN_WIDE.
const feDirs = FE_SCAN_DIRS.map((d) => join(ROOT, d)).filter(existsSync);
const fePatterns = [...FORBIDDEN_FE, ...FORBIDDEN_WIDE];
for (const dir of feDirs) {
  for (const file of walk(dir)) scan(file, fePatterns, hits);
}

// Wide kill-zone — FORBIDDEN_WIDE only. De-dupe vs FE band by tracking
// seen file paths so we don't double-report files already covered above.
const seen = new Set(hits.map((h) => h.file));
const wideDirs = WIDE_SCAN_DIRS.map((d) => join(ROOT, d)).filter(existsSync);
for (const dir of wideDirs) {
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file);
    // FE-band files were already scanned with the wider pattern set;
    // skip them here so the report is not duplicated.
    if (FE_SCAN_DIRS.some((d) => rel.startsWith(d))) continue;
    scan(file, FORBIDDEN_WIDE, hits);
    seen.add(rel);
  }
}

const totalScanDirs = feDirs.length + wideDirs.length;

if (hits.length === 0) {
  console.log(`[lint-no-legacy-uios-shell] PASS — 0 forbidden legacy patterns across ${totalScanDirs} scan dirs`);
  process.exit(0);
}

console.error(`[lint-no-legacy-uios-shell] FAIL — ${hits.length} forbidden legacy pattern(s):\n`);
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  ${h.label}`);
  console.error(`    ${h.text}\n`);
}

// Per-extension tally
const byExt = hits.reduce((acc, h) => { acc[h.ext] = (acc[h.ext] || 0) + 1; return acc; }, {});
const byLabel = hits.reduce((acc, h) => { acc[h.label] = (acc[h.label] || 0) + 1; return acc; }, {});
console.error(`\n--- Tally by extension ---`);
for (const [ext, n] of Object.entries(byExt).sort((a, b) => b[1] - a[1])) {
  console.error(`  ${ext.padEnd(8)} ${n}`);
}
console.error(`\n--- Tally by label ---`);
for (const [lab, n] of Object.entries(byLabel).sort((a, b) => b[1] - a[1])) {
  console.error(`  ${String(n).padStart(4)}  ${lab}`);
}
process.exit(1);
