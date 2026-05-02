import { QUALITY_GATE_MANIFEST } from '../quality-gate.module';

export { QUALITY_GATE_MANIFEST };

export const QUALITY_GATE_MANIFEST_META = {
  code: QUALITY_GATE_MANIFEST.code,
  version: QUALITY_GATE_MANIFEST.version,
  tier: QUALITY_GATE_MANIFEST.tier,
  category: QUALITY_GATE_MANIFEST.category,
  routeBase: QUALITY_GATE_MANIFEST.routeBase,
  eventNamespace: QUALITY_GATE_MANIFEST.eventNamespace,
  tablePrefix: QUALITY_GATE_MANIFEST.tablePrefix,
  ownedTables: QUALITY_GATE_MANIFEST.ownedTables,
  publishedEvents: QUALITY_GATE_MANIFEST.publishedEvents,
  consumedEvents: QUALITY_GATE_MANIFEST.consumedEvents,
  hardDeps: QUALITY_GATE_MANIFEST.hardDeps,
  softDeps: QUALITY_GATE_MANIFEST.softDeps,
  provisioningOrder: QUALITY_GATE_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'quality-gate-runs',
    'quality-gate-stages',
    'quality-gate-thresholds',
    'quality-gate-reports',
  ],
  adminSurfaces: QUALITY_GATE_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'gate_run_success_rate', 'drift_detection_active'],
} as const;
