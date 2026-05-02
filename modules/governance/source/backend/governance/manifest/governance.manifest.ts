import { GOVERNANCE_MANIFEST } from '../governance.module';

export { GOVERNANCE_MANIFEST };

export const GOVERNANCE_MANIFEST_META = {
  code: GOVERNANCE_MANIFEST.code,
  version: GOVERNANCE_MANIFEST.version,
  tier: GOVERNANCE_MANIFEST.tier,
  category: GOVERNANCE_MANIFEST.category,
  routeBase: GOVERNANCE_MANIFEST.routeBase,
  eventNamespace: GOVERNANCE_MANIFEST.eventNamespace,
  tablePrefix: GOVERNANCE_MANIFEST.tablePrefix,
  ownedTables: GOVERNANCE_MANIFEST.ownedTables,
  publishedEvents: GOVERNANCE_MANIFEST.publishedEvents,
  consumedEvents: GOVERNANCE_MANIFEST.consumedEvents,
  hardDeps: GOVERNANCE_MANIFEST.hardDeps,
  softDeps: GOVERNANCE_MANIFEST.softDeps,
  provisioningOrder: GOVERNANCE_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'governance-hub',
    'bodies-committees',
    'memberships',
    'responsibilities',
    'raci-views',
    'oversight-dashboards',
    'diagnostics',
  ],
  adminSurfaces: GOVERNANCE_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'body_integrity', 'committee_freshness'],
} as const;
