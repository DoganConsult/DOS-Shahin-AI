import { ANALYTICS_MANIFEST } from '../analytics.module';

export { ANALYTICS_MANIFEST };

export const ANALYTICS_MANIFEST_META = {
  code: ANALYTICS_MANIFEST.code,
  version: ANALYTICS_MANIFEST.version,
  tier: ANALYTICS_MANIFEST.tier,
  category: ANALYTICS_MANIFEST.category,
  routeBase: ANALYTICS_MANIFEST.routeBase,
  eventNamespace: ANALYTICS_MANIFEST.eventNamespace,
  tablePrefix: ANALYTICS_MANIFEST.tablePrefix,
  ownedTables: ANALYTICS_MANIFEST.ownedTables,
  publishedEvents: ANALYTICS_MANIFEST.publishedEvents,
  consumedEvents: ANALYTICS_MANIFEST.consumedEvents,
  hardDeps: ANALYTICS_MANIFEST.hardDeps,
  softDeps: ANALYTICS_MANIFEST.softDeps,
  provisioningOrder: ANALYTICS_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: [
    'analytics-hub',
    'custom-dashboards',
    'metric-explorer',
    'dataset-management',
    'snapshot-views',
    'diagnostics',
  ],
  adminSurfaces: ANALYTICS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'refresh_schedule_healthy', 'stale_snapshots', 'cache_freshness'],
} as const;
