import { INCIDENT_MANIFEST } from '../incident.module';

export { INCIDENT_MANIFEST };

export const INCIDENT_MANIFEST_META = {
  code: INCIDENT_MANIFEST.code,
  version: INCIDENT_MANIFEST.version,
  tier: INCIDENT_MANIFEST.tier,
  category: INCIDENT_MANIFEST.category,
  routeBase: INCIDENT_MANIFEST.routeBase,
  eventNamespace: INCIDENT_MANIFEST.eventNamespace,
  tablePrefix: INCIDENT_MANIFEST.tablePrefix,
  ownedTables: INCIDENT_MANIFEST.ownedTables,
  publishedEvents: INCIDENT_MANIFEST.publishedEvents,
  consumedEvents: INCIDENT_MANIFEST.consumedEvents,
  hardDeps: INCIDENT_MANIFEST.hardDeps,
  softDeps: INCIDENT_MANIFEST.softDeps,
  provisioningOrder: INCIDENT_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'incident-hub',
    'incident-detail',
    'triage-views',
    'war-room',
    'investigation-timeline',
    'root-cause-analysis',
    'post-incident-review',
    'regulatory-reporting',
    'near-miss-tracking',
    'diagnostics',
  ],
  adminSurfaces: INCIDENT_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'open_incidents', 'overdue_investigations', 'unresolved_severity_critical', 'stale_war_rooms', 'pending_regulatory_reports'],
} as const;
