import { ASSET_MANIFEST } from '../asset.module';

export { ASSET_MANIFEST };

export const ASSET_MANIFEST_META = {
  code: ASSET_MANIFEST.code,
  version: ASSET_MANIFEST.version,
  tier: ASSET_MANIFEST.tier,
  category: ASSET_MANIFEST.category,
  routeBase: ASSET_MANIFEST.routeBase,
  eventNamespace: ASSET_MANIFEST.eventNamespace,
  tablePrefix: ASSET_MANIFEST.tablePrefix,
  ownedTables: ASSET_MANIFEST.ownedTables,
  publishedEvents: ASSET_MANIFEST.publishedEvents,
  consumedEvents: ASSET_MANIFEST.consumedEvents,
  hardDeps: ASSET_MANIFEST.hardDeps,
  softDeps: ASSET_MANIFEST.softDeps,
  provisioningOrder: ASSET_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'asset-inventory',
    'asset-detail',
    'classification-views',
    'dependency-maps',
    'vulnerability-tracking',
    'lifecycle-timeline',
    'criticality-dashboard',
    'diagnostics',
  ],
  adminSurfaces: ASSET_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'unclassified_assets', 'stale_scans', 'ownership_gaps', 'criticality_drift'],
} as const;
