#!/usr/bin/env node
/**
 * Phase WS-6 — workspace-shell-coverage gate.
 *
 * Asserts that the 10 workspace.* component_keys registered in
 * dos.dynamic_ui_component_registry by 20260504_0010_workspace_shell_registry.sql
 * each have:
 *   1. A corresponding selector-shipping component file under
 *      platform/ui-system/dos-ui-system/src/shell/
 *   2. A barrel re-export from platform/ui-system/dos-ui-system/src/index.ts
 *   3. An entry in WORKSPACE_SHELL_KEYS const in workspace-shell.contracts.ts
 *
 * Read-only static check (no DB).
 *
 * Set WORKSPACE_SHELL_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHELL_DIR = join(REPO, 'platform/ui-system/dos-ui-system/src/shell');
const BARREL = join(REPO, 'platform/ui-system/dos-ui-system/src/index.ts');
const CONTRACTS = join(SHELL_DIR, 'workspace-shell.contracts.ts');
const REG_MIG = join(REPO, 'platform/dos/migrations/public/20260504_0010_workspace_shell_registry.sql');

const SURFACES = [
  { key: 'workspace.header',         selector: 'dos-workspace-header' },
  { key: 'workspace.sidebar',        selector: 'dos-workspace-sidebar' },
  { key: 'workspace.mobile-nav',     selector: 'dos-mobile-bottom-nav' },
  { key: 'workspace.command-search', selector: 'dos-command-search' },
  { key: 'workspace.status-bar',     selector: 'dos-workspace-status-bar' },
  { key: 'workspace.action-queue',   selector: 'dos-action-queue' },
  { key: 'workspace.agent-strip',    selector: 'dos-agent-activity-strip' },
  { key: 'workspace.inbox-center',   selector: 'dos-inbox-center' },
  { key: 'workspace.context-panel',  selector: 'dos-context-panel' },
  { key: 'workspace.quick-create',   selector: 'dos-quick-create' },
];

const failures = [];

if (!existsSync(SHELL_DIR)) {
  console.error('[workspace-shell-coverage] missing shell dir');
  process.exit(1);
}

const shellFiles = readdirSync(SHELL_DIR).filter(f => f.endsWith('.ts'));
const shellSrc = Object.fromEntries(
  shellFiles.map(f => [f, readFileSync(join(SHELL_DIR, f), 'utf8')]),
);
const barrelSrc = existsSync(BARREL) ? readFileSync(BARREL, 'utf8') : '';
const contractsSrc = existsSync(CONTRACTS) ? readFileSync(CONTRACTS, 'utf8') : '';
const migSrc = existsSync(REG_MIG) ? readFileSync(REG_MIG, 'utf8') : '';

for (const s of SURFACES) {
  // 1. selector exists in shell src
  const hasSelector = Object.values(shellSrc).some(src =>
    src.includes(`selector: '${s.selector}'`),
  );
  if (!hasSelector) failures.push({ key: s.key, reason: `no component declares selector '${s.selector}' under src/shell/` });

  // 2. WORKSPACE_SHELL_KEYS contains the key
  if (!contractsSrc.includes(`'${s.key}'`)) {
    failures.push({ key: s.key, reason: 'missing from WORKSPACE_SHELL_KEYS const' });
  }

  // 3. registry migration mentions the key
  if (!migSrc.includes(`'${s.key}'`)) {
    failures.push({ key: s.key, reason: 'missing from 20260504_0010 registry migration' });
  }

  // 4. barrel re-exports the file containing the selector
  const owner = Object.entries(shellSrc).find(([, src]) =>
    src.includes(`selector: '${s.selector}'`),
  );
  if (owner) {
    const fileNoExt = owner[0].replace(/\.ts$/, '');
    if (!barrelSrc.includes(`./shell/${fileNoExt}`)) {
      failures.push({ key: s.key, reason: `barrel index.ts does not re-export ./shell/${fileNoExt}` });
    }
  }
}

const enforce = process.env.WORKSPACE_SHELL_COVERAGE_ENFORCE === '1';
console.log(`[workspace-shell-coverage] surfaces=${SURFACES.length} failures=${failures.length}`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f.key} — ${f.reason}`);
  if (enforce) process.exit(1);
  console.error('[workspace-shell-coverage] SHADOW (set WORKSPACE_SHELL_COVERAGE_ENFORCE=1 to fail CI).');
  process.exit(0);
}
console.log('[workspace-shell-coverage] PASS — every workspace.* surface has selector + barrel + contract + migration entry.');
process.exit(0);
