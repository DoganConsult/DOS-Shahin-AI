// ============================================
// Vector Search Utilities
// Shared pgvector similarity search functions for Temporal activities.
// Falls back to ts_rank / ILIKE when embedding column is absent or embed fails.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '@dos/db';
import { embedText, vectorToSql } from '../../modules/ai/services/memory/memory-store.service';
import { columnExists, getFirstRow } from '../../utils/db-utils';
import { DEFAULT_EMBEDDING_DIM } from '@dos/ai-gateway/vector-store.service';

const EMBEDDING_DIM = DEFAULT_EMBEDDING_DIM;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const DEFAULT_LIMIT = 10;

/** Scale ts_rank (typically small) into [0,1] for threshold comparison with vector cosine similarity. */
function scaleTsRank(rank: number | null | undefined): number {
  return Math.min(1, Math.max(0, (Number(rank) || 0) * 8));
}

function embeddingToVector(embedding: number[]): string {
  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(`Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${embedding.length}`);
  }
  return vectorToSql(embedding);
}

async function safeQueryEmbedding(queryText: string): Promise<number[] | null> {
  try {
    return await embedText(queryText);
  } catch {
    return null;
  }
}

/**
 * Find similar evidence items using vector similarity when `evidence.embedding` exists.
 */
export async function findSimilarEvidence(
  tenantId: string,
  queryText: string,
  controlId?: string,
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  limit: number = DEFAULT_LIMIT,
): Promise<Array<{
  evidenceId: string;
  controlId: string;
  similarity: number;
  title?: string;
  artifactType?: string;
}>> {
  const schema = tenantSchema(tenantId);
  const hasEmb = await columnExists(schema, 'evidence', 'embedding');
  const queryEmbedding = hasEmb ? await safeQueryEmbedding(queryText) : null;

  const conditions: string[] = ['e.deleted_at IS NULL'];
  const params: unknown[] = [];
  let p = 1;

  if (controlId) {
    conditions.push(`e.control_id = $${p++}`);
    params.push(controlId);
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  if (hasEmb && queryEmbedding) {
    const vectorSql = embeddingToVector(queryEmbedding);
    const vParams: unknown[] = [vectorSql];
    let vp = 2;
    let extraWhere = '';
    if (controlId) {
      extraWhere += ` AND e.control_id = $${vp}`;
      vParams.push(controlId);
      vp++;
    }
    vParams.push(similarityThreshold, limit);
    const threshPl = vp;
    const limitPl = vp + 1;
    const result = await safeQuery(
      `SELECT
         e.evidence_id,
         e.control_id,
         e.title,
         e.framework_code AS artifact_type,
         (1 - (e.embedding <=> $1::vector))::double precision AS similarity
       FROM "${schema}".evidence e
       WHERE e.status IN ('approved', 'active')
         AND (e.expiry_date IS NULL OR e.expiry_date > CURRENT_DATE)
         ${extraWhere}
         AND e.embedding IS NOT NULL
         AND (1 - (e.embedding <=> $1::vector)) >= $${threshPl}
       ORDER BY e.embedding <=> $1
       LIMIT $${limitPl}`,
      vParams,
    );
    return result.rows.map((r) => ({
      evidenceId: r.evidence_id,
      controlId: r.control_id,
      similarity: parseFloat(String(r.similarity ?? '0')),
      title: r.title,
      artifactType: r.artifact_type,
    }));
  }

  const textMatch = `%${queryText.trim().toLowerCase()}%`;
  const likeIdx = p++;
  params.push(textMatch);
  const limitIdx = p++;
  params.push(limit);

  const result = await safeQuery(
    `SELECT
       e.evidence_id,
       e.control_id,
       e.title,
       e.framework_code AS artifact_type,
       CASE
         WHEN LOWER(COALESCE(e.title, '')) LIKE $${likeIdx} THEN 0.9
         WHEN LOWER(COALESCE(e.description, '')) LIKE $${likeIdx} THEN 0.7
         ELSE 0.5
       END AS similarity
     FROM "${schema}".evidence e
     WHERE e.status IN ('approved', 'active')
       AND (e.expiry_date IS NULL OR e.expiry_date > CURRENT_DATE)
       AND (LOWER(COALESCE(e.title, '')) LIKE $${likeIdx} OR LOWER(COALESCE(e.description, '')) LIKE $${likeIdx})
       ${whereClause}
     ORDER BY similarity DESC, e.submitted_at DESC NULLS LAST
     LIMIT $${limitIdx}`,
    params,
  );

  return result.rows
    .filter((r) => parseFloat(String(r.similarity ?? '0')) >= similarityThreshold)
    .map((r) => ({
      evidenceId: r.evidence_id,
      controlId: r.control_id,
      similarity: parseFloat(String(r.similarity ?? '0')),
      title: r.title,
      artifactType: r.artifact_type,
    }));
}

/**
 * Find similar controls (baseline: title, description, framework_id, search_vector).
 */
export async function findSimilarControls(
  tenantId: string,
  queryText: string,
  frameworkVersionId?: string,
  excludeControlIds: string[] = [],
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  limit: number = DEFAULT_LIMIT,
): Promise<Array<{
  controlId: string;
  controlCode: string;
  titleEn: string;
  titleAr?: string;
  frameworkVersionId: string;
  similarity: number;
}>> {
  const schema = tenantSchema(tenantId);
  const hasFv = await columnExists(schema, 'controls', 'framework_version_id');
  const hasEmb = await columnExists(schema, 'controls', 'embedding');
  const queryEmbedding = hasEmb ? await safeQueryEmbedding(queryText) : null;

  const fwCol = hasFv ? 'c.framework_version_id' : 'c.framework_id';
  const exclude = excludeControlIds.length > 0 ? excludeControlIds : [];

  if (hasEmb && queryEmbedding) {
    const vectorSql = embeddingToVector(queryEmbedding);
    const params: unknown[] = [vectorSql];
    let next = 2;
    let fwClause = 'TRUE';
    if (frameworkVersionId) {
      fwClause = `${fwCol} = $${next}`;
      params.push(frameworkVersionId);
      next++;
    }
    let excludeClause = '';
    if (exclude.length > 0) {
      excludeClause = `AND NOT (c.control_id = ANY($${next}::varchar[]))`;
      params.push(exclude);
      next++;
    }
    const threshIdx = next;
    const limitIdx = next + 1;
    params.push(similarityThreshold, limit);

    const sql = `SELECT
       c.control_id,
       c.control_id AS control_code,
       c.title AS title_en,
       NULL::text AS title_ar,
       COALESCE(${fwCol}::text, '') AS framework_version_id,
       (1 - (c.embedding <=> $1::vector))::double precision AS similarity
     FROM "${schema}".controls c
     WHERE c.deleted_at IS NULL
       AND (${fwClause})
       ${excludeClause}
       AND c.embedding IS NOT NULL
       AND (1 - (c.embedding <=> $1::vector)) >= $${threshIdx}
     ORDER BY c.embedding <=> $1
     LIMIT $${limitIdx}`;

    const result = await safeQuery(sql, params);
    return result.rows.map((r) => ({
      controlId: r.control_id,
      controlCode: r.control_code,
      titleEn: r.title_en,
      titleAr: r.title_ar ?? undefined,
      frameworkVersionId: r.framework_version_id,
      similarity: parseFloat(String(r.similarity ?? '0')),
    }));
  }

  const params: unknown[] = [queryText];
  let next = 2;
  let fwClause = 'TRUE';
  if (frameworkVersionId) {
    fwClause = `${fwCol} = $${next}`;
    params.push(frameworkVersionId);
    next++;
  }
  let excludeClause = '';
  if (exclude.length > 0) {
    excludeClause = `AND NOT (c.control_id = ANY($${next}::varchar[]))`;
    params.push(exclude);
    next++;
  }
  params.push(limit);
  const limitIdx = next;

  const result = await safeQuery(
    `SELECT
       c.control_id,
       c.control_id AS control_code,
       c.title AS title_en,
       NULL::text AS title_ar,
       COALESCE(${fwCol}::text, '') AS framework_version_id,
       LEAST(1.0, COALESCE(ts_rank(
         COALESCE(c.search_vector, to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.description, ''))),
         plainto_tsquery('english', $1)
       ), 0) * 8) AS similarity
     FROM "${schema}".controls c
     WHERE c.deleted_at IS NULL
       AND (${fwClause})
       ${excludeClause}
     ORDER BY similarity DESC
     LIMIT $${limitIdx}`,
    params,
  );

  return result.rows
    .filter((r) => scaleTsRank(parseFloat(String(r.similarity ?? '0'))) >= similarityThreshold)
    .map((r) => ({
      controlId: r.control_id,
      controlCode: r.control_code,
      titleEn: r.title_en,
      titleAr: r.title_ar ?? undefined,
      frameworkVersionId: r.framework_version_id,
      similarity: scaleTsRank(parseFloat(String(r.similarity ?? '0'))),
    }));
}

/**
 * Find similar regulatory content: controls, frameworks, or governance_obligations.
 */
export async function findSimilarRegulatoryContent(
  tenantId: string,
  queryText: string,
  contentType: 'control' | 'framework' | 'obligation' = 'control',
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  limit: number = DEFAULT_LIMIT,
): Promise<Array<{
  contentId: string;
  titleEn: string;
  titleAr?: string;
  contentType: string;
  similarity: number;
  frameworkVersionId?: string;
}>> {
  const schema = tenantSchema(tenantId);

  if (contentType === 'control') {
    const rows = await findSimilarControls(
      tenantId,
      queryText,
      undefined,
      [],
      similarityThreshold,
      limit,
    );
    return rows.map((r) => ({
      contentId: r.controlId,
      titleEn: r.titleEn,
      titleAr: r.titleAr,
      contentType: 'control',
      similarity: r.similarity,
      frameworkVersionId: r.frameworkVersionId || undefined,
    }));
  }

  if (contentType === 'framework') {
    const hasEmb = await columnExists(schema, 'frameworks', 'embedding');
    const queryEmbedding = hasEmb ? await safeQueryEmbedding(queryText) : null;
    if (hasEmb && queryEmbedding) {
      const vectorSql = embeddingToVector(queryEmbedding);
      const result = await safeQuery(
        `SELECT
           f.framework_id AS content_id,
           f.name AS title_en,
           NULL::text AS title_ar,
           (1 - (f.embedding <=> $1::vector))::double precision AS similarity
         FROM "${schema}".frameworks f
         WHERE f.deleted_at IS NULL
           AND (f.removed_by_admin IS NOT TRUE)
           AND f.embedding IS NOT NULL
           AND (1 - (f.embedding <=> $1::vector)) >= $2
         ORDER BY f.embedding <=> $1
         LIMIT $3`,
        [vectorSql, similarityThreshold, limit],
      );
      return result.rows.map((r) => ({
        contentId: r.content_id,
        titleEn: r.title_en,
        titleAr: r.title_ar ?? undefined,
        contentType: 'framework',
        similarity: parseFloat(String(r.similarity ?? '0')),
      }));
    }
    const result = await safeQuery(
      `SELECT
         f.framework_id AS content_id,
         f.name AS title_en,
         NULL::text AS title_ar,
         LEAST(1.0, COALESCE(ts_rank(
           to_tsvector('english', COALESCE(f.name, '') || ' ' || COALESCE(f.description, '')),
           plainto_tsquery('english', $1)
         ), 0) * 8) AS similarity
       FROM "${schema}".frameworks f
       WHERE f.deleted_at IS NULL
         AND (f.removed_by_admin IS NOT TRUE)
       ORDER BY similarity DESC
       LIMIT $2`,
      [queryText, limit],
    );
    return result.rows
      .filter((r) => scaleTsRank(parseFloat(String(r.similarity ?? '0'))) >= similarityThreshold)
      .map((r) => ({
        contentId: r.content_id,
        titleEn: r.title_en,
        titleAr: r.title_ar ?? undefined,
        contentType: 'framework',
        similarity: scaleTsRank(parseFloat(String(r.similarity ?? '0'))),
      }));
  }

  // obligation → governance_obligations
  const hasEmb = await columnExists(schema, 'governance_obligations', 'embedding');
  const queryEmbedding = hasEmb ? await safeQueryEmbedding(queryText) : null;
  if (hasEmb && queryEmbedding) {
    const vectorSql = embeddingToVector(queryEmbedding);
    const result = await safeQuery(
      `SELECT
         o.obligation_id AS content_id,
         o.title_en,
         o.title_ar,
         (1 - (o.embedding <=> $1::vector))::double precision AS similarity
       FROM "${schema}".governance_obligations o
       WHERE o.deleted_at IS NULL
         AND o.status = 'active'
         AND o.embedding IS NOT NULL
         AND (1 - (o.embedding <=> $1::vector)) >= $2
       ORDER BY o.embedding <=> $1
       LIMIT $3`,
      [vectorSql, similarityThreshold, limit],
    );
    return result.rows.map((r) => ({
      contentId: r.content_id,
      titleEn: r.title_en,
      titleAr: r.title_ar ?? undefined,
      contentType: 'obligation',
      similarity: parseFloat(String(r.similarity ?? '0')),
    }));
  }

  const q = `%${queryText.trim().toLowerCase()}%`;
  const result = await safeQuery(
    `SELECT
       o.obligation_id AS content_id,
       o.title_en,
       o.title_ar,
       CASE
         WHEN LOWER(COALESCE(o.title_en, '')) LIKE $1 THEN 0.9
         WHEN LOWER(COALESCE(o.description, '')) LIKE $1 THEN 0.7
         ELSE 0.5
       END AS similarity
     FROM "${schema}".governance_obligations o
     WHERE o.deleted_at IS NULL
       AND o.status = 'active'
       AND (
         LOWER(COALESCE(o.title_en, '')) LIKE $1
         OR LOWER(COALESCE(o.title_ar, '')) LIKE $1
         OR LOWER(COALESCE(o.description, '')) LIKE $1
       )
     ORDER BY similarity DESC
     LIMIT $2`,
    [q, limit],
  );
  return result.rows
    .filter((r) => parseFloat(String(r.similarity ?? '0')) >= similarityThreshold)
    .map((r) => ({
      contentId: r.content_id,
      titleEn: r.title_en,
      titleAr: r.title_ar ?? undefined,
      contentType: 'obligation',
      similarity: parseFloat(String(r.similarity ?? '0')),
    }));
}

/**
 * Map control from one framework to another using semantic similarity.
 */
export async function mapControlToFramework(
  tenantId: string,
  sourceControlId: string,
  targetFrameworkVersionId: string,
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD,
): Promise<{
  targetControlId: string | null;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
} | null> {
  const schema = tenantSchema(tenantId);

  const sourceResult = await safeQuery(
    `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE control_id = $1 AND deleted_at IS NULL`,
    [sourceControlId],
  );

    const sourceControl = getFirstRow<{ title: string; description?: string }>(sourceResult);
  if (!sourceControl) {
    return null;
  }

  const queryText = `${sourceControl.title} ${sourceControl.description || ''}`.trim();

  const similar = await findSimilarControls(
    tenantId,
    queryText,
    targetFrameworkVersionId,
    [sourceControlId],
    similarityThreshold,
    1,
  );

  if (similar.length === 0) {
    return null;
  }

  const match = similar[0];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (match.similarity >= 0.85) {
    confidence = 'high';
  } else if (match.similarity >= 0.75) {
    confidence = 'medium';
  }

  return {
    targetControlId: match.controlId,
    similarity: match.similarity,
    confidence,
  };
}
