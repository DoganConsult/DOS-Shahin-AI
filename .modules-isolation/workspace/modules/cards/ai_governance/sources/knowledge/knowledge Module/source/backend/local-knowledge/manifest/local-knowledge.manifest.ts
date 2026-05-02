import { LOCAL_KNOWLEDGE_MANIFEST } from '../local-knowledge.module';

export { LOCAL_KNOWLEDGE_MANIFEST };

export const LOCAL_KNOWLEDGE_MANIFEST_META = {
  code: LOCAL_KNOWLEDGE_MANIFEST.code,
  version: LOCAL_KNOWLEDGE_MANIFEST.version,
  tier: LOCAL_KNOWLEDGE_MANIFEST.tier,
  category: LOCAL_KNOWLEDGE_MANIFEST.category,
  routeBase: LOCAL_KNOWLEDGE_MANIFEST.routeBase,
  eventNamespace: LOCAL_KNOWLEDGE_MANIFEST.eventNamespace,
  tablePrefix: LOCAL_KNOWLEDGE_MANIFEST.tablePrefix,
  ownedTables: LOCAL_KNOWLEDGE_MANIFEST.ownedTables,
  publishedEvents: LOCAL_KNOWLEDGE_MANIFEST.publishedEvents,
  consumedEvents: LOCAL_KNOWLEDGE_MANIFEST.consumedEvents,
  hardDeps: LOCAL_KNOWLEDGE_MANIFEST.hardDeps,
  softDeps: LOCAL_KNOWLEDGE_MANIFEST.softDeps,
  provisioningOrder: LOCAL_KNOWLEDGE_MANIFEST.provisioningOrder,
  lifecycleParticipation: false,
  uiSurfaces: [
    'knowledge-hub',
    'document-catalog',
    'semantic-search',
    'source-management',
    'diagnostics',
  ],
  adminSurfaces: LOCAL_KNOWLEDGE_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'embedding_pipeline_healthy', 'stale_documents', 'source_sync_status'],
} as const;
