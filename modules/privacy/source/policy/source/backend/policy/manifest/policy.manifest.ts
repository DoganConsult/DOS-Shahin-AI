import { POLICY_MANIFEST } from '../policy.module';

export { POLICY_MANIFEST };

export const POLICY_MANIFEST_META = {
  code: POLICY_MANIFEST.code,
  version: POLICY_MANIFEST.version,
  tier: POLICY_MANIFEST.tier,
  category: POLICY_MANIFEST.category,
  routeBase: POLICY_MANIFEST.routeBase,
  eventNamespace: POLICY_MANIFEST.eventNamespace,
  tablePrefix: POLICY_MANIFEST.tablePrefix,
  ownedTables: POLICY_MANIFEST.ownedTables,
  publishedEvents: POLICY_MANIFEST.publishedEvents,
  consumedEvents: POLICY_MANIFEST.consumedEvents,
  hardDeps: POLICY_MANIFEST.hardDeps,
  softDeps: POLICY_MANIFEST.softDeps,
  provisioningOrder: POLICY_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'policy-hub',
    'policy-detail',
    'review-cycles',
    'version-management',
    'acknowledgement-tracking',
    'drift-detection',
    'impact-assessment',
    'distribution-management',
    'diagnostics',
  ],
  adminSurfaces: POLICY_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_reviews', 'pending_acknowledgements', 'drift_events', 'expired_policies'],
} as const;
