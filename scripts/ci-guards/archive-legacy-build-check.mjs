#!/usr/bin/env node
/**
 * Optional: build packages listed under archive-ledger.json#build_excluded.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/archive-legacy-build-check.mjs [OPTIONS]

Builds packages listed under archive-ledger.json#build_excluded (proving quarantined packages still compile).

Options:
  --help, -h           Show this help message

Behavior:
  - Reads platform/docs/legacy/archive-ledger.json
  - Builds each package in build_excluded list
  - PASS if build_excluded is empty (no work needed)
  - FAIL if any build fails

Examples:
  # Run legacy build check
  node scripts/ci-guards/archive-legacy-build-check.mjs
`);
  process.exit(0);
}

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const ledgerPath = join(root, 'platform/docs/legacy/archive-ledger.json');

let ledger;
try {
  ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
} catch (e) {
  console.error('[archive-legacy-build-check] missing or invalid archive-ledger.json:', e.message);
  process.exit(1);
}

const names = ledger.build_excluded ?? [];
if (!names.length) {
  console.log('[archive-legacy-build-check] PASS — build_excluded is empty; nothing to compile.');
  process.exit(0);
}

let fail = 0;
for (const pkg of names) {
  console.log(`[archive-legacy-build-check] pnpm --filter ${JSON.stringify(pkg)} build`);
  const r = spawnSync('pnpm', ['--filter', pkg, 'run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (r.status !== 0) {
    console.error(`[archive-legacy-build-check] FAIL — package ${pkg}`);
    fail++;
  }
}
process.exit(fail ? 1 : 0);
