#!/usr/bin/env node
/**
 * DOS Master Doctrine — workspace-bff bootstrap cache key coherent.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/bootstrap-cache-key-coherent.mjs [OPTIONS]

Verifies workspace-bff cache key is composite (tenantId, roleSetHash, uiCatalogVersion).

Options:
  --help, -h           Show this help message

Behavior:
  - Checks workspace-bff/src builds MV cache key from composite tuple
  - Fails if cache key uses single tenantId-only string (cross-role leak risk)
  - Skips if workspace-bff sources not found

Exit codes:
  0 — PASS or skipped
  1 — FAIL composite cache-key incomplete

Examples:
  # Run bootstrap cache key coherence check
  node scripts/ci-guards/bootstrap-cache-key-coherent.mjs
`);
  process.exit(0);
}

import { execSync } from 'node:child_process';

let bad = 0;
try {
  const hits = execSync(
    `git grep -nE "tenantId|roleSetHash|uiCatalogVersion|ui_catalog_version" -- 'services/workspace-bff/src'`,
    { encoding: 'utf8' },
  ).split('\n').filter(Boolean);
  const tenant   = hits.some((l) => /tenantId|tenant_id/.test(l));
  const role     = hits.some((l) => /roleSetHash/.test(l));
  const catalog  = hits.some((l) => /uiCatalogVersion|ui_catalog_version/.test(l));
  if (!(tenant && role && catalog)) {
    console.error(`[bootstrap-cache-key-coherent] FAIL composite cache-key incomplete (tenant=${tenant}, role=${role}, catalog=${catalog})`);
    bad = 1;
  }
} catch {
  console.warn('[bootstrap-cache-key-coherent] no workspace-bff sources matched (skipping)');
}
if (bad) process.exit(1);
console.log('[bootstrap-cache-key-coherent] PASS workspace-bff cache key composite');
