#!/usr/bin/env node
/**
 * workspace-platform-dna-vendor-guard
 *
 * Single-vendor rule scoped to the workspace evolution scope locked in
 * docs/plans/we-need-to-deovle-iridescent-sifakis.md:
 *
 *   IBM Carbon (`carbon-components-angular`, `@carbon/icons-angular`,
 *   `@carbon/charts-angular`) is the ONLY UI vendor allowed inside:
 *
 *     - products/shahin-ai/app/src/app/shell/**
 *     - products/shahin-ai/app/src/app/pages/pages/workspace-home.*
 *     - products/shahin-ai/app/src/app/pages/profile/**
 *     - products/shahin-ai/app/src/app/pages/settings/**
 *     - products/shahin-ai/app/src/app/pages/tenant-profile/**
 *     - products/shahin-ai/app/src/app/pages/tenant-settings/**
 *     - products/shahin-ai/app/src/app/pages/workspace/**
 *     - platform/core/platform/shell/**
 *     - platform/billing-os/**
 *     - platform/ui-system/dos-ui-system/**
 *
 * Any of these are FORBIDDEN inside the scoped paths:
 *
 *     - import from 'primeng/...'
 *     - import from 'primeicons'
 *     - import from '@angular/material...'
 *     - import from 'bootstrap' / 'ng-bootstrap'
 *     - import from 'ant-design' / 'ng-zorro'
 *     - any "pi-*" CSS class token in a template/string
 *
 * This is the A1 ratchet for the workspace evolution. It does NOT
 * enforce single-vendor outside of these paths — repo-wide PrimeNG
 * eradication is intentionally out of scope for this plan.
 *
 * Carbon import boundary (one-source rule) is enforced separately by
 * `ui-os-carbon-boundary-guard.mjs` (raw `cds-*` only inside
 * platform/ui-system/dos-ui-system/src/carbon/).
 *
 * Exit code: 0 = OK, 1 = violations found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SCOPED_GLOBS = [
  'products/shahin-ai/app/src/app/shell',
  'products/shahin-ai/app/src/app/pages/pages',           // workspace-home only — see filter below
  'products/shahin-ai/app/src/app/pages/profile',
  'products/shahin-ai/app/src/app/pages/settings',
  'products/shahin-ai/app/src/app/pages/tenant-profile',
  'products/shahin-ai/app/src/app/pages/tenant-settings',
  'products/shahin-ai/app/src/app/pages/workspace',
  'platform/core/platform/shell',
  'platform/billing-os',
  'platform/ui-system/dos-ui-system',
].map((p) => path.join(ROOT, p));

const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.angular', '.cache', '.next', '.pnpm',
  '.pnpm-store', 'coverage', '_drafts', '.git',
]);

const FILE_RE = /\.(ts|tsx|mts|cts|js|mjs|cjs|html|scss|css)$/;

const FORBIDDEN_IMPORTS = [
  { name: 'PrimeNG',            pattern: /from\s+['"]primeng(?:\/[^'"]*)?['"]/g },
  { name: 'PrimeNG (require)',  pattern: /require\(\s*['"]primeng(?:\/[^'"]*)?['"]\s*\)/g },
  { name: 'PrimeIcons',         pattern: /from\s+['"]primeicons(?:\/[^'"]*)?['"]/g },
  { name: 'PrimeNG (themes)',   pattern: /from\s+['"]@primeng\/[^'"]+['"]/g },
  { name: 'ngx-formly/primeng', pattern: /from\s+['"]@ngx-formly\/primeng(?:\/[^'"]*)?['"]/g },
  { name: 'Angular Material',   pattern: /from\s+['"]@angular\/material(?:\/[^'"]*)?['"]/g },
  { name: 'Angular Material (require)', pattern: /require\(\s*['"]@angular\/material(?:\/[^'"]*)?['"]\s*\)/g },
  { name: 'Bootstrap',          pattern: /from\s+['"]bootstrap(?:\/[^'"]*)?['"]/g },
  { name: 'ng-bootstrap',       pattern: /from\s+['"]@ng-bootstrap\/[^'"]+['"]/g },
  { name: 'ng-zorro',           pattern: /from\s+['"]ng-zorro-antd(?:\/[^'"]*)?['"]/g },
  { name: 'Ant Design',         pattern: /from\s+['"]ant-design[^'"]*['"]/g },
];

const PI_CLASS_RE = /\b(?:class(?:Name)?\s*=\s*['"`][^'"`]*?\bpi-[a-z0-9-]+|"\s*pi\s+pi-[a-z0-9-]+|\bpi pi-[a-z0-9-]+\b)/g;

// pages/pages contains many non-workspace pages (landing, etc.). Restrict to
// workspace-home file siblings under that one directory.
function inScope(file) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('products/shahin-ai/app/src/app/pages/pages' + path.sep)) {
    const tail = rel.slice('products/shahin-ai/app/src/app/pages/pages'.length + 1);
    return /^workspace-home\./.test(tail);
  }
  return true;
}

const violations = [];

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!FILE_RE.test(e.name)) continue;
    if (!inScope(p)) continue;
    let src;
    try { src = fs.readFileSync(p, 'utf8'); } catch { continue; }
    for (const { name, pattern } of FORBIDDEN_IMPORTS) {
      pattern.lastIndex = 0;
      const m = pattern.exec(src);
      if (m) {
        violations.push({ file: path.relative(ROOT, p), kind: name, match: m[0].slice(0, 80) });
      }
    }
    PI_CLASS_RE.lastIndex = 0;
    const piMatch = PI_CLASS_RE.exec(src);
    if (piMatch) {
      violations.push({ file: path.relative(ROOT, p), kind: 'PrimeIcons CSS class (pi-*)', match: piMatch[0].slice(0, 80) });
    }
  }
}

for (const d of SCOPED_GLOBS) walk(d);

// Ratchet baseline: pre-existing violations are recorded once at A1 start.
// Each later wave reduces the baseline. A10 acceptance: baseline empty.
const BASELINE_FILE = path.join(ROOT, 'scripts/ci-guards/workspace-platform-dna-vendor-baseline.json');
let baseline = { allowed: [] };
try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { /* none yet */ }
const baselineKey = (v) => `${v.file}::${v.kind}`;
const baselineSet = new Set((baseline.allowed || []).map((e) => `${e.file}::${e.kind}`));

const newViolations    = violations.filter((v) => !baselineSet.has(baselineKey(v)));
const stillBaselined   = violations.filter((v) =>  baselineSet.has(baselineKey(v)));
const cleanedBaseline  = (baseline.allowed || []).filter(
  (e) => !violations.some((v) => baselineKey(v) === `${e.file}::${e.kind}`),
);

if (newViolations.length > 0) {
  console.error('[workspace-platform-dna-vendor-guard] FAIL — NEW non-Carbon vendor inside scoped paths:');
  for (const v of newViolations) {
    console.error(`  ${v.file}  →  ${v.kind}: ${v.match}`);
  }
  console.error(
    '\nScope: workspace surface + platform shell DNA + billing-os + @dos/ui-system.\n' +
    'Allowed UI vendor inside scope: IBM Carbon only (carbon-components-angular,\n' +
    '@carbon/icons-angular, @carbon/charts-angular). Use @dos/ui-system Dos*\n' +
    'primitives. PrimeNG / PrimeIcons / Material / Bootstrap / ng-zorro forbidden.\n',
  );
  process.exit(1);
}

if (stillBaselined.length > 0) {
  console.warn(`[workspace-platform-dna-vendor-guard] OK (with baseline) — ${stillBaselined.length} pre-existing violation(s) remain:`);
  for (const v of stillBaselined) console.warn(`  ${v.file}  →  ${v.kind}`);
  console.warn('  Final A10 acceptance requires baseline = []. Each wave must shrink, not grow.');
}
if (cleanedBaseline.length > 0) {
  console.log(`[workspace-platform-dna-vendor-guard] ${cleanedBaseline.length} baseline entry(ies) cleaned — please remove from ${path.relative(ROOT, BASELINE_FILE)}:`);
  for (const e of cleanedBaseline) console.log(`  ${e.file}  →  ${e.kind}`);
}
if (newViolations.length === 0 && stillBaselined.length === 0 && cleanedBaseline.length === 0) {
  console.log('[workspace-platform-dna-vendor-guard] OK — no non-Carbon vendor inside scoped paths (baseline empty).');
}
