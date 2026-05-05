#!/usr/bin/env node
/**
 * ui-no-raw-shell-in-product (B0.2)
 *
 * Fails when a product Angular file declares a component whose `selector`
 * shadows a UI-OS primitive owned by `@dos/ui-system`. Products MUST
 * consume the canonical UI primitive instead of reimplementing it locally.
 *
 * Scope: products/<product>/app/src/**\/*.ts
 *
 * Forbidden selectors:
 *   - app-page-header              → use <dos-page-header>
 *   - app-page-shell               → use <dos-app-shell>
 *   - app-app-shell                → use <dos-app-shell>
 *   - app-workspace-shell-*        → keep `app-workspace-shell` itself (allowed product composition);
 *                                    reject any *-shell child selectors that re-implement UI-OS shell
 *   - app-metric-card              → use <dos-metric-card>
 *   - app-service-card             → use <dos-service-card>
 *   - app-empty-state              → use <dos-empty-state>
 *   - app-loading-state            → use <dos-loading-state>
 *   - app-status-banner            → use <dos-status-banner>
 *   - app-tabs                     → use <dos-tabs>
 *   - app-side-drawer              → use <dos-side-drawer>
 *   - app-bottom-sheet             → use <dos-bottom-sheet>
 *   - app-account-menu             → use <dos-account-menu>
 *   - app-mobile-bottom-nav        → use <dos-mobile-bottom-nav>
 *   - app-mobile-drawer            → use <dos-mobile-drawer>
 *   - app-desktop-sidebar          → use <dos-desktop-sidebar>
 *   - app-workspace-header         → use <dos-workspace-header>
 *   - app-workspace-nav            → use <dos-workspace-nav>
 *   - app-nav-item                 → use <dos-nav-item>
 *   - app-nav-section              → use <dos-nav-section>
 *   - app-responsive-grid          → use <dos-responsive-grid>
 *   - app-adaptive-command-bar     → use <dos-adaptive-command-bar>
 *
 * Allowed product compositions (NOT shadows):
 *   - app-workspace-shell          (product shell adapter — composes UI-OS only)
 *   - app-profile, app-settings, app-tenant-profile, app-tenant-settings,
 *     app-workspace-home           (product pages)
 *
 * Exit codes:
 *   0  no offenders
 *   1  one or more offenders
 *   2  harness error
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, rel } from './_ui-guard-utils.mjs';

const GUARD = 'ui-no-raw-shell-in-product';

const FORBIDDEN_SELECTORS = new Set([
  'app-page-header',
  'app-page-shell',
  'app-app-shell',
  'app-metric-card',
  'app-service-card',
  'app-empty-state',
  'app-loading-state',
  'app-status-banner',
  'app-tabs',
  'app-side-drawer',
  'app-bottom-sheet',
  'app-account-menu',
  'app-mobile-bottom-nav',
  'app-mobile-drawer',
  'app-desktop-sidebar',
  'app-workspace-header',
  'app-workspace-nav',
  'app-nav-item',
  'app-nav-section',
  'app-responsive-grid',
  'app-adaptive-command-bar',
  'app-challenge-card',
  'app-ai-assistant-fab',
  'app-desktop-dialog',
]);

const SCAN_ROOTS = [
  path.join(REPO_ROOT, 'products'),
];

const SELECTOR_RE = /selector\s*:\s*['"`]([^'"`]+)['"`]/g;

const offenders = [];

for (const root of SCAN_ROOTS) {
  for (const file of walk(root, ['.ts'])) {
    const r = rel(file);
    if (!r.match(/products\/[^/]+\/app\/src\//)) continue;
    if (r.includes('/dist/') || r.includes('/node_modules/')) continue;
    if (r.includes('/.angular/')) continue;
    if (r.endsWith('.test.ts') || r.endsWith('.spec.ts') || r.endsWith('.pbt.ts')) continue;

    let body;
    try { body = readFileSync(file, 'utf8'); } catch { continue; }

    SELECTOR_RE.lastIndex = 0;
    let m;
    while ((m = SELECTOR_RE.exec(body)) !== null) {
      const sel = m[1].trim();
      if (FORBIDDEN_SELECTORS.has(sel)) {
        offenders.push({ file: r, selector: sel });
      }
    }
  }
}

if (offenders.length === 0) {
  // eslint-disable-next-line no-console
  console.log(`[ui-guard:${GUARD}] OK — no product files reimplement UI-OS primitive selectors`);
  process.exit(0);
}

// eslint-disable-next-line no-console
console.error(`[ui-guard:${GUARD}] FAIL — ${offenders.length} product file(s) reimplement UI-OS primitives`);
for (const o of offenders.slice(0, 50)) {
  // eslint-disable-next-line no-console
  console.error(`  ${o.file}: selector="${o.selector}" — replace with the @dos/ui-system equivalent`);
}
if (offenders.length > 50) {
  // eslint-disable-next-line no-console
  console.error(`  …and ${offenders.length - 50} more`);
}
process.exit(1);
