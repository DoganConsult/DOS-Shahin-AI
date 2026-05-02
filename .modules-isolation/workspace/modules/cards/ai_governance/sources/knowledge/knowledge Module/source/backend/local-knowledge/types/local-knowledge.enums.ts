export const EMBEDDING_STATUS_ENUM = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const CHUNK_STRATEGY_ENUM = {
  PARAGRAPH: 'paragraph',
  SENTENCE: 'sentence',
  FIXED_SIZE: 'fixed_size',
  SEMANTIC: 'semantic',
} as const;

export const SOURCE_TYPE_ENUM = {
  UPLOAD: 'upload',
  URL: 'url',
  API: 'api',
  MANUAL: 'manual',
  SHAREPOINT: 'sharepoint',
  CONFLUENCE: 'confluence',
} as const;

export const KNOWLEDGE_LIMITS = {
  MAX_DOCUMENT_SIZE_MB: 50,
  MAX_CHUNKS_PER_DOCUMENT: 1000,
  MAX_CHUNK_TOKENS: 512,
  MAX_SEARCH_RESULTS: 50,
  MAX_SOURCES: 20,
} as const;
