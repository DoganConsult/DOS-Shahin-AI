import { EXCEPTION_MANIFEST } from '../exception.module';

export { EXCEPTION_MANIFEST };

export const EXCEPTION_MANIFEST_META = {
  code: EXCEPTION_MANIFEST.code,
  version: EXCEPTION_MANIFEST.version,
  tier: EXCEPTION_MANIFEST.tier,
  category: EXCEPTION_MANIFEST.category,
  routeBase: EXCEPTION_MANIFEST.routeBase,
  eventNamespace: EXCEPTION_MANIFEST.eventNamespace,
  tablePrefix: EXCEPTION_MANIFEST.tablePrefix,
  ownedTables: EXCEPTION_MANIFEST.ownedTables,
  publishedEvents: EXCEPTION_MANIFEST.publishedEvents,
  consumedEvents: EXCEPTION_MANIFEST.consumedEvents,
  hardDeps: EXCEPTION_MANIFEST.hardDeps,
  softDeps: EXCEPTION_MANIFEST.softDeps,
  provisioningOrder: EXCEPTION_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'exception-hub',
    'exception-detail',
    'approval-views',
    'expiry-tracking',
    'compensating-controls',
    'diagnostics',
  ],
  adminSurfaces: EXCEPTION_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'expiring_exceptions', 'overdue_renewals', 'pending_approvals'],
} as const;
