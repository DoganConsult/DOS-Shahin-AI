#!/usr/bin/env node
/**
 * lint-no-static-nav-fallback.mjs
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/lint-no-static-nav-fallback.mjs [OPTIONS]

Enforces SPA never uses static Foundation/module navigation as source of truth.

Options:
  --help, -h           Show this help message

Policy:
  Static config MAY exist as rendering allowlist (icon/label enrichment) but MUST NOT
  be returned as navigation tree when dynamic-ui contract is unavailable.

Forbidden patterns:
  1. return STATIC_<X>_NAV_CHILDREN (direct return of static const)
  2. return STATIC_<X>_NAV_CHILDREN.map(...) (derivative return)
  3. if (!dynamic ... ) return STATIC_<X>_NAV_CHILDREN (explicit fallback)
  4. Imports of STATIC_<X>_NAV_CHILDREN inside DynamicUi* bootstrap/runtime services
  5. STATIC_<X>_NAV_CHILDREN in computed visibleNavigation/effectivePageRegistry bodies

Scope:
  - platform/app/src (SPA source)
  - platform/access/dos-access-store/src/nav-sources (L6 composition)
  - platform/core/platform/navigation (nav helpers)

Exit codes:
  Non-zero on static nav fallback violation

Examples:
  # Run static nav fallback check
  node scripts/ci-guards/lint-no-static-nav-fallback.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Primary SPA (canonical); guard fails if missing. */
const SPA_PRIMARY_SRC = path.join(REPO_ROOT, 'platform/app/src');
/** Additional trees where nav must stay dynamic-only. */
const NAV_EXTRA_ROOTS = [
  path.join(REPO_ROOT, 'platform/access/dos-access-store/src/nav-sources'),
  path.join(REPO_ROOT, 'platform/core/platform/navigation'),
];

// Patterns to detect.
const STATIC_NAV_NAME_RE = /\bSTATIC_[A-Z][A-Z0-9_]*_NAV_CHILDREN\b/;
const RETURN_STATIC_RE = /return\s+STATIC_[A-Z][A-Z0-9_]*_NAV_CHILDREN\b/;
const RETURN_STATIC_DERIVED_RE =
  /return\s+STATIC_[A-Z][A-Z0-9_]*_NAV_CHILDREN\s*\.\s*(map|filter|slice|sort|concat|flatMap)/;
const FALLBACK_PATTERN_RE =
  /if\s*\([^)]*(?:!|length\s*===\s*0|=== 0|== 0|undefined|null|empty)[^)]*\)\s*[\r\n\s]*return\s+STATIC_[A-Z][A-Z0-9_]*_NAV_CHILDREN/;

const DEFINE_RE = /^\s*export\s+const\s+STATIC_[A-Z][A-Z0-9_]*_NAV_CHILDREN/;
const ENRICHMENT_LOOKUP_RE =
  /new\s+Map\s*\(\s*STATIC_[A-Z][A-Z0-9_]*_NAV_CHILDREN\s*\.\s*map\s*\(\s*[a-zA-Z_]+\s*=>\s*\[/;

// Bootstrap/runtime service file patterns where importing the static nav
// array is prohibited — these layers must consume only the dynamic contract.
const FORBIDDEN_IMPORT_FILE_PATTERNS = [
  /\/dynamic-ui\/services\/dynamic-ui-bootstrap\.service\.ts$/,
  /\/core\/services\/platform\/dynamic-ui-bootstrap\.service\.ts$/,
  /\/core\/runtime\/[^/]+\.ts$/,
  /\/effective-ui-state\.service\.ts$/,
  /\/ui-blueprint-resolver\.service\.ts$/,
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else if (/\.ts$/.test(name) && !name.endsWith('.spec.ts') && !name.endsWith('.test.ts'))
      acc.push(full);
  }
  return acc;
}

function hasDefineLine(content) {
  return content.split('\n').some((l) => DEFINE_RE.test(l));
}

function isEnrichmentLookup(line) {
  return ENRICHMENT_LOOKUP_RE.test(line);
}

function scanFile(file) {
  const rel = path.relative(REPO_ROOT, file).split(path.sep).join('/');
  const content = readFileSync(file, 'utf-8');
  const findings = [];

  // Skip the file that defines the constant — it's the only allowed location.
  if (hasDefineLine(content)) {
    // It MAY also use the constant for export. Don't flag DEFINE site itself.
  }

  const lines = content.split('\n');
  const isForbiddenFile = FORBIDDEN_IMPORT_FILE_PATTERNS.some((p) => p.test(rel));

  // Forbidden import check: bootstrap/runtime files cannot even import the
  // static nav array.
  if (isForbiddenFile) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        /^\s*import\s/.test(line) &&
        STATIC_NAV_NAME_RE.test(line)
      ) {
        findings.push({
          file: rel,
          line: i + 1,
          severity: 'FAIL',
          rule: 'forbidden-import',
          snippet: line.trim(),
          hint:
            'bootstrap/runtime services must not import static nav constants — load via /api/dynamic-ui/contract/<module>',
        });
      }
    }
  }

  // Pattern checks (any file).
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines that define the constant.
    if (DEFINE_RE.test(line)) continue;

    if (RETURN_STATIC_RE.test(line)) {
      findings.push({
        file: rel,
        line: i + 1,
        severity: 'FAIL',
        rule: 'return-static-as-nav-truth',
        snippet: line.trim(),
        hint: 'return [] when the dynamic contract is unavailable, not the static array',
      });
      continue;
    }
    if (RETURN_STATIC_DERIVED_RE.test(line)) {
      findings.push({
        file: rel,
        line: i + 1,
        severity: 'FAIL',
        rule: 'return-static-derivative',
        snippet: line.trim(),
        hint:
          'do not derive nav from STATIC_<X>_NAV_CHILDREN — derive from /api/dynamic-ui rows',
      });
      continue;
    }
    // Fallback heuristic over a small window of preceding lines so we catch
    // the multi-line `if (...) {\n  return STATIC...` shape.
    if (/return\s+STATIC_[A-Z][A-Z0-9_]*_NAV_CHILDREN\b/.test(line)) {
      const windowStart = Math.max(0, i - 4);
      const window = lines.slice(windowStart, i + 1).join('\n');
      if (FALLBACK_PATTERN_RE.test(window)) {
        findings.push({
          file: rel,
          line: i + 1,
          severity: 'FAIL',
          rule: 'static-as-empty-fallback',
          snippet: line.trim(),
          hint:
            'remove the empty-state fallback to the static array — return [] and surface a load error',
        });
      }
    }
    // Mention inside computed/getter bodies tied to nav truth.
    if (
      STATIC_NAV_NAME_RE.test(line) &&
      !isEnrichmentLookup(line) &&
      /(visibleNavigation|effectivePageRegistry|foundationNavChildren)\s*=/.test(
        lines.slice(Math.max(0, i - 6), i).join('\n'),
      )
    ) {
      findings.push({
        file: rel,
        line: i + 1,
        severity: 'FAIL',
        rule: 'static-in-computed-nav',
        snippet: line.trim(),
        hint:
          'computed nav signals must read only from the dynamic contract, not from STATIC_<X>_NAV_CHILDREN',
      });
    }
  }

  return findings;
}

function main() {
  if (!existsSync(SPA_PRIMARY_SRC)) {
    console.error(
      `[lint-no-static-nav-fallback] Canonical SPA src not found at ${SPA_PRIMARY_SRC}`,
    );
    process.exit(2);
  }
  const files = [];
  walk(SPA_PRIMARY_SRC, files);
  for (const root of NAV_EXTRA_ROOTS) {
    if (existsSync(root)) walk(root, files);
    else
      console.warn(
        `[lint-no-static-nav-fallback] optional scan root missing (skipped): ${root}`,
      );
  }
  const all = [];
  for (const f of files) all.push(...scanFile(f));

  console.log(
    `[lint-no-static-nav-fallback] scanned ${files.length} TS files under platform/app + nav roots`,
  );

  const fails = all.filter((f) => f.severity === 'FAIL');
  const warns = all.filter((f) => f.severity === 'WARN');

  if (fails.length === 0 && warns.length === 0) {
    console.log(
      '[lint-no-static-nav-fallback] PASS — SPA does not use static nav as source of truth',
    );
    process.exit(0);
  }

  if (warns.length) {
    console.warn(`[lint-no-static-nav-fallback] WARN — ${warns.length} pattern(s):`);
    for (const v of warns.slice(0, 30)) {
      console.warn(`  ${v.file}:${v.line}  [${v.rule}]`);
      console.warn(`    ${v.snippet}`);
      if (v.hint) console.warn(`    hint: ${v.hint}`);
    }
  }
  if (fails.length) {
    console.error(`[lint-no-static-nav-fallback] FAIL — ${fails.length} violation(s):`);
    for (const v of fails.slice(0, 50)) {
      console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
      console.error(`    ${v.snippet}`);
      if (v.hint) console.error(`    hint: ${v.hint}`);
    }
    process.exit(1);
  }
  // WARN-only and not strict.
  if (process.env.STRICT === '1') process.exit(1);
  process.exit(0);
}

main();
