import { WIDGETS_MANIFEST } from '../widgets.module';

export { WIDGETS_MANIFEST };

export const WIDGETS_MANIFEST_META = {
  code: WIDGETS_MANIFEST.code,
  version: WIDGETS_MANIFEST.version,
  tier: WIDGETS_MANIFEST.tier,
  category: WIDGETS_MANIFEST.category,
  routeBase: WIDGETS_MANIFEST.routeBase,
  eventNamespace: WIDGETS_MANIFEST.eventNamespace,
  tablePrefix: WIDGETS_MANIFEST.tablePrefix,
  ownedTables: WIDGETS_MANIFEST.ownedTables,
  publishedEvents: WIDGETS_MANIFEST.publishedEvents,
  consumedEvents: WIDGETS_MANIFEST.consumedEvents,
  hardDeps: WIDGETS_MANIFEST.hardDeps,
  softDeps: WIDGETS_MANIFEST.softDeps,
  provisioningOrder: WIDGETS_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'widget-registry',
    'widget-bundles',
    'widget-runtime',
    'executive-widgets',
    'diagnostics',
  ],
  adminSurfaces: ['widgets-admin'],
  healthSignals: ['schema_exists', 'tables_exist', 'widget_render_health'],
} as const;
