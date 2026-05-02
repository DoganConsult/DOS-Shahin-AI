/**
 * Embedding Generator — Production-grade vector generation.
 *
 * Primary: AI gateway embeddings (Azure OpenAI / text-embedding-3-small)
 * Fallback: Deterministic hash-based pseudo-embeddings
 *
 * Supports batch operations with concurrency control.
 */
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/platform-core/resilience';
/** Dimension of embedding vectors (must match pgvector column definition) */
export const EMBEDDING_DIM = parseInt(process.env.RAG_EMBEDDING_DIM || '1536', 10);
/**
 * Generate a single embedding vector for a text string.
 */
export async function generateEmbedding(text) {
    const results = await generateEmbeddingsBatch([text]);
    return results[0] || deterministicFallback(text);
}
/**
 * Generate embeddings in batches with concurrency control.
 *
 * @param texts - Array of text strings to embed
 * @param batchSize - Number of texts per API call (default: 10)
 * @param delayMs - Delay between batches for rate limiting (default: 100ms)
 */
export async function generateEmbeddingsBatch(texts, batchSize = parseInt(process.env.RAG_EMBEDDING_BATCH_SIZE || '10', 10), delayMs = parseInt(process.env.RAG_EMBEDDING_DELAY_MS || '100', 10)) {
    const results = [];
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        try {
            // Primary: OpenAI-compatible embedding API
            const embeddings = await callEmbeddingAPI(batch);
            results.push(...embeddings);
        }
        catch (apiErr) {
            logger.warn(`[RAG-Embedding] API failed, using deterministic fallback: ${toErrorMessage(apiErr)}`);
            // Fallback: Deterministic hash-based pseudo-embeddings
            for (const text of batch) {
                results.push(deterministicFallback(text));
            }
        }
        // Rate limit between batches
        if (i + batchSize < texts.length && delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    return results;
}
/**
 * Call an OpenAI-compatible embedding API directly.
 */
async function callEmbeddingAPI(texts) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY;
    const baseUrl = process.env.EMBEDDING_API_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    if (!apiKey) {
        throw new Error('No embedding API key configured (OPENAI_API_KEY or EMBEDDING_API_KEY)');
    }
    const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            input: texts.map(t => t.slice(0, 8191)), // API token limit
            dimensions: EMBEDDING_DIM,
        }),
    });
    if (!response.ok) {
        throw new Error(`Embedding API returned ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    return data.data.map(d => d.embedding);
}
/**
 * Deterministic hash-based pseudo-embedding fallback.
 * Produces a normalized vector from text content.
 * NOT suitable for real semantic search — only for development/testing.
 */
function deterministicFallback(text) {
    const vec = new Float32Array(EMBEDDING_DIM);
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
        seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
    }
    for (let i = 0; i < EMBEDDING_DIM; i++) {
        seed = (seed * 1103515245 + 12345) | 0;
        vec[i] = ((seed >> 16) & 0x7fff) / 32768 - 0.5;
    }
    // Normalize to unit vector
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return Array.from(vec.map(v => v / norm));
}
//# sourceMappingURL=embedding-generator.js.map