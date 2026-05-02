import type { GenericRow } from '@dos/types';
import type { KnowledgeDocument, KnowledgeChunk, SemanticSearchResult } from '../types/local-knowledge.types';

export function toDocument(row: GenericRow): KnowledgeDocument {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title,
    source_type: row.source_type,
    source_uri: row.source_uri,
    content_hash: row.content_hash,
    embedding_status: row.embedding_status,
    chunk_count: row.chunk_count ?? 0,
    ingested_at: row.ingested_at?.toISOString?.() ?? row.ingested_at,
    created_by: row.created_by ?? 'system',
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export function toDocumentList(rows: GenericRow[]): KnowledgeDocument[] {
  return rows.map(toDocument);
}

export function toChunk(row: GenericRow): KnowledgeChunk {
  return {
    id: row.id,
    document_id: row.document_id,
    chunk_index: row.chunk_index,
    content: row.content,
    embedding: row.embedding,
    token_count: row.token_count,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export function toSearchResult(row: GenericRow, score: number): SemanticSearchResult {
  return {
    chunkId: row.id,
    documentId: row.document_id,
    documentTitle: row.document_title ?? row.title,
    sourceType: row.source_type,
    content: row.content,
    score,
  };
}

export function toDocumentApiResponse(doc: KnowledgeDocument): Record<string, unknown> {
  const { deleted_at: _deleted_at, ...rest } = doc;
  return rest;
}
