import { ACTION_MANIFEST } from '../action.module';

export { ACTION_MANIFEST };

export const ACTION_MANIFEST_META = {
  code: ACTION_MANIFEST.code,
  version: ACTION_MANIFEST.version,
  tier: ACTION_MANIFEST.tier,
  category: ACTION_MANIFEST.category,
  routeBase: ACTION_MANIFEST.routeBase,
  eventNamespace: ACTION_MANIFEST.eventNamespace,
  tablePrefix: ACTION_MANIFEST.tablePrefix,
  ownedTables: ACTION_MANIFEST.ownedTables,
  publishedEvents: ACTION_MANIFEST.publishedEvents,
  consumedEvents: ACTION_MANIFEST.consumedEvents,
  hardDeps: ACTION_MANIFEST.hardDeps,
  softDeps: ACTION_MANIFEST.softDeps,
  provisioningOrder: ACTION_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'action-hub',
    'action-detail',
    'assignment-views',
    'recurrence-management',
    'dependency-tracker',
    'time-tracking',
    'diagnostics',
  ],
  adminSurfaces: ACTION_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_actions', 'stale_assignments', 'recurrence_integrity'],
} as const;
