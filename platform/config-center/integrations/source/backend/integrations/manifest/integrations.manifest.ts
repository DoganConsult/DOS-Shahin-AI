import { INTEGRATIONS_MANIFEST } from '../integrations.module';

export { INTEGRATIONS_MANIFEST };

export const INTEGRATIONS_MANIFEST_META = {
  code: INTEGRATIONS_MANIFEST.code,
  version: INTEGRATIONS_MANIFEST.version,
  tier: INTEGRATIONS_MANIFEST.tier,
  category: INTEGRATIONS_MANIFEST.category,
  routeBase: INTEGRATIONS_MANIFEST.routeBase,
  eventNamespace: INTEGRATIONS_MANIFEST.eventNamespace,
  tablePrefix: INTEGRATIONS_MANIFEST.tablePrefix,
  ownedTables: INTEGRATIONS_MANIFEST.ownedTables,
  publishedEvents: INTEGRATIONS_MANIFEST.publishedEvents,
  consumedEvents: INTEGRATIONS_MANIFEST.consumedEvents,
  hardDeps: INTEGRATIONS_MANIFEST.hardDeps,
  softDeps: INTEGRATIONS_MANIFEST.softDeps,
  provisioningOrder: INTEGRATIONS_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: [
    'integrations-hub',
    'connector-registry',
    'webhook-management',
    'api-key-management',
    'sync-log',
    'diagnostics',
  ],
  adminSurfaces: INTEGRATIONS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'connector_health', 'sync_failures', 'expired_tokens', 'webhook_delivery_rate'],
} as const;
