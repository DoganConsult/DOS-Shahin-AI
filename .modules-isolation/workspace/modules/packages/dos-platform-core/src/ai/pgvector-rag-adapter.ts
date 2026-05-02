/**
 * pgvector RAG Adapter — Reusable vector similarity search for DOS Platform
 *
 * Provides embedding generation, storage, and retrieval using PostgreSQL
 * with the pgvector extension. Supports cosine similarity with full-text
 * search fallback.
 *
 * Usage:
 *   import { PgVectorRagAdapter } from '@dos/platform-core/ai/pgvector-rag-adapter';
 *   const rag = new PgVectorRagAdapter(pool);
 *   const results = await rag.search(tenantId, 'How do we comply with ISO 27001?');
 */

import { logger } from '../observability';

const DEFAULT_EMBEDDING_DIM = 1536;
const DEFAULT_TOP_K = 5;
const DEFAULT_THRESHOLD = 0.65;

export interface VectorSearchOptions {
  topK?: number;
  threshold?: number;
  table?: string;
  embeddingColumn?: string;
  contentColumn?: string;
  titleColumn?: string;
  idColumn?: string;
  filters?: Record<string, unknown>;
  tenantSchema?: string;
}

export interface VectorSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// ── Claude/Anthropic Embedding Provider ──────────────────────────────

export class AnthropicEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    this.model = model || 'voyage-3';
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Use Voyage AI (recommended for Anthropic/Claude ecosystem)
    const voyageKey = process.env.VOYAGE_API_KEY || this.apiKey;
    if (!voyageKey) {
      logger.warn('[pgvector-rag] No embedding API key configured, using text hash fallback');
      return texts.map(t => this.hashFallback(t));
    }

    try {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${voyageKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          input_type: 'document',
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Voyage API ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json() as { data: Array<{ embedding: number[] }> };
      return data.data.map(d => d.embedding);
    } catch (err) {
      logger.warn('[pgvector-rag] Embedding API failed, using hash fallback', {
        error: (err as Error).message,
      });
      return texts.map(t => this.hashFallback(t));
    }
  }

  private hashFallback(text: string): number[] {
    // Deterministic pseudo-embedding for graceful degradation
    const { createHash } = require('node:crypto');
    const hash = createHash('sha512').update(text).digest();
    const vec: number[] = [];
    for (let i = 0; i < DEFAULT_EMBEDDING_DIM; i++) {
      vec.push((hash[i % hash.length] / 255) * 2 - 1);
    }
    return vec;
  }
}

// ── pgvector RAG Adapter ─────────────────────────────────────────────

export class PgVectorRagAdapter {
  private pool: any;
  private embeddingProvider: EmbeddingProvider;

  constructor(pool: any, embeddingProvider?: EmbeddingProvider) {
    this.pool = pool;
    this.embeddingProvider = embeddingProvider || new AnthropicEmbeddingProvider();
  }

  /**
   * Search for similar documents using vector cosine similarity.
   * Falls back to full-text search if embeddings are not available.
   */
  async search(
    tenantId: string,
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    const {
      topK = DEFAULT_TOP_K,
      threshold = DEFAULT_THRESHOLD,
      table = 'policies',
      embeddingColumn = 'embedding',
      contentColumn = 'content_en',
      titleColumn = 'title_en',
      idColumn = 'id',
      tenantSchema,
    } = options;

    const schema = tenantSchema || `tenant_${tenantId}`;

    // Try vector search first
    try {
      const embedding = await this.embeddingProvider.embed(query);
      const vectorStr = `[${embedding.join(',')}]`;

      const filterClauses: string[] = [];
      const params: unknown[] = [vectorStr, threshold, topK];
      let idx = 4;

      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          filterClauses.push(`AND ${key} = $${idx}`);
          params.push(value);
          idx++;
        }
      }

      const sql = `
        SELECT
          ${idColumn} AS id,
          ${titleColumn} AS title,
          ${contentColumn} AS content,
          (1 - (${embeddingColumn} <=> $1::vector)) AS similarity
        FROM "${schema}".${table}
        WHERE ${embeddingColumn} IS NOT NULL
          AND (1 - (${embeddingColumn} <=> $1::vector)) >= $2
          ${filterClauses.join(' ')}
        ORDER BY ${embeddingColumn} <=> $1::vector
        LIMIT $3
      `;

      const result = await this.pool.query(sql, params);

      if (result.rows.length > 0) {
        return result.rows.map((r: any) => ({
          id: r.id,
          title: r.title || '',
          content: r.content || '',
          similarity: parseFloat(r.similarity),
        }));
      }
    } catch (err) {
      logger.warn('[pgvector-rag] Vector search failed, falling back to full-text', {
        table, error: (err as Error).message,
      });
    }

    // Fallback: full-text search
    return this.fullTextSearch(schema, query, table, contentColumn, titleColumn, idColumn, topK);
  }

  /**
   * Full-text search fallback using tsvector.
   */
  private async fullTextSearch(
    schema: string,
    query: string,
    table: string,
    contentColumn: string,
    titleColumn: string,
    idColumn: string,
    topK: number,
  ): Promise<VectorSearchResult[]> {
    try {
      const sql = `
        SELECT
          ${idColumn} AS id,
          ${titleColumn} AS title,
          ${contentColumn} AS content,
          ts_rank(search_vector, plainto_tsquery('english', $1)) AS similarity
        FROM "${schema}".${table}
        WHERE search_vector @@ plainto_tsquery('english', $1)
        ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
        LIMIT $2
      `;
      const result = await this.pool.query(sql, [query, topK]);
      return result.rows.map((r: any) => ({
        id: r.id,
        title: r.title || '',
        content: r.content || '',
        similarity: parseFloat(r.similarity),
      }));
    } catch (err) {
      logger.warn('[pgvector-rag] Full-text search also failed', { error: (err as Error).message });
      return [];
    }
  }

  /**
   * Generate and store embedding for a document.
   */
  async upsertEmbedding(
    schema: string,
    table: string,
    idColumn: string,
    embeddingColumn: string,
    contentColumn: string,
    id: string,
  ): Promise<boolean> {
    try {
      const contentResult = await this.pool.query(
        `SELECT ${contentColumn} FROM "${schema}".${table} WHERE ${idColumn} = $1`,
        [id],
      );
      if (contentResult.rows.length === 0) return false;

      const content = contentResult.rows[0][contentColumn];
      if (!content) return false;

      const embedding = await this.embeddingProvider.embed(content);
      const vectorStr = `[${embedding.join(',')}]`;

      await this.pool.query(
        `UPDATE "${schema}".${table} SET ${embeddingColumn} = $2::vector WHERE ${idColumn} = $1`,
        [id, vectorStr],
      );

      return true;
    } catch (err) {
      logger.warn('[pgvector-rag] Failed to upsert embedding', { id, error: (err as Error).message });
      return false;
    }
  }

  /**
   * Batch-generate embeddings for documents missing them.
   */
  async backfillEmbeddings(
    schema: string,
    table: string,
    idColumn: string,
    embeddingColumn: string,
    contentColumn: string,
    batchSize = 50,
  ): Promise<number> {
    let processed = 0;

    try {
      const result = await this.pool.query(
        `SELECT ${idColumn} AS id, ${contentColumn} AS content
         FROM "${schema}".${table}
         WHERE ${embeddingColumn} IS NULL AND ${contentColumn} IS NOT NULL
         LIMIT $1`,
        [batchSize],
      );

      if (result.rows.length === 0) return 0;

      const texts = result.rows.map((r: any) => r.content as string);
      const embeddings = await this.embeddingProvider.embedBatch(texts);

      for (let i = 0; i < result.rows.length; i++) {
        const vectorStr = `[${embeddings[i].join(',')}]`;
        await this.pool.query(
          `UPDATE "${schema}".${table} SET ${embeddingColumn} = $2::vector WHERE ${idColumn} = $1`,
          [result.rows[i].id, vectorStr],
        );
        processed++;
      }

      logger.info('[pgvector-rag] Backfill complete', { schema, table, processed });
    } catch (err) {
      logger.warn('[pgvector-rag] Backfill failed', { error: (err as Error).message, processed });
    }

    return processed;
  }

  /**
   * Ensure pgvector extension is installed.
   */
  async ensureExtension(): Promise<boolean> {
    try {
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      return true;
    } catch (err) {
      logger.warn('[pgvector-rag] Failed to create vector extension', { error: (err as Error).message });
      return false;
    }
  }
}
