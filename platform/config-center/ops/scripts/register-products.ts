/**
 * @deprecated 2026-04-25 — superseded by ops/scripts/catalog-sync.ts.
 *
 * This script used to upsert only platform_dos.products_registry. It missed
 * modules_registry, product_modules, and public.product_modules — leaving
 * three of four catalog tables drifted from the manifest.
 *
 * It now delegates to catalog-sync (additive, no --prune) so existing
 * callers (platform-init.sh, runbooks, CI) keep working with the full
 * reconciler behind the scenes. Update callers to use:
 *   pnpm catalog:sync           (additive)
 *   pnpm catalog:sync:dry-run   (preview)
 *   pnpm catalog:sync:prune     (soft-retire orphans)
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

console.warn(
  '[register-products] DEPRECATED — delegating to ops/scripts/catalog-sync.ts. ' +
  'Update callers to `pnpm catalog:sync`.',
);

const result = spawnSync(
  'pnpm',
  ['exec', 'tsx', join('ops', 'scripts', 'catalog-sync.ts')],
  { stdio: 'inherit', env: process.env },
);

process.exit(result.status ?? 1);
