import { PORTALS_MANIFEST } from '../portals.module';

export { PORTALS_MANIFEST };

export const PORTALS_MANIFEST_META = {
  code: PORTALS_MANIFEST.code,
  version: PORTALS_MANIFEST.version,
  tier: PORTALS_MANIFEST.tier,
  category: PORTALS_MANIFEST.category,
  routeBase: PORTALS_MANIFEST.routeBase,
  eventNamespace: PORTALS_MANIFEST.eventNamespace,
  tablePrefix: PORTALS_MANIFEST.tablePrefix,
  ownedTables: PORTALS_MANIFEST.ownedTables,
  publishedEvents: PORTALS_MANIFEST.publishedEvents,
  consumedEvents: PORTALS_MANIFEST.consumedEvents,
  hardDeps: PORTALS_MANIFEST.hardDeps,
  softDeps: PORTALS_MANIFEST.softDeps,
  provisioningOrder: PORTALS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'portals-hub',
    'portal-config',
    'access-management',
    'page-builder',
    'token-management',
    'diagnostics',
  ],
  adminSurfaces: PORTALS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'expired_tokens', 'active_sessions', 'pending_invitations'],
} as const;
