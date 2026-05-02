import { EVIDENCE_MANIFEST } from '../evidence.module';

export { EVIDENCE_MANIFEST };

export const EVIDENCE_MANIFEST_META = {
  code: EVIDENCE_MANIFEST.code,
  version: EVIDENCE_MANIFEST.version,
  tier: EVIDENCE_MANIFEST.tier,
  category: EVIDENCE_MANIFEST.category,
  routeBase: EVIDENCE_MANIFEST.routeBase,
  eventNamespace: EVIDENCE_MANIFEST.eventNamespace,
  tablePrefix: EVIDENCE_MANIFEST.tablePrefix,
  ownedTables: EVIDENCE_MANIFEST.ownedTables,
  publishedEvents: EVIDENCE_MANIFEST.publishedEvents,
  consumedEvents: EVIDENCE_MANIFEST.consumedEvents,
  hardDeps: EVIDENCE_MANIFEST.hardDeps,
  softDeps: EVIDENCE_MANIFEST.softDeps,
  provisioningOrder: EVIDENCE_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'evidence-catalog',
    'evidence-detail',
    'collection-hub',
    'freshness-dashboard',
    'linkage-views',
    'diagnostics',
  ],
  adminSurfaces: EVIDENCE_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'evidence_freshness', 'collection_pipeline'],
} as const;
