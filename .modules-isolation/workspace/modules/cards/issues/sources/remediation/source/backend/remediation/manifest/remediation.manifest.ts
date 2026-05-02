import { REMEDIATION_MANIFEST } from '../remediation.module';

export { REMEDIATION_MANIFEST };

export const REMEDIATION_MANIFEST_META = {
  code: REMEDIATION_MANIFEST.code,
  version: REMEDIATION_MANIFEST.version,
  tier: REMEDIATION_MANIFEST.tier,
  category: REMEDIATION_MANIFEST.category,
  routeBase: REMEDIATION_MANIFEST.routeBase,
  eventNamespace: REMEDIATION_MANIFEST.eventNamespace,
  tablePrefix: REMEDIATION_MANIFEST.tablePrefix,
  ownedTables: REMEDIATION_MANIFEST.ownedTables,
  publishedEvents: REMEDIATION_MANIFEST.publishedEvents,
  consumedEvents: REMEDIATION_MANIFEST.consumedEvents,
  hardDeps: REMEDIATION_MANIFEST.hardDeps,
  softDeps: REMEDIATION_MANIFEST.softDeps,
  provisioningOrder: REMEDIATION_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'remediation-hub',
    'plan-detail',
    'milestone-tracking',
    'assignment-views',
    'verification-views',
    'escalation-management',
    'progress-dashboard',
    'diagnostics',
  ],
  adminSurfaces: REMEDIATION_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_actions', 'blocked_plans', 'pending_verification', 'escalation_count'],
} as const;
