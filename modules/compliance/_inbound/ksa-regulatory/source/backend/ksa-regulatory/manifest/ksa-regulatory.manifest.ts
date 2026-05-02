import { KSA_REGULATORY_MANIFEST } from '../ksa-regulatory.module';

export { KSA_REGULATORY_MANIFEST };

export const KSA_REGULATORY_MANIFEST_META = {
  code: KSA_REGULATORY_MANIFEST.code,
  version: KSA_REGULATORY_MANIFEST.version,
  tier: KSA_REGULATORY_MANIFEST.tier,
  category: KSA_REGULATORY_MANIFEST.category,
  routeBase: KSA_REGULATORY_MANIFEST.routeBase,
  eventNamespace: KSA_REGULATORY_MANIFEST.eventNamespace,
  tablePrefix: KSA_REGULATORY_MANIFEST.tablePrefix,
  ownedTables: KSA_REGULATORY_MANIFEST.ownedTables,
  publishedEvents: KSA_REGULATORY_MANIFEST.publishedEvents,
  consumedEvents: KSA_REGULATORY_MANIFEST.consumedEvents,
  hardDeps: KSA_REGULATORY_MANIFEST.hardDeps,
  softDeps: KSA_REGULATORY_MANIFEST.softDeps,
  provisioningOrder: KSA_REGULATORY_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'ksa-regulatory-hub',
    'change-tracking',
    'framework-mapping',
    'sector-maturity',
    'compliance-scoring',
    'diagnostics',
  ],
  adminSurfaces: KSA_REGULATORY_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'pending_regulatory_changes', 'mapping_freshness', 'maturity_score_staleness'],
} as const;
