import { WORKFLOW_MANIFEST } from '../workflow.module';

export { WORKFLOW_MANIFEST };

export const WORKFLOW_MANIFEST_META = {
  code: WORKFLOW_MANIFEST.code,
  version: WORKFLOW_MANIFEST.version,
  tier: WORKFLOW_MANIFEST.tier,
  category: WORKFLOW_MANIFEST.category,
  routeBase: WORKFLOW_MANIFEST.routeBase,
  eventNamespace: WORKFLOW_MANIFEST.eventNamespace,
  tablePrefix: WORKFLOW_MANIFEST.tablePrefix,
  ownedTables: WORKFLOW_MANIFEST.ownedTables,
  publishedEvents: Object.keys(
    (WORKFLOW_MANIFEST as any).publishedEvents ?? {},
  ),
  consumedEvents: Object.keys(
    (WORKFLOW_MANIFEST as any).consumedEvents ?? {},
  ),
  hardDeps: WORKFLOW_MANIFEST.hardDeps,
  softDeps: WORKFLOW_MANIFEST.softDeps,
  provisioningOrder: WORKFLOW_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'workflow-hub',
    'execution-detail',
    'approval-queues',
    'transition-history',
    'sla-views',
    'workflow-admin',
    'diagnostics',
  ],
  adminSurfaces: WORKFLOW_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'stuck_executions', 'sla_breaches'],
} as const;
