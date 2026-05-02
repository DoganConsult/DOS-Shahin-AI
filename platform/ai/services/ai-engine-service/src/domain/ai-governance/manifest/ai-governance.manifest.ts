import { AI_GOVERNANCE_MANIFEST } from '../ai-governance.module';

export { AI_GOVERNANCE_MANIFEST };

export const AI_GOVERNANCE_MANIFEST_META = {
  code: AI_GOVERNANCE_MANIFEST.code,
  version: AI_GOVERNANCE_MANIFEST.version,
  tier: AI_GOVERNANCE_MANIFEST.tier,
  category: AI_GOVERNANCE_MANIFEST.category,
  routeBase: AI_GOVERNANCE_MANIFEST.routeBase,
  eventNamespace: AI_GOVERNANCE_MANIFEST.eventNamespace,
  tablePrefix: AI_GOVERNANCE_MANIFEST.tablePrefix,
  ownedTables: AI_GOVERNANCE_MANIFEST.ownedTables,
  publishedEvents: AI_GOVERNANCE_MANIFEST.publishedEvents,
  consumedEvents: AI_GOVERNANCE_MANIFEST.consumedEvents,
  hardDeps: AI_GOVERNANCE_MANIFEST.hardDeps,
  softDeps: AI_GOVERNANCE_MANIFEST.softDeps,
  provisioningOrder: AI_GOVERNANCE_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'ai-governance-hub',
    'model-registry',
    'risk-assessment',
    'bias-monitoring',
    'compliance-mapping',
    'diagnostics',
  ],
  adminSurfaces: AI_GOVERNANCE_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'model_registry_integrity', 'policy_freshness'],
} as const;
