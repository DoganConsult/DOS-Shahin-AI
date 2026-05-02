import type { ModuleEventContract } from '@dos/types';

export const LOCAL_KNOWLEDGE_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'local-knowledge',
  published: {
    'local_knowledge.document_ingested': { description: 'Emitted when a document is ingested into the knowledge base', version: 1, payloadType: 'LocalKnowledgeDocumentPayload' },
    'local_knowledge.document_embedded': { description: 'Emitted when document embeddings are generated', version: 1, payloadType: 'LocalKnowledgeEmbeddingPayload' },
    'local_knowledge.source_synced': { description: 'Emitted when a knowledge source sync completes', version: 1, payloadType: 'LocalKnowledgeSourcePayload' },
    'local_knowledge.document_archived': { description: 'Emitted when a document is archived', version: 1, payloadType: 'LocalKnowledgeDocumentPayload' },
    'local_knowledge.chunk_indexed': { description: 'Emitted when document chunks are indexed for search', version: 1, payloadType: 'LocalKnowledgeChunkPayload' },
    'local_knowledge.source_failed': { description: 'Emitted when a knowledge source sync fails', version: 1, payloadType: 'LocalKnowledgeSourcePayload' },
  },
  consumed: {
    'ai.model_updated': { source: 'ai', handler: 'handleAiModelUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'evidence.document_uploaded': { source: 'evidence', handler: 'handleEvidenceDocumentUploaded', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const LOCAL_KNOWLEDGE_PUBLISHED_EVENTS = Object.keys(LOCAL_KNOWLEDGE_EVENT_CONTRACT.published);
export const LOCAL_KNOWLEDGE_CONSUMED_EVENTS = Object.keys(LOCAL_KNOWLEDGE_EVENT_CONTRACT.consumed);

export const LOCAL_KNOWLEDGE_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const LOCAL_KNOWLEDGE_EVENT_ORDERING = {
  strictOrdering: false,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const LOCAL_KNOWLEDGE_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: ['content', 'embedding_vector'] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: false,
  encryptPayload: false,
  signPayload: false,
} as const;

export const LOCAL_KNOWLEDGE_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
