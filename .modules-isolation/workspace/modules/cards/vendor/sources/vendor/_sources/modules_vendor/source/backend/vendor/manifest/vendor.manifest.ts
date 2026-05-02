import { VENDOR_MANIFEST } from '../vendor.module';

export { VENDOR_MANIFEST };

export const VENDOR_MANIFEST_META = {
  code: VENDOR_MANIFEST.code,
  version: VENDOR_MANIFEST.version,
  tier: VENDOR_MANIFEST.tier,
  category: VENDOR_MANIFEST.category,
  routeBase: VENDOR_MANIFEST.routeBase,
  eventNamespace: VENDOR_MANIFEST.eventNamespace,
  tablePrefix: VENDOR_MANIFEST.tablePrefix,
  ownedTables: VENDOR_MANIFEST.ownedTables,
  publishedEvents: VENDOR_MANIFEST.publishedEvents,
  consumedEvents: VENDOR_MANIFEST.consumedEvents,
  hardDeps: VENDOR_MANIFEST.hardDeps,
  softDeps: VENDOR_MANIFEST.softDeps,
  provisioningOrder: VENDOR_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'vendor-hub',
    'vendor-detail',
    'due-diligence',
    'engagement-scoring',
    'fourth-party-risk',
    'sla-management',
    'concentration-analysis',
    'portal-access',
    'questionnaire-management',
    'offboarding',
    'diagnostics',
  ],
  adminSurfaces: VENDOR_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_dd', 'sla_breaches', 'high_risk_vendors', 'concentration_alerts', 'expired_contracts', 'stale_assessments'],
} as const;
