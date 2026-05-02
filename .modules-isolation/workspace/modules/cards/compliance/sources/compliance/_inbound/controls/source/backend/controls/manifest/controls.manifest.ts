import { CONTROLS_MANIFEST } from '../controls.module';

export { CONTROLS_MANIFEST };

export const CONTROLS_MANIFEST_META = {
  code: CONTROLS_MANIFEST.code,
  version: CONTROLS_MANIFEST.version,
  tier: CONTROLS_MANIFEST.tier,
  category: CONTROLS_MANIFEST.category,
  routeBase: CONTROLS_MANIFEST.routeBase,
  eventNamespace: CONTROLS_MANIFEST.eventNamespace,
  tablePrefix: CONTROLS_MANIFEST.tablePrefix,
  ownedTables: CONTROLS_MANIFEST.ownedTables,
  publishedEvents: CONTROLS_MANIFEST.publishedEvents,
  consumedEvents: CONTROLS_MANIFEST.consumedEvents,
  hardDeps: CONTROLS_MANIFEST.hardDeps,
  softDeps: CONTROLS_MANIFEST.softDeps,
  provisioningOrder: CONTROLS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'controls-hub',
    'control-library',
    'control-detail',
    'mapping-views',
    'effectiveness-testing',
    'certification-campaigns',
    'monitoring-alerts',
    'automation-state',
    'deficiency-management',
    'diagnostics',
  ],
  adminSurfaces: CONTROLS_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'ineffective_controls', 'overdue_tests', 'ownership_gaps', 'mapping_completeness', 'monitoring_alert_count'],
} as const;
