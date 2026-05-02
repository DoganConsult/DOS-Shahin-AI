import { PROACTIVE_LEADERSHIP_MANIFEST } from '../proactive-leadership.module';

export { PROACTIVE_LEADERSHIP_MANIFEST };

export const PROACTIVE_LEADERSHIP_MANIFEST_META = {
  code: PROACTIVE_LEADERSHIP_MANIFEST.code,
  version: PROACTIVE_LEADERSHIP_MANIFEST.version,
  tier: PROACTIVE_LEADERSHIP_MANIFEST.tier,
  category: PROACTIVE_LEADERSHIP_MANIFEST.category,
  routeBase: PROACTIVE_LEADERSHIP_MANIFEST.routeBase,
  eventNamespace: PROACTIVE_LEADERSHIP_MANIFEST.eventNamespace,
  tablePrefix: PROACTIVE_LEADERSHIP_MANIFEST.tablePrefix,
  ownedTables: PROACTIVE_LEADERSHIP_MANIFEST.ownedTables,
  publishedEvents: PROACTIVE_LEADERSHIP_MANIFEST.publishedEvents,
  consumedEvents: PROACTIVE_LEADERSHIP_MANIFEST.consumedEvents,
  hardDeps: PROACTIVE_LEADERSHIP_MANIFEST.hardDeps,
  softDeps: PROACTIVE_LEADERSHIP_MANIFEST.softDeps,
  provisioningOrder: PROACTIVE_LEADERSHIP_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: [
    'leadership-hub',
    'executive-dashboard',
    'insight-views',
    'alert-management',
    'diagnostics',
  ],
  adminSurfaces: PROACTIVE_LEADERSHIP_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'insight_freshness', 'unacknowledged_alerts'],
} as const;
