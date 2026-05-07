#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 1 — One AccessStore.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/single-access-store-import.mjs [OPTIONS]

Verifies every TS source that imports AccessStore uses ONLY @dos/access-store.

Options:
  --help, -h           Show this help message

Policy:
  Canonical only: @dos/access-store
  Forbidden: platform/dauth/access/* and platform/dauth/packages/frontend/access/* imports

Exit codes:
  1 — Legacy AccessStore references detected
  0 — All imports canonical

Examples:
  # Run single access store import check
  node scripts/ci-guards/single-access-store-import.mjs
`);
  process.exit(0);
}

import { execSync } from 'node:child_process';

function grep(re) {
  try {
    return execSync(`git grep -nE ${JSON.stringify(re)} -- '*.ts' '*.tsx'`, { encoding: 'utf8' })
      .split('\n').filter(Boolean)
      .filter((l) => !l.startsWith('scripts/ci-guards/'));
  } catch { return []; }
}

const canonical = grep("from ['\"]@dos/access-store['\"]");
const accessStoreClass = grep("\\bAccessStore\\b");
const legacy = accessStoreClass.filter((l) =>
  /platform\/dauth\/access\//.test(l) ||
  /platform\/dauth\/packages\/frontend\/access\//.test(l));

if (legacy.length) {
  console.error(`[single-access-store-import] FAIL ${legacy.length} legacy AccessStore reference(s):`);
  legacy.slice(0, 10).forEach((l) => console.error('  ' + l));
  process.exit(1);
}
console.log(`[single-access-store-import] PASS ${canonical.length} canonical import(s); 0 legacy`);
