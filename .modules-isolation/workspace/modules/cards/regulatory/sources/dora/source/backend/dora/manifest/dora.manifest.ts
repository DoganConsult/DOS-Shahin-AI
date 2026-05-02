import { DORA_MANIFEST } from '../dora.module';

export { DORA_MANIFEST };

export const DORA_MANIFEST_META = {
  code: DORA_MANIFEST.code,
  version: DORA_MANIFEST.version,
  tier: DORA_MANIFEST.tier,
  category: DORA_MANIFEST.category,
  routeBase: DORA_MANIFEST.routeBase,
  eventNamespace: DORA_MANIFEST.eventNamespace,
  tablePrefix: DORA_MANIFEST.tablePrefix,
  ownedTables: DORA_MANIFEST.ownedTables,
  publishedEvents: DORA_MANIFEST.publishedEvents,
  consumedEvents: DORA_MANIFEST.consumedEvents,
  hardDeps: DORA_MANIFEST.hardDeps,
  softDeps: DORA_MANIFEST.softDeps,
  provisioningOrder: DORA_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'dora-hub',
    'ict-asset-register',
    'resilience-testing',
    'major-incident-reporting',
    'threat-intelligence',
    'third-party-oversight',
    'recovery-plans',
    'diagnostics',
  ],
  adminSurfaces: DORA_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_resilience_tests', 'unresolved_major_incidents', 'backup_verification_status', 'concentration_risk_alerts'],
} as const;
