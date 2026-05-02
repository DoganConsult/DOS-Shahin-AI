import { INBOX_MANIFEST } from '../inbox.module';

export { INBOX_MANIFEST };

export const INBOX_MANIFEST_META = {
  code: INBOX_MANIFEST.code,
  version: INBOX_MANIFEST.version,
  tier: INBOX_MANIFEST.tier,
  category: INBOX_MANIFEST.category,
  routeBase: INBOX_MANIFEST.routeBase,
  eventNamespace: INBOX_MANIFEST.eventNamespace,
  tablePrefix: INBOX_MANIFEST.tablePrefix,
  ownedTables: INBOX_MANIFEST.ownedTables,
  publishedEvents: INBOX_MANIFEST.publishedEvents,
  consumedEvents: INBOX_MANIFEST.consumedEvents,
  hardDeps: INBOX_MANIFEST.hardDeps,
  softDeps: INBOX_MANIFEST.softDeps,
  provisioningOrder: INBOX_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: [
    'inbox-hub',
    'message-threads',
    'broadcast-management',
    'smart-priority',
    'diagnostics',
  ],
  adminSurfaces: INBOX_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'delivery_queue_depth', 'unread_count'],
} as const;
