/**
 * Document Chunker — Split text into chunks for RAG indexing.
 *
 * Splits by paragraph boundaries with configurable max size and overlap.
 * Each chunk maintains source provenance for citation tracking.
 */
const DEFAULT_MAX_CHUNK_SIZE = parseInt(process.env.RAG_MAX_CHUNK_SIZE || '1500', 10);
const DEFAULT_OVERLAP_SIZE = parseInt(process.env.RAG_OVERLAP_SIZE || '200', 10);
/**
 * Split a document into chunks suitable for embedding and indexing.
 */
export function chunkDocument(text, options) {
    const maxSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
    const overlap = options?.overlapSize ?? DEFAULT_OVERLAP_SIZE;
    const respectParagraphs = options?.respectParagraphs ?? true;
    if (!text || text.trim().length === 0)
        return [];
    // If text fits in a single chunk, return as-is
    if (text.length <= maxSize) {
        return [{ content: text.trim(), chunkIndex: 0, startOffset: 0, endOffset: text.length }];
    }
    const chunks = [];
    if (respectParagraphs) {
        // Split by paragraphs first
        const paragraphs = text.split(/\n\s*\n/);
        let currentChunk = '';
        let chunkStart = 0;
        let offset = 0;
        for (const para of paragraphs) {
            const trimmed = para.trim();
            if (!trimmed) {
                offset += para.length + 2; // account for \n\n
                continue;
            }
            if (currentChunk.length + trimmed.length + 2 > maxSize && currentChunk.length > 0) {
                // Emit current chunk
                chunks.push({
                    content: currentChunk.trim(),
                    chunkIndex: chunks.length,
                    startOffset: chunkStart,
                    endOffset: offset,
                });
                // Start new chunk with overlap from end of previous
                if (overlap > 0 && currentChunk.length > overlap) {
                    currentChunk = currentChunk.slice(-overlap) + '\n\n' + trimmed;
                }
                else {
                    currentChunk = trimmed;
                }
                chunkStart = Math.max(0, offset - overlap);
            }
            else {
                currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
            }
            offset += para.length + 2;
        }
        // Emit final chunk
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                chunkIndex: chunks.length,
                startOffset: chunkStart,
                endOffset: text.length,
            });
        }
    }
    // If paragraph splitting produced no results or chunks are still too large, fall back to character splitting
    if (chunks.length === 0 || chunks.some(c => c.content.length > maxSize * 2)) {
        return characterChunk(text, maxSize, overlap);
    }
    return chunks;
}
/**
 * Character-level chunking with overlap.
 */
function characterChunk(text, maxSize, overlap) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxSize, text.length);
        // Try to break at a sentence or word boundary
        if (end < text.length) {
            const lastSentence = text.lastIndexOf('. ', end);
            if (lastSentence > start + maxSize * 0.5) {
                end = lastSentence + 2;
            }
            else {
                const lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start + maxSize * 0.5) {
                    end = lastSpace + 1;
                }
            }
        }
        chunks.push({
            content: text.slice(start, end).trim(),
            chunkIndex: chunks.length,
            startOffset: start,
            endOffset: end,
        });
        start = end - overlap;
        if (start >= text.length)
            break;
    }
    return chunks;
}
//# sourceMappingURL=document-chunker.js.map