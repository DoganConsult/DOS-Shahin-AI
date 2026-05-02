export interface LocalKnowledgeDocumentContract {
  documentId: string;
  tenantId: string;
  sourceId: string | null;
  title: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: 'pending' | 'ingesting' | 'chunked' | 'embedded' | 'failed' | 'archived';
  chunkCount: number;
  embeddingModel: string | null;
  embeddingDimension: number | null;
  languageCode: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  ingestedAt: string | null;
  embeddedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalKnowledgeChunkContract {
  chunkId: string;
  documentId: string;
  tenantId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
  headingContext: string | null;
  createdAt: string;
}

export interface LocalKnowledgeSourceContract {
  sourceId: string;
  tenantId: string;
  nameEn: string;
  nameAr: string | null;
  sourceType: 'upload' | 'sharepoint' | 'confluence' | 'gdrive' | 'api' | 'manual';
  connectionConfig: Record<string, unknown>;
  syncFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSyncAt: string | null;
  documentCount: number;
  totalSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalKnowledgeSearchResultContract {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
  headingContext: string | null;
  highlightedContent: string | null;
}

export interface LocalKnowledgeSearchParams {
  tenantId: string;
  query: string;
  topK?: number;
  minScore?: number;
  sourceIds?: string[];
  tags?: string[];
  languageCode?: string;
}

export interface LocalKnowledgeIngestionStatsContract {
  tenantId: string;
  totalDocuments: number;
  embeddedDocuments: number;
  failedDocuments: number;
  pendingDocuments: number;
  totalChunks: number;
  totalSizeBytes: number;
  avgChunksPerDocument: number | null;
  lastIngestionAt: string | null;
}

export interface LocalKnowledgeDiagnosticsContract {
  tenantId: string;
  totalSources: number;
  activeSources: number;
  errorSources: number;
  totalDocuments: number;
  staleDocuments: number;
  embeddingModelVersion: string | null;
  embeddingDimension: number | null;
  indexHealth: 'healthy' | 'degraded' | 'rebuilding' | 'error';
  capturedAt: string;
}

export interface LocalKnowledgeListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  sourceId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LocalKnowledgeListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
