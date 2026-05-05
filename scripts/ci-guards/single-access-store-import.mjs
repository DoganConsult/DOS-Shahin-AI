#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 1 — One AccessStore.
 *
 * Verifies every TS source that imports AccessStore uses ONLY
 * '@dos/access-store'. Counts canonical vs non-canonical imports.
 */
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
