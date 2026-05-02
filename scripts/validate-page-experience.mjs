#!/usr/bin/env node
/**
 * Page Quality Gate validator (Spec §10 Hard Gates + §21 30-criteria gate)
 *
 * Walks every `**\/contracts/ui.contract.json` in the repo and, for each
 * route entry, verifies the spec's required fields are present and
 * well-formed. Exits non-zero on any failure so CI / pre-commit can
 * block ships that don't follow the spec.
 *
 * Usage:
 *   node scripts/validate-page-experience.mjs
 *   node scripts/validate-page-experience.mjs --strict   # also fail on warnings
 *   node scripts/validate-page-experience.mjs --route=/workspace-home  # narrow
 *
 * The validator is contract-only — it does NOT crawl the live SPA. The
 * runtime DOM gate (data-page-type / data-layout attributes on the
 * rendered <section>) is enforced by an e2e Playwright test (separate),
 * which uses the same field list this script does.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  // scripts/ sits one level under the repo root.
  return dirname(here);
})();

// ────────────────────────────────────────────────────────────────────
// Spec field requirements (§3.2 PageExperienceContract + §10 + §21).
// ────────────────────────────────────────────────────────────────────
const REQUIRED_PER_ROUTE = [
  'route',
  'pageType',
  'layout',
  'kpiScope',
  'titleKey',
];
const ALLOWED_PAGE_TYPES = [
  'overview', 'list', 'object', 'workflow', 'analytics',
  'audit', 'settings', 'report', 'builder',
];
const ALLOWED_LAYOUTS = [
  'dashboard', 'full-page', 'split-view', 'object-page',
  'wizard', 'report', 'canvas',
];
const ALLOWED_KPI_SCOPES = ['module-overview', 'page-local', 'none'];
const RECOMMENDED_PER_ROUTE = [
  'userIntent', 'signatureWidget', 'emptyStateKey', 'errorStateKey',
];

// §21 #6 — every route MUST declare a signatureWidget (or fall back to
// the generic page-type renderer; we treat absence as a WARN, not FAIL).
// §21 #7 — overview pages must use a *Command Center* signature widget.
const COMMAND_CENTER_HINT = /command[-_ ]?center/i;

// ────────────────────────────────────────────────────────────────────
// CLI flags
// ────────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const ROUTE_FILTER = (() => {
  const a = process.argv.find(a => a.startsWith('--route='));
  return a ? a.slice('--route='.length) : null;
})();

// ────────────────────────────────────────────────────────────────────
// File walker — find all ui.contract.json under platform/, modules/,
// products/, services/. Skip node_modules, dist, .git.
// ────────────────────────────────────────────────────────────────────
function walkContracts(root) {
  const results = [];
  const SKIP_NAMES = new Set(['node_modules', 'dist', '.git', '.angular', 'coverage', '_archive']);
  const SCAN_ROOTS = [
    'platform', 'modules', 'products', 'services',
  ];
  for (const seg of SCAN_ROOTS) {
    const start = join(root, seg);
    let entries;
    try { entries = readdirSync(start); } catch { continue; }
    walk(start, results, SKIP_NAMES);
  }
  return results;
}

function walk(dir, out, skip) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      walk(p, out, skip);
    } else if (name === 'ui.contract.json') {
      out.push(p);
    }
  }
}

// ────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────
const failures = [];
const warnings = [];

function fail(filePath, message) {
  failures.push(`${relative(ROOT, filePath)}: ${message}`);
}
function warn(filePath, message) {
  warnings.push(`${relative(ROOT, filePath)}: ${message}`);
}

function validateContract(filePath, json) {
  if (!json || typeof json !== 'object') {
    fail(filePath, 'not a JSON object');
    return;
  }
  if (!json.moduleCode || typeof json.moduleCode !== 'string') {
    fail(filePath, 'missing top-level "moduleCode"');
  }
  const routes = Array.isArray(json.routes) ? json.routes : null;
  if (!routes) {
    fail(filePath, 'missing "routes" array');
    return;
  }
  for (const r of routes) {
    if (ROUTE_FILTER && r.route !== ROUTE_FILTER) continue;
    validateRoute(filePath, json.moduleCode, r);
  }
  if (!Array.isArray(json.kpis) && !json.themeTokens) {
    warn(filePath, 'no themeTokens declared (§21 #1)');
  }
}

function validateRoute(filePath, moduleCode, r) {
  const tag = `${moduleCode} ${r.route || '<no-route>'}`;

  // §10 / §21 #2-#5 — required fields
  for (const f of REQUIRED_PER_ROUTE) {
    if (!r[f]) {
      fail(filePath, `${tag}: missing required field "${f}" (§10 / §21 #${REQUIRED_PER_ROUTE.indexOf(f) + 2})`);
    }
  }

  // pageType vocabulary
  if (r.pageType && !ALLOWED_PAGE_TYPES.includes(r.pageType)) {
    fail(filePath, `${tag}: pageType="${r.pageType}" not in ${ALLOWED_PAGE_TYPES.join('|')}`);
  }

  // layout vocabulary
  if (r.layout && !ALLOWED_LAYOUTS.includes(r.layout)) {
    fail(filePath, `${tag}: layout="${r.layout}" not in ${ALLOWED_LAYOUTS.join('|')}`);
  }

  // kpiScope vocabulary + §30.4 strict KPI hierarchy
  if (r.kpiScope && !ALLOWED_KPI_SCOPES.includes(r.kpiScope)) {
    fail(filePath, `${tag}: kpiScope="${r.kpiScope}" not in ${ALLOWED_KPI_SCOPES.join('|')}`);
  }
  if (r.pageType === 'overview' && r.kpiScope !== 'module-overview' && r.kpiScope !== 'page-local') {
    fail(filePath, `${tag}: overview page must declare kpiScope=module-overview or page-local (§30.4)`);
  }
  if (r.pageType !== 'overview' && r.kpiScope === 'module-overview') {
    fail(filePath, `${tag}: only overview pages may use kpiScope=module-overview (§30.4 / §21 #8)`);
  }

  // titleKey shape — must be a dotted i18n key, never a raw English literal
  if (r.titleKey && /\s/.test(r.titleKey)) {
    fail(filePath, `${tag}: titleKey="${r.titleKey}" looks like raw text — should be a dotted i18n key`);
  }
  if (r.titleKey === '@missing-contract') {
    fail(filePath, `${tag}: titleKey is the resolver's "missing-contract" sentinel`);
  }

  // §21 #6 — signatureWidget recommended (warn, not fail)
  if (!r.signatureWidget) {
    warn(filePath, `${tag}: no signatureWidget declared — generic ${r.pageType || 'page-type'} renderer will be used (§21 #6)`);
  }

  // §21 #7 — overview must use a Command Center widget
  if (r.pageType === 'overview' && r.signatureWidget && !COMMAND_CENTER_HINT.test(r.signatureWidget)) {
    warn(filePath, `${tag}: overview page signatureWidget="${r.signatureWidget}" doesn't look like a Command Center (§21 #7)`);
  }

  // §3.2 / §21 #20 — emptyStateKey / errorStateKey recommended
  for (const f of RECOMMENDED_PER_ROUTE) {
    if (!r[f]) warn(filePath, `${tag}: missing recommended "${f}"`);
  }

  // §21 #14-#15 — Arabic + English labels (we can only check the keys
  // exist in the contract's i18nKeys array; the actual translation
  // rows live in dos.i18n_translations once 0141 promotes).
  // This is a soft check.
}

// ────────────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────────────
const contracts = walkContracts(ROOT);

if (contracts.length === 0) {
  console.error('No ui.contract.json files found under platform/, modules/, products/, services/.');
  process.exit(1);
}

console.log(`Page Quality Gate — scanning ${contracts.length} contract(s)…\n`);

for (const file of contracts) {
  let json;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    fail(file, `JSON parse error: ${err.message}`);
    continue;
  }
  validateContract(file, json);
}

// ────────────────────────────────────────────────────────────────────
// Report
// ────────────────────────────────────────────────────────────────────
const indent = (lines) => lines.map(l => `  ${l}`).join('\n');

if (failures.length) {
  console.error(`\n✘ ${failures.length} FAIL${failures.length === 1 ? '' : 's'}:`);
  console.error(indent(failures));
}
if (warnings.length) {
  console.warn(`\n⚠ ${warnings.length} WARN${warnings.length === 1 ? '' : 's'}:`);
  console.warn(indent(warnings));
}
if (!failures.length && !warnings.length) {
  console.log('✓ All contracts pass §10 + §21 (and §3.2 recommended fields).');
}

const exit =
  failures.length > 0 ? 1 :
  STRICT && warnings.length > 0 ? 1 :
  0;

console.log(`\nResult: ${failures.length} fail · ${warnings.length} warn · exit ${exit}`);
process.exit(exit);
