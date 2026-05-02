#!/usr/bin/env node
/**
 * ui-component-allowlist — Dynamic UI component-key allowlist guard.
 *
 * Scans contract JSON / TS files for any `componentKey: <string>` that
 * is not in the APPROVED_COMPONENT_KEYS list. New unknown keys hard-fail.
 *
 * Source of truth: platform/ui-system/dos-ui-contracts/src/component-keys.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, walk, rel } from './_ui-guard-utils.mjs';

const APPROVED = new Set([
  'AppShell', 'PageHeader', 'Tabs', 'MetricCard', 'AdaptiveCommandBar',
  'StatusBanner', 'ServiceCard', 'ChallengeCard', 'EmptyState',
  'LoadingState', 'BottomSheet', 'SideDrawer', 'AccountMenu', 'AiAssistantFab',
  'DataTable', 'GraphCanvas', 'AIWorkbenchPanel',
  // B0.2 nav primitives:
  'NavItem', 'NavSection', 'WorkspaceNav',
]);

const SCAN_ROOTS = [
  path.join(REPO_ROOT, 'modules'),
  path.join(REPO_ROOT, 'platform/dynamic-ui'),
  path.join(REPO_ROOT, 'platform/foundation'),
  path.join(REPO_ROOT, 'products/shahin-ai/app/src'),
];

const KEY_RE = /["']?componentKey["']?\s*[:=]\s*["']([A-Za-z][A-Za-z0-9_]*)["']/g;

const offenders = [];
for (const root of SCAN_ROOTS) {
  for (const file of walk(root, ['.json', '.ts'])) {
    const r = rel(file);
    if (r.includes('/dist/') || r.includes('/node_modules/')) continue;
    if (r.includes('platform/ui-system/dos-ui-contracts/') || r.includes('platform/ui-system/dos-ui-system/')) continue;
    if (r.includes('/tests/') || r.endsWith('.test.ts') || r.endsWith('.spec.ts')) continue;
    let body;
    try { body = readFileSync(file, 'utf8'); } catch { continue; }
    let m;
    while ((m = KEY_RE.exec(body)) !== null) {
      const key = m[1];
      if (!APPROVED.has(key)) offenders.push({ file: r, key });
    }
  }
}

if (offenders.length === 0) {
  // eslint-disable-next-line no-console
  console.log('[ui-guard:ui-component-allowlist] OK — only approved Dynamic UI component keys in use');
  process.exit(0);
}
// eslint-disable-next-line no-console
console.error(`[ui-guard:ui-component-allowlist] FAIL — ${offenders.length} unknown componentKey reference(s)`);
for (const o of offenders.slice(0, 50)) {
  // eslint-disable-next-line no-console
  console.error(`  ${o.file}: "${o.key}"`);
}
process.exit(1);
