#!/usr/bin/env node
/**
 * Wave F6 — CI guard: assert the module-build playbook's auto-generated
 * code-reference block is in sync with the current code on disk.
 *
 * Implementation: re-run the refresher in dry mode (we just compare
 * file mtime/length-derived rows) and diff against the current file.
 *
 * Exit: 0 in sync / 1 drift detected / 2 error
 */

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
