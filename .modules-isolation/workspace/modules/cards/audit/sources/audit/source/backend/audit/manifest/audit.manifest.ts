import { AUDIT_MANIFEST } from '../audit.module';

export { AUDIT_MANIFEST };

export const AUDIT_MANIFEST_META = {
  code: AUDIT_MANIFEST.code,
  version: AUDIT_MANIFEST.version,
  tier: AUDIT_MANIFEST.tier,
  category: AUDIT_MANIFEST.category,
  routeBase: AUDIT_MANIFEST.routeBase,
  eventNamespace: AUDIT_MANIFEST.eventNamespace,
  tablePrefix: AUDIT_MANIFEST.tablePrefix,
  ownedTables: AUDIT_MANIFEST.ownedTables,
  publishedEvents: AUDIT_MANIFEST.publishedEvents,
  consumedEvents: AUDIT_MANIFEST.consumedEvents,
  hardDeps: AUDIT_MANIFEST.hardDeps,
  softDeps: AUDIT_MANIFEST.softDeps,
  provisioningOrder: AUDIT_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'audit-hub',
    'audit-universe',
    'audit-planning',
    'audit-execution',
    'finding-management',
    'working-papers',
    'audit-reporting',
    'diagnostics',
  ],
  adminSurfaces: AUDIT_MANIFEST.adminSurfaces,
  healthSignals: [
    'schema_exists',
    'tables_exist',
    'open_findings_count',
    'overdue_findings',
    'stale_universe_entries',
    'workpaper_completion_rate',
  ],
} as const;
