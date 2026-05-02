/**
 * Knowledge Retrieval Service - Spec Compliant Implementation
 * Canonical service for semantic search and knowledge retrieval
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';

export interface RetrievalRequest {
  query: string;
  topK?: number;
  minScore?: number;
  sourceIds?: string[];
  tags?: string[];
  languageCode?: string;
  includeHighlights?: boolean;
  includeContext?: boolean;
}

export interface RetrievalResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
  headingContext?: string;
  highlightedContent?: string;
  documentMetadata?: Record<string, unknown>;
}

export interface RetrievalResponse {
  results: RetrievalResult[];
  totalFound: number;
  query: string;
  searchTime: number;
}

/**
 * Main entry point for knowledge retrieval
 * Implements the canonical KnowledgeRetrievalService from spec §3.1
 */
export async function retrieveKnowledge(
  tenantId: string,
  request: RetrievalRequest
): Promise<RetrievalResponse> {
  const startTime = Date.now();
  const schema = tenantSchema(tenantId);

  try {
    // Build search query
    let query = `
      SELECT 
        c.chunk_id,
        c.document_id,
        d.title as document_title,
        c.content,
        COALESCE(e.similarity_score, 0) as score,
        c.heading_context,
        d.metadata as document_metadata
      FROM "${schema}".local_knowledge_chunks c
      JOIN "${schema}".local_knowledge_documents d ON c.document_id = d.document_id
    `;

    // Add vector similarity search if embeddings are available
    if (request.query && request.query.length > 0) {
      query += `
        LEFT JOIN (
          SELECT chunk_id, similarity_score
          FROM "${schema}".local_knowledge_embeddings
          WHERE embedding_vector IS NOT NULL
        ) e ON c.chunk_id = e.chunk_id
      `;
    }

    // Add filters
    const conditions: string[] = [];
    const params: any[] = [];

    if (request.sourceIds && request.sourceIds.length > 0) {
      conditions.push(`d.source_id = ANY($${params.length + 1})`);
      params.push(request.sourceIds);
    }

    if (request.tags && request.tags.length > 0) {
      conditions.push(`d.tags && $${params.length + 1}`);
      params.push(request.tags);
    }

    if (request.languageCode) {
      conditions.push(`d.language_code = $${params.length + 1}`);
      params.push(request.languageCode);
    }

    // Add text search for query
    if (request.query && request.query.length > 0) {
      conditions.push(`to_tsvector('english', c.content) @@ plainto_tsquery('english', $${params.length + 1})`);
      params.push(request.query);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    // Add ordering and limits
    const topK = Math.min(request.topK || 10, 50);
    const minScore = request.minScore || 0.1;

    query += `
      ORDER BY 
        CASE 
          WHEN e.similarity_score IS NOT NULL THEN e.similarity_score
          ELSE 0.5
        END DESC,
        ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $${params.length + 1})) DESC
      LIMIT $${params.length + 2}
    `;

    if (request.query && request.query.length > 0) {
      params.push(request.query);
    }
    params.push(topK);

    const { rows } = await safeQuery(query, params);

    // Process results
    const results: RetrievalResult[] = rows
      .filter(row => row.score >= minScore)
      .map(row => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        content: row.content,
        score: parseFloat(row.score),
        headingContext: row.heading_context,
        highlightedContent: request.includeHighlights ? highlightTerms(row.content, request.query) : undefined,
        documentMetadata: row.document_metadata ? JSON.parse(row.document_metadata as string) : undefined
      }));

    const searchTime = Date.now() - startTime;

    logger.info('[KnowledgeRetrievalService] Search completed', {
      tenantId,
      query: request.query,
      resultsCount: results.length,
      searchTime
    });

    return {
      results,
      totalFound: results.length,
      query: request.query,
      searchTime
    };

  } catch (error) {
    logger.error('[KnowledgeRetrievalService] Search failed', {
      tenantId,
      query: request.query,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Hybrid search combining semantic and keyword search
 */
export async function hybridSearch(
  tenantId: string,
  request: RetrievalRequest
): Promise<RetrievalResponse> {
  const startTime = Date.now();

  try {
    // Get semantic results
    const semanticResults = await retrieveKnowledge(tenantId, {
      ...request,
      topK: Math.ceil((request.topK || 10) * 1.5)
    });

    // Get keyword-only results as fallback
    const keywordResults = await keywordSearch(tenantId, {
      ...request,
      topK: Math.ceil((request.topK || 10) * 1.5)
    });

    // Merge and deduplicate results
    const mergedResults = mergeResults(semanticResults.results, keywordResults.results);
    const topKResults = mergedResults.slice(0, request.topK || 10);

    const searchTime = Date.now() - startTime;

    logger.info('[KnowledgeRetrievalService] Hybrid search completed', {
      tenantId,
      query: request.query,
      semanticCount: semanticResults.results.length,
      keywordCount: keywordResults.results.length,
      mergedCount: mergedResults.length,
      searchTime
    });

    return {
      results: topKResults,
      totalFound: mergedResults.length,
      query: request.query,
      searchTime
    };

  } catch (error) {
    logger.error('[KnowledgeRetrievalService] Hybrid search failed', {
      tenantId,
      query: request.query,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Keyword-only search fallback
 */
async function keywordSearch(
  tenantId: string,
  request: RetrievalRequest
): Promise<RetrievalResponse> {
  const schema = tenantSchema(tenantId);

  const query = `
    SELECT 
      c.chunk_id,
      c.document_id,
      d.title as document_title,
      c.content,
      ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) as score,
      c.heading_context,
      d.metadata as document_metadata
    FROM "${schema}".local_knowledge_chunks c
    JOIN "${schema}".local_knowledge_documents d ON c.document_id = d.document_id
    WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
    ORDER BY ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) DESC
    LIMIT $2
  `;

  const { rows } = await safeQuery(query, [request.query, request.topK || 10]);

  const results: RetrievalResult[] = rows.map(row => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    content: row.content,
    score: parseFloat(row.score),
    headingContext: row.heading_context,
    highlightedContent: request.includeHighlights ? highlightTerms(row.content, request.query) : undefined,
    documentMetadata: row.document_metadata ? JSON.parse(row.document_metadata as string) : undefined
  }));

  return {
    results,
    totalFound: results.length,
    query: request.query,
    searchTime: 0
  };
}

/**
 * Merge and deduplicate results from multiple searches
 */
function mergeResults(semanticResults: RetrievalResult[], keywordResults: RetrievalResult[]): RetrievalResult[] {
  const seen = new Set<string>();
  const merged: RetrievalResult[] = [];

  // Add semantic results first
  for (const result of semanticResults) {
    if (!seen.has(result.chunkId)) {
      seen.add(result.chunkId);
      merged.push(result);
    }
  }

  // Add keyword results that weren't already included
  for (const result of keywordResults) {
    if (!seen.has(result.chunkId)) {
      seen.add(result.chunkId);
      merged.push(result);
    }
  }

  return merged;
}

/**
 * Highlight search terms in content
 */
function highlightTerms(content: string, query: string): string {
  const terms = query.split(/\s+/).filter(term => term.length > 2);
  let highlighted = content;

  for (const term of terms) {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  }

  return highlighted;
}

/**
 * Get document by ID with full context
 */
export async function getDocumentWithChunks(
  tenantId: string,
  documentId: string
): Promise<{
  document: {
    documentId: string;
    title: string;
    status: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  chunks: Array<{
    chunkId: string;
    chunkIndex: number;
    content: string;
    headingContext?: string;
  }>;
} | null> {
  const schema = tenantSchema(tenantId);

  // Get document
  const { rows: docRows } = await safeQuery(
    `SELECT document_id, title, status, metadata, created_at, updated_at
     FROM "${schema}".local_knowledge_documents
     WHERE document_id = $1 AND tenant_id = $2`,
    [documentId, tenantId]
  );

  if (!docRows.length) {
    return null;
  }

  const doc = docRows[0];

  // Get chunks
  const { rows: chunkRows } = await safeQuery(
    `SELECT chunk_id, chunk_index, content, heading_context
     FROM "${schema}".local_knowledge_chunks
     WHERE document_id = $1 AND tenant_id = $2
     ORDER BY chunk_index`,
    [documentId, tenantId]
  );

  return {
    document: {
      documentId: doc.document_id,
      title: doc.title,
      status: doc.status,
      metadata: doc.metadata ? JSON.parse(doc.metadata as string) : {},
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    },
    chunks: chunkRows.map(row => ({
      chunkId: row.chunk_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      headingContext: row.heading_context
    }))
  };
}
