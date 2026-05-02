import { CONNECTORS_MANIFEST } from '../connectors.module';

export { CONNECTORS_MANIFEST };

export const CONNECTORS_MANIFEST_META = {
  code: CONNECTORS_MANIFEST.code,
  version: CONNECTORS_MANIFEST.version,
  tier: CONNECTORS_MANIFEST.tier,
  category: CONNECTORS_MANIFEST.category,
  routeBase: CONNECTORS_MANIFEST.routeBase,
  eventNamespace: CONNECTORS_MANIFEST.eventNamespace,
  tablePrefix: CONNECTORS_MANIFEST.tablePrefix,
  ownedTables: CONNECTORS_MANIFEST.ownedTables,
  publishedEvents: CONNECTORS_MANIFEST.publishedEvents,
  consumedEvents: CONNECTORS_MANIFEST.consumedEvents,
  hardDeps: CONNECTORS_MANIFEST.hardDeps,
  softDeps: CONNECTORS_MANIFEST.softDeps,
  provisioningOrder: CONNECTORS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'connector-registry',
    'connector-credentials',
    'connector-invocation-log',
  ],
  adminSurfaces: CONNECTORS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'credentials_valid', 'recent_invocation_success_rate'],
} as const;
