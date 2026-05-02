import { QIYAS_MANIFEST } from '../qiyas.module';

export { QIYAS_MANIFEST };

export const QIYAS_MANIFEST_META = {
  code: QIYAS_MANIFEST.code,
  version: QIYAS_MANIFEST.version,
  tier: QIYAS_MANIFEST.tier,
  category: QIYAS_MANIFEST.category,
  routeBase: QIYAS_MANIFEST.routeBase,
  eventNamespace: QIYAS_MANIFEST.eventNamespace,
  tablePrefix: QIYAS_MANIFEST.tablePrefix,
  ownedTables: QIYAS_MANIFEST.ownedTables,
  publishedEvents: QIYAS_MANIFEST.publishedEvents,
  consumedEvents: QIYAS_MANIFEST.consumedEvents,
  hardDeps: QIYAS_MANIFEST.hardDeps,
  softDeps: QIYAS_MANIFEST.softDeps,
  provisioningOrder: QIYAS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'qiyas-hub',
    'maturity-assessment',
    'benchmark-views',
    'capability-scores',
    'gap-analysis',
    'roadmap-planning',
    'strategy-direction',
    'trend-analysis',
    'diagnostics',
  ],
  adminSurfaces: QIYAS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'stale_assessments', 'overdue_roadmap_items', 'benchmark_freshness', 'gap_resolution_rate'],
} as const;
