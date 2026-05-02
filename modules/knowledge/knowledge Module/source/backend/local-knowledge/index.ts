// Export types from one source to avoid duplicates.
// The module-layer documents service re-exports canonical types from the services layer.
export type { PaginationParams, PaginatedResponse, KnowledgeDocument } from './services/local/local-knowledge-documents.service';
export * from './services/local/local-knowledge-documents.service';
export * from './services/local/local-knowledge-chunks.service';
export * from './services/local/local-knowledge-orchestrator.service';
export * from './services/local/local-knowledge-ingestion.service';
export * from './services/local/local-knowledge-extraction.service';
export * from './services/local/local-knowledge-embedding.service';
export * from './services/local/local-knowledge-access-control.service';
export * from './services/local/local-knowledge-access-log.service';
export * from './services/local/local-knowledge-cache.service';
export * from './services/local/local-knowledge-health.service';
export * from './services/local/local-knowledge-source-registry.service';
export * from './services/local/local-knowledge-validation.service';
