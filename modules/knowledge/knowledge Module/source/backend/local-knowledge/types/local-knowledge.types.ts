export interface KnowledgeDocument {
  id: string;
  tenant_id: string;
  title: string;
  source_type: DocumentSourceType;
  source_uri?: string;
  content_hash: string;
  embedding_status: EmbeddingStatus;
  chunk_count: number;
  ingested_at: string;
  created_by: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type DocumentSourceType = 'upload' | 'url' | 'api' | 'manual' | 'sharepoint' | 'confluence';
export const DOCUMENT_SOURCE_TYPES: readonly DocumentSourceType[] = ['upload', 'url', 'api', 'manual', 'sharepoint', 'confluence'] as const;

export type EmbeddingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export const EMBEDDING_STATUSES: readonly EmbeddingStatus[] = ['pending', 'processing', 'completed', 'failed'] as const;

export type ChunkStrategy = 'paragraph' | 'sentence' | 'fixed_size' | 'semantic';

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  token_count: number;
  created_at: string;
}

export interface KnowledgeSource {
  id: string;
  tenant_id: string;
  name: string;
  source_type: DocumentSourceType;
  connection_config: Record<string, unknown>;
  sync_schedule?: string;
  last_synced_at?: string;
  enabled: boolean;
}

export interface SemanticSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: string;
  content: string;
  score: number;
}

export interface EmbeddingPipelineStatus {
  totalDocuments: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  lastProcessedAt?: string;
}

export interface LocalKnowledgeEventPayload {
  tenantId: string;
  entityType: 'document' | 'chunk' | 'source' | 'pipeline';
  entityId: string;
  moduleCode: 'local-knowledge';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  data: Record<string, unknown>;
}
