export const EMBEDDING_MODELS = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'] as const;
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small' as const;
export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 50;
export const MAX_DOCUMENT_SIZE_MB = 50;
export const MAX_CHUNKS_PER_DOCUMENT = 1000;

export const DOCUMENT_SOURCE_TYPES = ['upload', 'url', 'api', 'manual', 'sharepoint', 'confluence'] as const;
export const EMBEDDING_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export const CHUNK_STRATEGIES = ['paragraph', 'sentence', 'fixed_size', 'semantic'] as const;

export const KNOWLEDGE_LIMITS = {
  MAX_DOCUMENT_SIZE_MB: 50,
  MAX_CHUNKS_PER_DOCUMENT: 1000,
  MAX_CHUNK_TOKENS: 512,
  MAX_SEARCH_RESULTS: 50,
  MAX_SOURCES_PER_TENANT: 20,
  MAX_CONCURRENT_EMBEDDINGS: 5,
  STALE_DOCUMENT_DAYS: 90,
  SYNC_INTERVAL_HOURS: 4,
} as const;

export const SUPPORTED_FILE_TYPES = [
  'application/pdf', 'text/plain', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/html', 'text/csv',
] as const;
