#!/usr/bin/env node
/**
 * Wave F6 — CI guard: assert module-build playbook's auto-generated code-reference block is in sync
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/playbook-code-references-fresh.mjs [OPTIONS]

Asserts the module-build playbook's auto-generated code-reference block is in sync with current code.

Options:
  --help, -h           Show this help message

Implementation:
  Re-runs the refresher in dry mode and diffs against the current file.

Exit codes:
  0 — In sync
  1 — Drift detected
  2 — Error

Examples:
  # Run playbook code references fresh check
  node scripts/ci-guards/playbook-code-references-fresh.mjs
`);
  process.exit(0);
}

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLAYBOOK = join(ROOT, 'docs', 'module-build-playbook-d45c82.md');

if (!existsSync(PLAYBOOK)) {
  console.error('[playbook-fresh] playbook not found — run scripts/playbook/refresh-code-refs.mjs');
  process.exit(1);
}

const original = readFileSync(PLAYBOOK, 'utf8');
const backup = PLAYBOOK + '.bak';
copyFileSync(PLAYBOOK, backup);

try {
  execSync('node scripts/playbook/refresh-code-refs.mjs', { cwd: ROOT, stdio: 'pipe' });
  const refreshed = readFileSync(PLAYBOOK, 'utf8');
  if (original === refreshed) {
    console.log('[playbook-fresh] ✓ playbook code references in sync');
    unlinkSync(backup);
    process.exit(0);
  }
  // restore original to avoid silent edits in CI runs
  copyFileSync(backup, PLAYBOOK);
  unlinkSync(backup);
  console.error('[playbook-fresh] ✗ playbook code references DRIFT detected');
  console.error('[playbook-fresh] fix: run `node scripts/playbook/refresh-code-refs.mjs` and commit');
  process.exit(1);
} catch (e) {
  if (existsSync(backup)) { copyFileSync(backup, PLAYBOOK); unlinkSync(backup); }
  console.error('[playbook-fresh] error:', e.message);
  process.exit(2);
}
