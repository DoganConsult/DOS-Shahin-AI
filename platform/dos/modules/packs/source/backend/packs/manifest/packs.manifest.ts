/**
 * Packs -- Manifest Metadata Export
 *
 * Exposes complete manifest metadata for module registry,
 * health aggregation, and shell composition.
 *
 * @owner DOS
 * @module packs
 */

import { PACKS_MANIFEST } from '../packs.module';

export { PACKS_MANIFEST };

export const PACKS_MANIFEST_META = {
  code: PACKS_MANIFEST.code,
  version: PACKS_MANIFEST.version,
  tier: PACKS_MANIFEST.tier,
  category: PACKS_MANIFEST.category,
  routeBase: PACKS_MANIFEST.routeBase,
  eventNamespace: PACKS_MANIFEST.eventNamespace,
  tablePrefix: PACKS_MANIFEST.tablePrefix,
  ownedTables: PACKS_MANIFEST.ownedTables,
  publishedEvents: PACKS_MANIFEST.publishedEvents,
  consumedEvents: PACKS_MANIFEST.consumedEvents,
  hardDeps: PACKS_MANIFEST.hardDeps,
  softDeps: PACKS_MANIFEST.softDeps,
  provisioningOrder: PACKS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'pack-catalog',
    'pack-installation',
    'pack-compatibility',
    'pack-policy-management',
    'diagnostics',
  ],
  adminSurfaces: [
    'pack-registry',
    'pack-policy-config',
    'pack-health',
    'pack-catalog-sync',
    'pack-version-management',
  ],
  healthSignals: [
    'schema_exists',
    'tables_exist',
    'registry_has_packs',
    'no_failed_installations',
    'no_outdated_packs',
    'no_missing_dependencies',
    'no_stale_installations',
  ],
} as const;
