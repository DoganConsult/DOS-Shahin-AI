import { REPORTING_MANIFEST } from '../reporting.module';

export { REPORTING_MANIFEST };

export const REPORTING_MANIFEST_META = {
  code: REPORTING_MANIFEST.code,
  version: REPORTING_MANIFEST.version,
  tier: REPORTING_MANIFEST.tier,
  category: REPORTING_MANIFEST.category,
  routeBase: REPORTING_MANIFEST.routeBase,
  eventNamespace: REPORTING_MANIFEST.eventNamespace,
  tablePrefix: REPORTING_MANIFEST.tablePrefix,
  ownedTables: REPORTING_MANIFEST.ownedTables,
  publishedEvents: REPORTING_MANIFEST.publishedEvents,
  consumedEvents: REPORTING_MANIFEST.consumedEvents,
  hardDeps: REPORTING_MANIFEST.hardDeps,
  softDeps: REPORTING_MANIFEST.softDeps,
  provisioningOrder: REPORTING_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'reporting-hub',
    'report-catalog',
    'template-builder',
    'schedule-management',
    'export-delivery',
    'snapshot-viewer',
    'subscription-management',
    'reporting-dashboards',
    'diagnostics',
  ],
  adminSurfaces: REPORTING_MANIFEST.adminSurfaces,
  healthSignals: [
    'schema_exists',
    'tables_exist',
    'stale_snapshots',
    'overdue_schedules',
    'export_failure_rate',
    'subscription_health',
  ],
} as const;
