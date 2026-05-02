import { NOTIFICATION_MANIFEST } from '../notification.module';

export { NOTIFICATION_MANIFEST };

export const NOTIFICATION_MANIFEST_META = {
  code: NOTIFICATION_MANIFEST.code,
  version: NOTIFICATION_MANIFEST.version,
  tier: NOTIFICATION_MANIFEST.tier,
  category: NOTIFICATION_MANIFEST.category,
  routeBase: NOTIFICATION_MANIFEST.routeBase,
  eventNamespace: NOTIFICATION_MANIFEST.eventNamespace,
  tablePrefix: NOTIFICATION_MANIFEST.tablePrefix,
  ownedTables: NOTIFICATION_MANIFEST.ownedTables,
  publishedEvents: NOTIFICATION_MANIFEST.publishedEvents,
  consumedEvents: NOTIFICATION_MANIFEST.consumedEvents,
  hardDeps: NOTIFICATION_MANIFEST.hardDeps,
  softDeps: NOTIFICATION_MANIFEST.softDeps,
  provisioningOrder: NOTIFICATION_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: [
    'notification-hub',
    'channel-management',
    'template-management',
    'delivery-log',
    'subscription-preferences',
    'diagnostics',
  ],
  adminSurfaces: NOTIFICATION_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'delivery_queue_depth', 'delivery_failure_rate', 'channel_health'],
} as const;
