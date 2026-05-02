import { RISK_MANIFEST } from '../risk.module';

export { RISK_MANIFEST };

export const RISK_MANIFEST_META = {
  code: RISK_MANIFEST.code,
  version: RISK_MANIFEST.version,
  tier: RISK_MANIFEST.tier,
  category: RISK_MANIFEST.category,
  routeBase: RISK_MANIFEST.routeBase,
  eventNamespace: RISK_MANIFEST.eventNamespace,
  tablePrefix: RISK_MANIFEST.tablePrefix,
  ownedTables: RISK_MANIFEST.ownedTables,
  publishedEvents: RISK_MANIFEST.publishedEvents,
  consumedEvents: RISK_MANIFEST.consumedEvents,
  hardDeps: RISK_MANIFEST.hardDeps,
  softDeps: RISK_MANIFEST.softDeps,
  provisioningOrder: RISK_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'risk-register',
    'risk-assessment-wizard',
    'risk-treatment-plans',
    'kri-dashboard',
    'risk-appetite-config',
    'risk-scenarios',
    'bowtie-view',
    'risk-reporting',
    'diagnostics',
  ],
  adminSurfaces: RISK_MANIFEST.adminSurfaces,
  healthSignals: [
    'schema_exists',
    'tables_exist',
    'stale_assessments',
    'kri_breach_count',
    'overdue_treatments',
    'appetite_config_integrity',
  ],
} as const;
