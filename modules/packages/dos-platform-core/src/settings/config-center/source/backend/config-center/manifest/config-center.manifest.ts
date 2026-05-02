import { CONFIG_CENTER_MANIFEST } from '../config-center.module';

export { CONFIG_CENTER_MANIFEST };

export const CONFIG_CENTER_MANIFEST_META = {
  code: CONFIG_CENTER_MANIFEST.code,
  version: CONFIG_CENTER_MANIFEST.version,
  tier: CONFIG_CENTER_MANIFEST.tier,
  category: CONFIG_CENTER_MANIFEST.category,
  routeBase: CONFIG_CENTER_MANIFEST.routeBase,
  eventNamespace: CONFIG_CENTER_MANIFEST.eventNamespace,
  tablePrefix: CONFIG_CENTER_MANIFEST.tablePrefix,
  ownedTables: CONFIG_CENTER_MANIFEST.ownedTables,
  publishedEvents: CONFIG_CENTER_MANIFEST.publishedEvents,
  consumedEvents: CONFIG_CENTER_MANIFEST.consumedEvents,
  hardDeps: CONFIG_CENTER_MANIFEST.hardDeps,
  softDeps: CONFIG_CENTER_MANIFEST.softDeps,
  provisioningOrder: CONFIG_CENTER_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: [
    'config-resolution',
    'settings-management',
    'config-audit',
    'config-health',
    'config-compare',
    'config-gateway',
    'workspace-config',
  ],
  adminSurfaces: CONFIG_CENTER_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'audit_log_integrity'],
} as const;
