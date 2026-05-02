#!/usr/bin/env node
/**
 * Token Drift Validator (PILLAR 3.A).
 *
 * Walks every product / module surface (TypeScript + CSS + SCSS) and
 * reports any direct usage of Carbon CSS variables (`--cds-*`) that
 * isn't in the approved override layer. The one-source rule says:
 *
 *   • @dos/design-tokens/  — may declare `--cds-*` (override layer)
 *   • @dos/ui-system/      — may consume `--cds-*` (Carbon wrappers)
 *   • everywhere else      — MUST use `--dos-*` tokens only
 *
 * Direct `--cds-*` use in products/modules/services means a refactor
 * to the override sheet won't reach that surface. Catch + fail.
 *
 * Usage:
 *   node scripts/validate-token-drift.mjs
 *   node scripts/validate-token-drift.mjs --strict       # warns also fail
 *   node scripts/validate-token-drift.mjs --fix-list     # print files only
 *
 * Exit codes:
 *   0 — clean
 *   1 — drift detected
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return dirname(here);
})();

// ────────────────────────────────────────────────────────────────────
// CLI flags
// ────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const STRICT   = args.has('--strict');
const FIX_LIST = args.has('--fix-list');

// ────────────────────────────────────────────────────────────────────
// Allowlist — paths that MAY consume --cds-* directly.
// ────────────────────────────────────────────────────────────────────
const ALLOWED_PREFIXES = [
  'platform/ui-system/dos-design-tokens/',
  'platform/ui-system/dos-ui-system/',
  'platform/ui-system/dos-ui-contracts/',
  'platform/foundation/ui/styles/carbon/',
  'platform/dauth/',          // login surfaces still on Carbon-direct
  'platform/config-center/',  // shared dynamic-ui surfaces
  'node_modules/',
  'dist/',
  '.angular/',
];

// ────────────────────────────────────────────────────────────────────
// Scan roots
// ────────────────────────────────────────────────────────────────────
const SCAN_ROOTS = [
  'products/shahin-ai/app/src',
  'modules',
];

const SKIP_NAMES = new Set([
  'node_modules', 'dist', '.angular', '.git', 'coverage',
  '_archive', 'fesm2015', 'fesm2020', 'esm2020',
]);

const FILE_EXTENSIONS = ['.ts', '.html', '.css', '.scss'];

// Match `--cds-anything` (CSS custom property) but NOT `cds--something`
// (Carbon's HTML class names like `cds--btn`, which are fine).
const CDS_VAR_RE = /(?<![\w-])--cds-[a-z][a-z0-9-]*/g;

// ────────────────────────────────────────────────────────────────────
// Walker
// ────────────────────────────────────────────────────────────────────
function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_NAMES.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      walk(p, out);
    } else if (FILE_EXTENSIONS.some(ext => name.endsWith(ext))) {
      out.push(p);
    }
  }
}

const files = [];
for (const seg of SCAN_ROOTS) {
  walk(join(ROOT, seg), files);
}

console.log(`Token Drift Validator — scanning ${files.length} files…\n`);

// ────────────────────────────────────────────────────────────────────
// Scan
// ────────────────────────────────────────────────────────────────────
const violations = [];   // { file, count, samples }

for (const file of files) {
  const rel = relative(ROOT, file);
  if (ALLOWED_PREFIXES.some(p => rel.startsWith(p))) continue;

  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }

  const matches = [...content.matchAll(CDS_VAR_RE)];
  if (matches.length === 0) continue;

  const uniqueVars = [...new Set(matches.map(m => m[0]))];
  violations.push({
    file: rel,
    count: matches.length,
    samples: uniqueVars.slice(0, 6),
  });
}

// ────────────────────────────────────────────────────────────────────
// Report
// ────────────────────────────────────────────────────────────────────
if (FIX_LIST) {
  for (const v of violations) console.log(v.file);
  process.exit(violations.length > 0 ? 1 : 0);
}

if (violations.length === 0) {
  console.log('✓ No --cds-* token drift outside the approved override layer.');
  process.exit(0);
}

console.log(`✘ ${violations.length} file(s) consume --cds-* tokens directly:\n`);
for (const v of violations) {
  console.log(`  ${v.file}  (${v.count} ref${v.count === 1 ? '' : 's'})`);
  console.log(`    e.g. ${v.samples.join(', ')}`);
}
console.log(`
Direct --cds-* usage in product/module surfaces breaks the
single-source rule. Replace with --dos-* tokens; if you need the Carbon
default, route through @dos/design-tokens/carbon-overrides.css.

Result: ${violations.length} drift · exit ${STRICT || violations.length > 0 ? 1 : 0}
`);
process.exit(STRICT || violations.length > 0 ? 1 : 0);
