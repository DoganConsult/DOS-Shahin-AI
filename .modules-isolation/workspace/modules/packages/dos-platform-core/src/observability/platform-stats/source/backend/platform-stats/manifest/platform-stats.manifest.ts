import { PLATFORM_STATS_MANIFEST } from '../platform-stats.module';

export { PLATFORM_STATS_MANIFEST };

export const PLATFORM_STATS_MANIFEST_META = {
  code: PLATFORM_STATS_MANIFEST.code,
  version: PLATFORM_STATS_MANIFEST.version,
  tier: PLATFORM_STATS_MANIFEST.tier,
  category: PLATFORM_STATS_MANIFEST.category,
  routeBase: PLATFORM_STATS_MANIFEST.routeBase,
  eventNamespace: PLATFORM_STATS_MANIFEST.eventNamespace,
  tablePrefix: PLATFORM_STATS_MANIFEST.tablePrefix,
  ownedTables: PLATFORM_STATS_MANIFEST.ownedTables,
  publishedEvents: PLATFORM_STATS_MANIFEST.publishedEvents,
  consumedEvents: PLATFORM_STATS_MANIFEST.consumedEvents,
  hardDeps: PLATFORM_STATS_MANIFEST.hardDeps,
  softDeps: PLATFORM_STATS_MANIFEST.softDeps,
  provisioningOrder: PLATFORM_STATS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'platform-stats-config',
    'metrics-dashboard',
    'kpi-trends',
    'anomaly-alerts',
  ],
  adminSurfaces: PLATFORM_STATS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'metric_ingest_lag', 'kpi_computation_staleness'],
} as const;
