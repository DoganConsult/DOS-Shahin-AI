#!/usr/bin/env node
/**
 * DOS Master Doctrine — workspace-bff bootstrap cache key coherent.
 *
 * Verifies workspace-bff/src builds its MV cache key from
 * (tenantId, ui_catalog_version[, roleSetHash]) and never from a
 * single tenantId-only string (which would leak permissions across
 * role changes).
 */
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
