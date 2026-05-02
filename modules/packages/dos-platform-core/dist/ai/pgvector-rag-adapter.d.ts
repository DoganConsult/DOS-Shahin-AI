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
export declare class AnthropicEmbeddingProvider implements EmbeddingProvider {
    private apiKey;
    private model;
    constructor(apiKey?: string, model?: string);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    private hashFallback;
}
export declare class PgVectorRagAdapter {
    private pool;
    private embeddingProvider;
    constructor(pool: any, embeddingProvider?: EmbeddingProvider);
    /**
     * Search for similar documents using vector cosine similarity.
     * Falls back to full-text search if embeddings are not available.
     */
    search(tenantId: string, query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
    /**
     * Full-text search fallback using tsvector.
     */
    private fullTextSearch;
    /**
     * Generate and store embedding for a document.
     */
    upsertEmbedding(schema: string, table: string, idColumn: string, embeddingColumn: string, contentColumn: string, id: string): Promise<boolean>;
    /**
     * Batch-generate embeddings for documents missing them.
     */
    backfillEmbeddings(schema: string, table: string, idColumn: string, embeddingColumn: string, contentColumn: string, batchSize?: number): Promise<number>;
    /**
     * Ensure pgvector extension is installed.
     */
    ensureExtension(): Promise<boolean>;
}
