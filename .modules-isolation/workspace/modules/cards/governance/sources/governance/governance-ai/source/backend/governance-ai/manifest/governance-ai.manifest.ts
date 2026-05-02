import { GOVERNANCE_AI_MANIFEST } from '../governance_ai.module';

export { GOVERNANCE_AI_MANIFEST };

export const GOVERNANCE_AI_MANIFEST_META = {
  code: GOVERNANCE_AI_MANIFEST.code,
  version: GOVERNANCE_AI_MANIFEST.version,
  tier: GOVERNANCE_AI_MANIFEST.tier,
  category: GOVERNANCE_AI_MANIFEST.category,
  routeBase: GOVERNANCE_AI_MANIFEST.routeBase,
  eventNamespace: GOVERNANCE_AI_MANIFEST.eventNamespace,
  tablePrefix: GOVERNANCE_AI_MANIFEST.tablePrefix,
  ownedTables: GOVERNANCE_AI_MANIFEST.ownedTables,
  publishedEvents: GOVERNANCE_AI_MANIFEST.publishedEvents,
  consumedEvents: GOVERNANCE_AI_MANIFEST.consumedEvents,
  hardDeps: GOVERNANCE_AI_MANIFEST.hardDeps,
  softDeps: GOVERNANCE_AI_MANIFEST.softDeps,
  provisioningOrder: GOVERNANCE_AI_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'governance-ai-hub',
    'signal-detection',
    'interpretation-views',
    'escalation-views',
    'narrative-generation',
    'health-snapshots',
    'score-explanations',
    'pipeline-monitor',
    'diagnostics',
  ],
  adminSurfaces: GOVERNANCE_AI_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'pipeline_healthy', 'signal_backlog', 'stale_health_snapshots', 'model_drift'],
} as const;
