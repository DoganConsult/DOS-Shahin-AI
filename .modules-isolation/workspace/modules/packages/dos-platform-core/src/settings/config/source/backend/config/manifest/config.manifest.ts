import { CONFIG_MANIFEST } from '../config.module';

export { CONFIG_MANIFEST };

export const CONFIG_MANIFEST_META = {
  code: CONFIG_MANIFEST.code,
  version: CONFIG_MANIFEST.version,
  tier: CONFIG_MANIFEST.tier,
  category: CONFIG_MANIFEST.category,
  routeBase: CONFIG_MANIFEST.routeBase,
  eventNamespace: CONFIG_MANIFEST.eventNamespace,
  tablePrefix: CONFIG_MANIFEST.tablePrefix,
  ownedTables: CONFIG_MANIFEST.ownedTables,
  publishedEvents: CONFIG_MANIFEST.publishedEvents,
  consumedEvents: CONFIG_MANIFEST.consumedEvents,
  hardDeps: CONFIG_MANIFEST.hardDeps,
  softDeps: CONFIG_MANIFEST.softDeps,
  provisioningOrder: CONFIG_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: ['config-map', 'config-validator'],
  adminSurfaces: CONFIG_MANIFEST.adminSurfaces,
  healthSignals: ['module_workflow_map_valid', 'contract_schema_present'],
} as const;
