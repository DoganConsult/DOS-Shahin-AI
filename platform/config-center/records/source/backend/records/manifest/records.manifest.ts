import { RECORDS_MANIFEST } from '../records.module';

export { RECORDS_MANIFEST };

export const RECORDS_MANIFEST_META = {
  code: RECORDS_MANIFEST.code,
  version: RECORDS_MANIFEST.version,
  tier: RECORDS_MANIFEST.tier,
  category: RECORDS_MANIFEST.category,
  routeBase: RECORDS_MANIFEST.routeBase,
  eventNamespace: RECORDS_MANIFEST.eventNamespace,
  tablePrefix: RECORDS_MANIFEST.tablePrefix,
  ownedTables: RECORDS_MANIFEST.ownedTables,
  publishedEvents: RECORDS_MANIFEST.publishedEvents,
  consumedEvents: RECORDS_MANIFEST.consumedEvents,
  hardDeps: RECORDS_MANIFEST.hardDeps,
  softDeps: RECORDS_MANIFEST.softDeps,
  provisioningOrder: RECORDS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'records-hub',
    'record-detail',
    'retention-policies',
    'legal-holds',
    'classification-views',
    'disposal-management',
    'diagnostics',
  ],
  adminSurfaces: RECORDS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_disposals', 'active_holds', 'retention_policy_coverage', 'unclassified_records'],
} as const;
