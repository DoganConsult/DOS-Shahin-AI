import { COMPLIANCE_MANIFEST } from '../compliance.module';

export { COMPLIANCE_MANIFEST };

export const COMPLIANCE_MANIFEST_META = {
  code: COMPLIANCE_MANIFEST.code,
  version: COMPLIANCE_MANIFEST.version,
  tier: COMPLIANCE_MANIFEST.tier,
  category: COMPLIANCE_MANIFEST.category,
  routeBase: COMPLIANCE_MANIFEST.routeBase,
  eventNamespace: COMPLIANCE_MANIFEST.eventNamespace,
  tablePrefix: COMPLIANCE_MANIFEST.tablePrefix,
  ownedTables: COMPLIANCE_MANIFEST.ownedTables,
  publishedEvents: COMPLIANCE_MANIFEST.publishedEvents,
  consumedEvents: COMPLIANCE_MANIFEST.consumedEvents,
  hardDeps: COMPLIANCE_MANIFEST.hardDeps,
  softDeps: COMPLIANCE_MANIFEST.softDeps,
  provisioningOrder: COMPLIANCE_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'compliance-hub',
    'framework-mapping',
    'obligation-tracking',
    'assessment-runtime',
    'gap-visibility',
    'attestation-campaigns',
    'compliance-dashboards',
    'diagnostics',
  ],
  adminSurfaces: COMPLIANCE_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'framework_integrity', 'assessment_freshness'],
} as const;
