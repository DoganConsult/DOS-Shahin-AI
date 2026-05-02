import { ISSUES_MANIFEST } from '../issues.module';

export { ISSUES_MANIFEST };

export const ISSUES_MANIFEST_META = {
  code: ISSUES_MANIFEST.code,
  version: ISSUES_MANIFEST.version,
  tier: ISSUES_MANIFEST.tier,
  category: ISSUES_MANIFEST.category,
  routeBase: ISSUES_MANIFEST.routeBase,
  eventNamespace: ISSUES_MANIFEST.eventNamespace,
  tablePrefix: ISSUES_MANIFEST.tablePrefix,
  ownedTables: ISSUES_MANIFEST.ownedTables,
  publishedEvents: ISSUES_MANIFEST.publishedEvents,
  consumedEvents: ISSUES_MANIFEST.consumedEvents,
  hardDeps: ISSUES_MANIFEST.hardDeps,
  softDeps: ISSUES_MANIFEST.softDeps,
  provisioningOrder: ISSUES_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'issues-hub',
    'issue-detail',
    'issue-links',
    'sla-tracking',
    'diagnostics',
  ],
  adminSurfaces: ISSUES_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'open_issues', 'sla_breaches', 'unassigned_issues'],
} as const;
