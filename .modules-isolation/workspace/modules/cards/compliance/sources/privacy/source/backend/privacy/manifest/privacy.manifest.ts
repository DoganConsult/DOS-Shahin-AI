import { PRIVACY_MANIFEST } from '../privacy.module';

export { PRIVACY_MANIFEST };

export const PRIVACY_MANIFEST_META = {
  code: PRIVACY_MANIFEST.code,
  version: PRIVACY_MANIFEST.version,
  tier: PRIVACY_MANIFEST.tier,
  category: PRIVACY_MANIFEST.category,
  routeBase: PRIVACY_MANIFEST.routeBase,
  eventNamespace: PRIVACY_MANIFEST.eventNamespace,
  tablePrefix: PRIVACY_MANIFEST.tablePrefix,
  ownedTables: PRIVACY_MANIFEST.ownedTables,
  publishedEvents: PRIVACY_MANIFEST.publishedEvents,
  consumedEvents: PRIVACY_MANIFEST.consumedEvents,
  hardDeps: PRIVACY_MANIFEST.hardDeps,
  softDeps: PRIVACY_MANIFEST.softDeps,
  provisioningOrder: PRIVACY_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'privacy-hub',
    'dsr-management',
    'pia-views',
    'consent-records',
    'data-maps',
    'breach-handling',
    'transfer-impact',
    'diagnostics',
  ],
  adminSurfaces: PRIVACY_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_dsrs', 'pending_pias', 'breach_count', 'consent_freshness'],
} as const;
