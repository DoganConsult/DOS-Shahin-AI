// ============================================
// Shahin-Ai — Local Knowledge Validation Service
// Document, chunk, and search index validation
// with AI-powered content quality assessment
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { logger } from '../../../ports/logger.port';

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

/** Supported MIME types for knowledge ingestion */
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'application/json',
  'application/xml',
  'text/xml',
]);

/** Maximum file size in bytes (50 MB) */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Minimum meaningful content length in characters */
const MIN_CONTENT_LENGTH = 10;

/** Chunk size bounds in characters */
const MIN_CHUNK_SIZE = 20;
const MAX_CHUNK_SIZE = 10000;

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface DocumentValidationResult {
  valid: boolean;
  score: number;         // 0–100 quality score
  issues: string[];      // blocking issues
  warnings: string[];    // non-blocking warnings
  detectedLanguage: string | null;
  hasPII: boolean;
}

export interface ChunkValidationResult {
  valid: boolean;
  totalChunks: number;
  issues: string[];
  emptyChunks: number;
  oversizedChunks: number;
  undersizedChunks: number;
  chunksWithoutVectors: number;
}

export interface SearchIndexValidationResult {
  valid: boolean;
  orphanedChunks: number;
  staleEmbeddings: number;
  recommendations: string[];
}

// ═══════════════════════════════════════════════
// validateDocument — Full document quality check
// ═══════════════════════════════════════════════

/**
 * Validate document quality for a knowledge base document.
 * 1. Checks document exists and has content (not empty).
 * 2. Checks MIME type is supported.
 * 3. Checks file size is within limits.
 * 4. Uses Claude AI to assess content quality:
 *    - Readability/parseability
 *    - GRC domain relevance
 *    - Language detection (English + Arabic)
 *    - PII/sensitive data detection
 */
export async function validateDocument(
  tenantId: string,
  documentId: string,
): Promise<DocumentValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;
  let detectedLanguage: string | null = null;
  let hasPII = false;

  const schema = tenantSchema(tenantId);

  // Step 1: Fetch document metadata and content
  let doc: GenericRow | null = null;
  try {
    const { rows } = await safeQuery(
      `SELECT d.document_id, d.title, d.document_type, d.canonical_data,
              d.searchable_text, d.status, d.created_at,
              i.raw_content_storage_path, i.parser_used,
              i.checksum,
              LENGTH(d.searchable_text) AS content_length
       FROM ${schema}.local_knowledge_documents d
       LEFT JOIN ${schema}.local_knowledge_ingestion_log i
         ON i.ingestion_id = d.ingestion_id
       WHERE d.document_id = $1
         AND d.tenant_id = $2`,
      [documentId, tenantId],
    );

    if (rows.length === 0) {
      return {
        valid: false,
        score: 0,
        issues: ['Document not found'],
        warnings: [],
        detectedLanguage: null,
        hasPII: false,
      };
    }
    doc = rows[0];
  } catch (err) {
    logger.error('[LKValidation] Failed to fetch document', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return {
      valid: false,
      score: 0,
      issues: ['Failed to fetch document from database'],
      warnings: [],
      detectedLanguage: null,
      hasPII: false,
    };
  }

  if (!doc) {
    return {
      valid: false,
      score: 0,
      issues: ['Document not available for validation'],
      warnings: [],
      detectedLanguage: null,
      hasPII: false,
    };
  }

  // Step 2: Content presence check
  const contentLen = doc.content_length ?? 0;
  if (contentLen < MIN_CONTENT_LENGTH) {
    issues.push(`Document content is too short (${contentLen} characters, minimum ${MIN_CONTENT_LENGTH})`);
    score -= 30;
  }

  if (!doc.searchable_text && !doc.canonical_data) {
    issues.push('Document has neither searchable text nor canonical data');
    score -= 40;
  }

  // Step 3: MIME type check (via parser_used or document_type)
  if (doc.parser_used) {
    const mimeFromParser = guessMimeFromParser(doc.parser_used);
    if (mimeFromParser && !SUPPORTED_MIME_TYPES.has(mimeFromParser)) {
      issues.push(`Unsupported MIME type: ${mimeFromParser}`);
      score -= 15;
    }
  }

  // Step 4: File size check (approximate from content length)
  if (contentLen > MAX_FILE_SIZE_BYTES) {
    issues.push(`Content exceeds maximum size (${Math.round(contentLen / 1024 / 1024)}MB > 50MB)`);
    score -= 15;
  }

  // Step 5: Title check
  if (!doc.title || doc.title.trim().length === 0) {
    warnings.push('Document has no title — consider adding one for discoverability');
    score -= 5;
  }

  // Step 6: AI-powered content quality assessment
  if (doc.searchable_text && doc.searchable_text.length >= MIN_CONTENT_LENGTH) {
    try {
      const aiResult = await assessContentQuality(doc.searchable_text);
      detectedLanguage = aiResult.detectedLanguage;
      hasPII = aiResult.hasPII;

      if (!aiResult.isReadable) {
        issues.push('Content is not readable or parseable (AI assessment)');
        score -= 20;
      }

      if (!aiResult.isGrcRelevant) {
        warnings.push('Content does not appear to be relevant to GRC domain');
        score -= 10;
      }

      if (aiResult.hasPII) {
        warnings.push(`Potential PII/sensitive data detected: ${aiResult.piiTypes.join(', ')}`);
        score -= 5;
      }

      if (aiResult.qualityNotes) {
        warnings.push(`AI quality note: ${aiResult.qualityNotes}`);
      }
    } catch (err) {
      // AI assessment is best-effort — degrade gracefully
      warnings.push('AI content assessment unavailable; manual review recommended');
      logger.warn('[LKValidation] AI assessment failed', {
        tenantId,
        documentId,
        error: (err as Error).message,
      });
    }
  }

  // Step 7: Check for duplicates (same checksum)
  if (doc.checksum) {
    try {
      const { rows: dupes } = await safeQuery(
        `SELECT COUNT(*)::int AS cnt
         FROM ${schema}.local_knowledge_ingestion_log
         WHERE tenant_id = $1
           AND checksum = $2
           AND ingestion_id != (
             SELECT ingestion_id FROM ${schema}.local_knowledge_documents
             WHERE document_id = $3
           )`,
        [tenantId, doc.checksum, documentId],
      );
      if (dupes[0]?.cnt > 0) {
        warnings.push(`Duplicate content detected: ${dupes[0].cnt} other ingestion(s) share the same checksum`);
      }
    } catch { /* non-critical */ }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    valid: issues.length === 0,
    score,
    issues,
    warnings,
    detectedLanguage,
    hasPII,
  };
}

// ═══════════════════════════════════════════════
// validateChunks — Chunk quality validation
// ═══════════════════════════════════════════════

/**
 * Validate chunk quality for a specific document.
 * 1. Check no empty chunks.
 * 2. Check chunk sizes within bounds.
 * 3. Check chunk overlap consistency (sequential indices).
 * 4. Check all chunks have search vectors (embeddings).
 */
export async function validateChunks(
  tenantId: string,
  documentId: string,
): Promise<ChunkValidationResult> {
  const schema = tenantSchema(tenantId);
  const issues: string[] = [];

  try {
    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int                                                       AS total,
         COUNT(*) FILTER (WHERE LENGTH(TRIM(chunk_text)) = 0)::int           AS empty,
         COUNT(*) FILTER (WHERE LENGTH(chunk_text) > $3)::int                AS oversized,
         COUNT(*) FILTER (WHERE LENGTH(chunk_text) < $4)::int                AS undersized,
         COUNT(*) FILTER (WHERE embedding IS NULL)::int                      AS no_vectors,
         MAX(chunk_index)::int                                               AS max_index,
         MIN(chunk_index)::int                                               AS min_index
       FROM ${schema}.local_knowledge_chunks
       WHERE tenant_id = $1
         AND document_id = $2`,
      [tenantId, documentId, MAX_CHUNK_SIZE, MIN_CHUNK_SIZE],
    );

    const r = rows[0];
    const total = r.total;

    if (total === 0) {
      return {
        valid: false,
        totalChunks: 0,
        issues: ['No chunks found for this document'],
        emptyChunks: 0,
        oversizedChunks: 0,
        undersizedChunks: 0,
        chunksWithoutVectors: 0,
      };
    }

    if (r.empty > 0) {
      issues.push(`${r.empty} empty chunk(s) found`);
    }

    if (r.oversized > 0) {
      issues.push(`${r.oversized} chunk(s) exceed maximum size of ${MAX_CHUNK_SIZE} characters`);
    }

    if (r.undersized > 0) {
      issues.push(`${r.undersized} chunk(s) are below minimum size of ${MIN_CHUNK_SIZE} characters`);
    }

    if (r.no_vectors > 0) {
      issues.push(`${r.no_vectors} chunk(s) are missing embedding vectors`);
    }

    // Check index continuity (should be 0..N-1 or 1..N without gaps)
    const expectedRange = r.max_index - r.min_index + 1;
    if (expectedRange !== total) {
      issues.push(
        `Chunk index gap detected: indices span ${r.min_index}–${r.max_index} but only ${total} chunks exist`,
      );
    }

    return {
      valid: issues.length === 0,
      totalChunks: total,
      issues,
      emptyChunks: r.empty,
      oversizedChunks: r.oversized,
      undersizedChunks: r.undersized,
      chunksWithoutVectors: r.no_vectors,
    };
  } catch (err) {
    logger.error('[LKValidation] Chunk validation failed', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return {
      valid: false,
      totalChunks: 0,
      issues: ['Chunk validation query failed'],
      emptyChunks: 0,
      oversizedChunks: 0,
      undersizedChunks: 0,
      chunksWithoutVectors: 0,
    };
  }
}

// ═══════════════════════════════════════════════
// validateSearchIndex — Index integrity check
// ═══════════════════════════════════════════════

/**
 * Validate search index integrity for the entire tenant knowledge base.
 * 1. Check for orphaned chunks (no parent document).
 * 2. Check for stale embeddings (older than 7 days without re-indexing).
 */
export async function validateSearchIndex(
  tenantId: string,
): Promise<SearchIndexValidationResult> {
  const schema = tenantSchema(tenantId);
  const recommendations: string[] = [];

  try {
    const { rows } = await safeQuery(
      `SELECT
         (
           SELECT COUNT(*)::int
           FROM ${schema}.local_knowledge_chunks c
           WHERE c.tenant_id = $1
             AND NOT EXISTS (
               SELECT 1 FROM ${schema}.local_knowledge_documents d
               WHERE d.document_id = c.document_id
             )
         ) AS orphaned_chunks,
         (
           SELECT COUNT(*)::int
           FROM ${schema}.local_knowledge_chunks c
           WHERE c.tenant_id = $1
             AND c.embedding IS NOT NULL
             AND c.created_at < NOW() - INTERVAL '7 days'
             AND NOT EXISTS (
               SELECT 1 FROM ${schema}.local_knowledge_index i
               WHERE i.knowledge_item_id = c.chunk_id
                 AND i.knowledge_item_type = 'chunk'
                 AND i.indexed_at > c.created_at
             )
         ) AS stale_embeddings`,
      [tenantId],
    );

    const r = rows[0];
    const orphaned = r.orphaned_chunks;
    const stale = r.stale_embeddings;

    if (orphaned > 0) {
      recommendations.push(
        `Delete ${orphaned} orphaned chunk(s) that reference deleted documents.`,
      );
    }

    if (stale > 0) {
      recommendations.push(
        `Re-index ${stale} chunk(s) with stale embeddings (older than 7 days without re-indexing).`,
      );
    }

    // Additional: check for documents with no chunks at all
    try {
      const { rows: noChunkRows } = await safeQuery(
        `SELECT COUNT(*)::int AS cnt
         FROM ${schema}.local_knowledge_documents d
         WHERE d.tenant_id = $1
           AND d.status = 'active'
           AND d.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM ${schema}.local_knowledge_chunks c
             WHERE c.document_id = d.document_id
           )`,
        [tenantId],
      );
      if (noChunkRows[0]?.cnt > 0) {
        recommendations.push(
          `${noChunkRows[0].cnt} active document(s) have no chunks. Re-ingest to create searchable chunks.`,
        );
      }
    } catch { /* non-critical */ }

    // Additional: check for index entries pointing to deleted items
    try {
      const { rows: danglingRows } = await safeQuery(
        `SELECT COUNT(*)::int AS cnt
         FROM ${schema}.local_knowledge_index i
         WHERE i.tenant_id = $1
           AND i.knowledge_item_type = 'document'
           AND NOT EXISTS (
             SELECT 1 FROM ${schema}.local_knowledge_documents d
             WHERE d.document_id = i.knowledge_item_id
           )`,
        [tenantId],
      );
      if (danglingRows[0]?.cnt > 0) {
        recommendations.push(
          `${danglingRows[0].cnt} index entries point to deleted documents. Clean up stale index entries.`,
        );
      }
    } catch { /* non-critical */ }

    if (recommendations.length === 0) {
      recommendations.push('Search index is healthy. No integrity issues found.');
    }

    return {
      valid: orphaned === 0 && stale === 0,
      orphanedChunks: orphaned,
      staleEmbeddings: stale,
      recommendations,
    };
  } catch (err) {
    logger.error('[LKValidation] Search index validation failed', {
      tenantId,
      error: (err as Error).message,
    });
    return {
      valid: false,
      orphanedChunks: 0,
      staleEmbeddings: 0,
      recommendations: ['Search index validation query failed — check database connectivity'],
    };
  }
}

// ═══════════════════════════════════════════════
// Internal: AI content quality assessment
// ═══════════════════════════════════════════════

interface AiContentAssessment {
  isReadable: boolean;
  isGrcRelevant: boolean;
  detectedLanguage: string;
  hasPII: boolean;
  piiTypes: string[];
  qualityNotes: string | null;
}

/**
 * Use Claude AI to assess content quality. Analyzes a truncated sample
 * of the document text for readability, relevance, language, and PII.
 * This is a best-effort enhancement — callers should handle failures gracefully.
 */
async function assessContentQuality(text: string): Promise<AiContentAssessment> {
  // Truncate to first 3000 chars for cost efficiency
  const sample = text.slice(0, 3000);

  try {

    const { claudeJSON } = await import('../../../../config/claude-client');

    const result = await claudeJSON({
      systemPrompt: `You are a GRC document quality assessor. Analyze the provided text sample and return a JSON object with these exact fields:
- isReadable (boolean): Is the text readable and parseable (not garbled/corrupted)?
- isGrcRelevant (boolean): Is the content related to governance, risk management, or compliance?
- detectedLanguage (string): ISO 639-1 code (e.g., "en", "ar", "fr")
- hasPII (boolean): Does the text contain personally identifiable information?
- piiTypes (string[]): Types of PII found (e.g., "email", "phone", "national_id", "name", "address")
- qualityNotes (string|null): Brief note on content quality issues, or null if none.
Respond ONLY with valid JSON. No markdown, no explanation.`,
      userMessage: sample,
    });

    return {
      isReadable: result.isReadable ?? true,
      isGrcRelevant: result.isGrcRelevant ?? false,
      detectedLanguage: result.detectedLanguage ?? 'any',
      hasPII: result.hasPII ?? false,
      piiTypes: Array.isArray(result.piiTypes) ? result.piiTypes : [],
      qualityNotes: result.qualityNotes ?? null,
    };
  } catch (err) {
    logger.warn('[LKValidation] AI content assessment failed', {
      error: (err as Error).message,
    });
    // Return safe defaults when AI is unavailable
    return {
      isReadable: true,
      isGrcRelevant: false,
      detectedLanguage: 'any',
      hasPII: false,
      piiTypes: [],
      qualityNotes: 'AI assessment unavailable',
    };
  }
}

// ═══════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════

/**
 * Best-effort MIME type guess from the parser name stored during ingestion.
 */
function guessMimeFromParser(parser: string): string | null {
  const lower = parser.toLowerCase();
  if (lower.includes('pdf')) return 'application/pdf';
  if (lower.includes('docx') || lower.includes('word')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.includes('xlsx') || lower.includes('excel') || lower.includes('spreadsheet')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (lower.includes('pptx') || lower.includes('presentation')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (lower.includes('csv')) return 'text/csv';
  if (lower.includes('markdown') || lower.includes('md')) return 'text/markdown';
  if (lower.includes('html')) return 'text/html';
  if (lower.includes('json')) return 'application/json';
  if (lower.includes('xml')) return 'application/xml';
  if (lower.includes('text') || lower.includes('txt') || lower.includes('plain')) return 'text/plain';
  return null;
}
