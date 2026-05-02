import { BCP_MANIFEST } from '../bcp.module';

export { BCP_MANIFEST };

export const BCP_MANIFEST_META = {
  code: BCP_MANIFEST.code,
  version: BCP_MANIFEST.version,
  tier: BCP_MANIFEST.tier,
  category: BCP_MANIFEST.category,
  routeBase: BCP_MANIFEST.routeBase,
  eventNamespace: BCP_MANIFEST.eventNamespace,
  tablePrefix: BCP_MANIFEST.tablePrefix,
  ownedTables: BCP_MANIFEST.ownedTables,
  publishedEvents: BCP_MANIFEST.publishedEvents,
  consumedEvents: BCP_MANIFEST.consumedEvents,
  hardDeps: BCP_MANIFEST.hardDeps,
  softDeps: BCP_MANIFEST.softDeps,
  provisioningOrder: BCP_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'bcp-hub',
    'plan-detail',
    'impact-analysis',
    'crisis-management',
    'exercise-management',
    'recovery-objectives',
    'dependency-maps',
    'lessons-learned',
    'maturity-assessment',
    'diagnostics',
  ],
  adminSurfaces: BCP_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'stale_plans', 'overdue_exercises', 'recovery_objective_breaches', 'untested_plans'],
} as const;
