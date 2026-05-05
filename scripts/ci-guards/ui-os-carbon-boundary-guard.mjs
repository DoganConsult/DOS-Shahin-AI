#!/usr/bin/env node
/**
 * ui-os-carbon-boundary-guard
 *
 * One-source rule: IBM Carbon (carbon-components-angular and the
 * @carbon/*-angular runtime packages) may be imported ONLY from inside
 * `platform/ui-system/dos-ui-system/src/carbon/`. Every other consumer
 * (products/, modules/, services/, other platform/ subtrees) must use
 * the `@dos/ui-system` wrapper barrel (DosCarbonButton, DosCarbonModal,
 * DosCarbonTabs, DosCarbonDataTable, DosCarbonHeaderShell, …).
 *
 * Why:
 *   - keeps Carbon upgrade blast radius inside one folder
 *   - guarantees permission gating goes through *dosCanRender, not
 *     hand-rolled around raw `cds-button`
 *   - lets us swap Carbon major versions without sweeping the repo
 *
 * Allowed:
 *   - `@carbon/styles` SCSS imports (theme tokens) anywhere in app SCSS
 *   - any `@carbon/*` import inside platform/ui-system/dos-ui-system/src/carbon/
 *
 * Disallowed (fails the build):
 *   - `from 'carbon-components-angular'`
 *   - `from '@carbon/icons-angular'`
 *   - `from '@carbon/charts-angular'`
 *   - any of the above via require()
 *
 * Exit code: 0 = OK, 1 = violations found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const ALLOW_DIR = path.join(
  ROOT, 'platform', 'ui-system', 'dos-ui-system', 'src', 'carbon',
);

const SCAN_ROOTS = [
  path.join(ROOT, 'products'),
  path.join(ROOT, 'modules'),
  path.join(ROOT, 'services'),
  path.join(ROOT, 'platform'),
  path.join(ROOT, 'packages'),
];

const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.angular', '.cache', '.next', '.pnpm', '.pnpm-store',
  'coverage', '_drafts', '.git',
]);

const FILE_RE = /\.(ts|tsx|mts|cts|js|mjs|cjs|html)$/;

const RUNTIME_PATTERNS = [
  /from\s+['"]carbon-components-angular['"]/g,
  /from\s+['"]carbon-components-angular\/[^'"]+['"]/g,
  /from\s+['"]@carbon\/icons-angular['"]/g,
  /from\s+['"]@carbon\/icons-angular\/[^'"]+['"]/g,
  /from\s+['"]@carbon\/charts-angular['"]/g,
  /from\s+['"]@carbon\/charts-angular\/[^'"]+['"]/g,
  /require\(\s*['"]carbon-components-angular['"]\s*\)/g,
  /require\(\s*['"]@carbon\/(?:icons|charts)-angular(?:\/[^'"]+)?['"]\s*\)/g,
];

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
    if (p.startsWith(ALLOW_DIR + path.sep)) continue;
    let src;
    try { src = fs.readFileSync(p, 'utf8'); } catch { continue; }
    for (const re of RUNTIME_PATTERNS) {
      re.lastIndex = 0;
      const m = re.exec(src);
      if (m) {
        violations.push({ file: path.relative(ROOT, p), match: m[0] });
        break;
      }
    }
  }
}

for (const r of SCAN_ROOTS) walk(r);

// Mode:
//   default = STRICT (exit 1) — all known consumers (Shahin shell + pages)
//             have been migrated to @dos/ui-system Carbon wrappers.
//   --warn (or env UI_OS_CARBON_BOUNDARY_WARN=1) = soft (exit 0) — used
//             temporarily while a new Carbon adoption is in flight.
const STRICT = !(
  process.argv.includes('--warn') ||
  process.env.UI_OS_CARBON_BOUNDARY_WARN === '1'
);

if (violations.length > 0) {
  const tag = STRICT ? 'FAIL' : 'WARN';
  const stream = STRICT ? console.error : console.warn;
  stream(`[ui-os-carbon-boundary-guard] ${tag} — Carbon runtime imported outside @dos/ui-system/carbon/:`);
  for (const v of violations) stream(`  ${v.file}  →  ${v.match}`);
  stream(
    '\nReason: one-source rule. Use @dos/ui-system Carbon wrappers instead\n' +
    '  (DosCarbonButton, DosCarbonModal, DosCarbonTabs, DosCarbonDataTable,\n' +
    '   DosCarbonHeaderShell, DosCarbonTextInput, DosCarbonSelect, DosCarbonTile,\n' +
    '   DosCarbonNotification, DosCarbonTag, DosCarbonStructuredList, DosCarbonSideNav).\n' +
    'Permission gating MUST go through *dosCanRender from @dos/ui-system, not ad-hoc *ngIf on roles.\n' +
    (STRICT ? '' : 'Soft mode (--warn / UI_OS_CARBON_BOUNDARY_WARN=1) — not failing the build.\n'),
  );
  if (STRICT) process.exit(1);
  process.exit(0);
}

console.log('[ui-os-carbon-boundary-guard] OK — no out-of-bounds Carbon imports.');
