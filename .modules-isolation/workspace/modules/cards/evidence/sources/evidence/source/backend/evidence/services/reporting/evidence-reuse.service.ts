import { logger } from '../../ports/logger.port';
// ============================================================================
// Shahin — Cross-Framework Evidence Reuse Service
// Tracks how evidence items serve multiple frameworks/controls,
// suggests reuse opportunities to reduce collection burden.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export interface EvidenceReuseEntry {
  evidenceId: string;
  title: string;
  evidenceType: string;
  controlId: string;
  frameworkCode: string | null;
  reuseCount: number;
  servedFrameworks: string[];
  servedControls: string[];
}

/**
 * For each evidence item, determine how many frameworks/controls it satisfies.
 */
export async function getEvidenceReuseMap(tenantId: string): Promise<{
  items: EvidenceReuseEntry[];
  summary: { totalEvidence: number; reusedEvidence: number; avgReuse: number; frameworksCovered: number };
}> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT e.evidence_id, e.title, e.evidence_type, e.control_id, e.framework_code,
            c.framework_code AS control_framework
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
     WHERE e.status NOT IN ('expired', 'rejected', 'archived')
     ORDER BY e.evidence_type, e.created_at DESC
     LIMIT 1000`,
    []
  );

  // Group by evidence_type to find reuse across controls
  const typeMap = new Map<string, any[]>();
  for (const r of res.rows) {
    const key = r.evidence_type || "any";
    if (!typeMap.has(key)) typeMap.set(key, []);
    typeMap.get(key)!.push(r);
  }

  const items: EvidenceReuseEntry[] = [];
  const allFrameworks = new Set<string>();

  for (const r of res.rows) {
    const sameType = typeMap.get(r.evidence_type || "any") || [];
    const servedControls = [...new Set(sameType.map((s: GenericRow) => s.control_id).filter(Boolean))];
    const servedFrameworks = [...new Set(sameType.map((s: GenericRow) => s.framework_code || s.control_framework).filter(Boolean))];
    servedFrameworks.forEach((f) => allFrameworks.add(f));

    items.push({
      evidenceId: r.evidence_id,
      title: r.title || "",
      evidenceType: r.evidence_type || "any",
      controlId: r.control_id,
      frameworkCode: r.framework_code || r.control_framework || null,
      reuseCount: servedControls.length - 1,
      servedFrameworks,
      servedControls,
    });
  }

  const reusedEvidence = items.filter((i) => i.reuseCount > 0).length;
  const avgReuse = items.length > 0
    ? Math.round((items.reduce((s, i) => s + i.reuseCount, 0) / items.length) * 10) / 10
    : 0;

  return {
    items,
    summary: {
      totalEvidence: items.length,
      reusedEvidence,
      avgReuse,
      frameworksCovered: allFrameworks.size,
    },
  };
}

export interface ReuseSuggestion {
  controlId: string;
  missingType: string;
  suggestedEvidenceId: string;
  suggestedTitle: string;
  sourceControlId: string;
  sourceFramework: string | null;
}

/**
 * For a control with missing evidence, find existing evidence from other controls
 * that could satisfy the same requirement type.
 */
export async function suggestReuse(tenantId: string, controlId: string): Promise<ReuseSuggestion[]> {
  const schema = tenantSchema(tenantId);

  // Get required types for this control
  const tableCheck = await safeQuery(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = 'control_evidence_requirements'`,
    [schema]
  );

  if (tableCheck.rows.length === 0) return [];

  const reqRes = await safeQuery(
    `SELECT DISTINCT evidence_type_code
     FROM "${schema}".control_evidence_requirements
     WHERE control_id = $1`,
    [controlId]
  );

  // Get already-provided types
  const provRes = await safeQuery(
    `SELECT DISTINCT evidence_type FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`,
    [controlId]
  );
  const providedSet = new Set(provRes.rows.map((r: GenericRow) => r.evidence_type));

  const suggestions: ReuseSuggestion[] = [];

  for (const req of reqRes.rows) {
    const type = req.evidence_type_code;
    if (providedSet.has(type)) continue;

    // Find existing evidence of this type from other controls
    const candidateRes = await safeQuery(
      `SELECT e.evidence_id, e.title, e.control_id, e.framework_code
       FROM "${schema}".evidence e
       WHERE e.evidence_type = $1
         AND e.control_id != $2
         AND e.status IN ('approved', 'active', 'submitted')
       ORDER BY e.created_at DESC
       LIMIT 3`,
      [type, controlId]
    );

    for (const c of candidateRes.rows) {
      suggestions.push({
        controlId,
        missingType: type,
        suggestedEvidenceId: c.evidence_id,
        suggestedTitle: c.title || "",
        sourceControlId: c.control_id,
        sourceFramework: c.framework_code || null,
      });
    }
  }

  return suggestions;
}

// P5.2: Enhanced Evidence Reuse Suggestions
export interface EnhancedReuseSuggestion {
  evidenceId: string;
  title: string;
  controlId: string;
  evidenceType: string | null;
  contentHash: string | null;
  frameworkCode: string | null;
  submittedAt: string;
  matchReasons: string[]; // e.g., ["same_control", "same_hash", "similar_title", "same_type"]
  matchScore: number; // 0-100, higher = better match
  sourceControlId: string;
}

/**
 * P5.2: Suggest existing evidence for reuse when linking evidence.
 *
 * Uses a multi-signal scoring approach:
 *  - Text relevance (60%): PostgreSQL full-text search (ts_vector/ts_query) +
 *    trigram similarity (pg_trgm) for fuzzy title matching
 *  - Control domain match (25%): same control, same framework, or control domain overlap
 *  - Recency (15%): newer evidence scores higher
 *
 * Falls back to ILIKE if full-text search and trigram extensions are unavailable.
 *
 * @param tenantId - Tenant ID
 * @param options - Matching criteria (controlId, title, contentHash, evidenceType)
 * @returns Array of suggested evidence with match reasons and confidence scores
 */
export async function suggestEvidenceReuse(
  tenantId: string,
  options: {
    controlId?: string;
    title?: string;
    contentHash?: string;
    evidenceType?: string;
    limit?: number;
  }
): Promise<EnhancedReuseSuggestion[]> {
  const schema = tenantSchema(tenantId);
  const limit = options.limit || 10;

  // If no criteria provided, return empty (too broad)
  if (!options.controlId && !options.title && !options.contentHash && !options.evidenceType) {
    return [];
  }

  // Detect available PostgreSQL extensions for smart matching
  const extAvailability = await detectSearchExtensions();

  // Try semantic search first (full-text + trigram), fall back to ILIKE
  if (options.title && (extAvailability.hasTrgm || extAvailability.hasFullText)) {
    const results = await semanticSearch(schema, options, limit, extAvailability);
    if (results.length > 0) return results;
  }

  // Fallback: broad query with application-level scoring
  return fallbackIlikeSearch(schema, options, limit);
}

// ============================================================================
// PostgreSQL Extension Detection
// ============================================================================

interface SearchExtensions {
  hasTrgm: boolean;
  hasFullText: boolean;
}

/** Cache extension detection per process lifetime to avoid repeated queries */
let _extensionCache: SearchExtensions | null = null;

/**
 * Check if pg_trgm and full-text search are available in the database.
 * Results are cached for the process lifetime.
 */
async function detectSearchExtensions(): Promise<SearchExtensions> {
  if (_extensionCache) return _extensionCache;

  let hasTrgm = false;
  let hasFullText = true; // ts_vector/ts_query are built-in, always available

  try {
    // Check if pg_trgm extension is installed
    const trgmCheck = await safeQuery(
      `SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`,
      []
    );
    hasTrgm = trgmCheck.rows.length > 0;
  } catch {
    hasTrgm = false;
  }

  // If pg_trgm is not installed, try to create it (requires superuser; fails gracefully)
  if (!hasTrgm) {
    try {
      await safeQuery(`CREATE EXTENSION IF NOT EXISTS pg_trgm`, []);
      hasTrgm = true;
    } catch {
      // Extension creation failed (likely no superuser privileges). Continue without it.
      logger.warn('[EvidenceReuse] pg_trgm extension not available; trigram similarity disabled');
    }
  }

  _extensionCache = { hasTrgm, hasFullText };
  return _extensionCache;
}

// ============================================================================
// Semantic Search (Full-Text + Trigram + Multi-Signal Scoring)
// ============================================================================

/**
 * Perform semantic search using PostgreSQL full-text search and trigram similarity.
 * Scoring weights:
 *  - Text relevance: 60% (full-text rank + trigram similarity)
 *  - Control domain match: 25% (same control, framework, or control domain prefix)
 *  - Recency: 15% (evidence age penalization)
 */
async function semanticSearch(
  schema: string,
  options: {
    controlId?: string;
    title?: string;
    contentHash?: string;
    evidenceType?: string;
  },
  limit: number,
  ext: SearchExtensions,
): Promise<EnhancedReuseSuggestion[]> {
  const params: unknown[] = [];
  let paramIdx = 1;

  // Sanitize search title for full-text query: remove special characters, build tsquery
  const searchTitle = (options.title || '').trim();
  if (!searchTitle) return [];

  // Build the scoring SQL expressions
  const scoreParts: string[] = [];

  // --- Text Relevance Score (weight: 0.60) ---
  // Combine full-text rank and trigram similarity
  const textScoreParts: string[] = [];

  if (ext.hasFullText) {
    // Full-text search: convert title to tsquery tokens
    // Use plainto_tsquery for safe handling of arbitrary input
    params.push(searchTitle);
    textScoreParts.push(
      `ts_rank_cd(to_tsvector('english', COALESCE(e.title, '')), plainto_tsquery('english', $${paramIdx})) * 50`
    );
    paramIdx++;
  }

  if (ext.hasTrgm) {
    // Trigram similarity: 0.0 to 1.0 range, scale to 0-50
    params.push(searchTitle);
    textScoreParts.push(
      `similarity(COALESCE(e.title, ''), $${paramIdx}) * 50`
    );
    paramIdx++;
  }

  // Text relevance component (max ~100 from both sources, then scaled to 60%)
  if (textScoreParts.length > 0) {
    scoreParts.push(`(${textScoreParts.join(' + ')}) * 0.60`);
  }

  // --- Control Domain Match Score (weight: 0.25) ---
  if (options.controlId) {
    // Extract domain prefix from control_id (e.g., "NCA-ECC" from "NCA-ECC::1.1.1")
    const controlDomain = options.controlId.split('::')[0] || options.controlId.split('-').slice(0, 2).join('-');
    params.push(options.controlId);
    params.push(controlDomain + '%');
    scoreParts.push(
      `(CASE
          WHEN e.control_id = $${paramIdx} THEN 25
          WHEN e.control_id LIKE $${paramIdx + 1} THEN 15
          ELSE 0
        END)`
    );
    paramIdx += 2;
  }

  // Framework overlap bonus (part of domain score)
  if (options.controlId) {
    // Look up the framework of the target control to match framework overlap
    params.push(options.controlId);
    scoreParts.push(
      `(CASE
          WHEN e.framework_code = (
            SELECT c2.framework_code FROM "${schema}".controls c2
            WHERE c2.control_id = $${paramIdx} LIMIT 1
          ) THEN 10
          ELSE 0
        END)`
    );
    paramIdx++;
  }

  // --- Recency Score (weight: 0.15, max 15 points) ---
  // Evidence less than 30 days old gets full points; decays linearly over 365 days
  scoreParts.push(
    `GREATEST(0, 15 * (1.0 - EXTRACT(EPOCH FROM (NOW() - COALESCE(e.submitted_at, e.created_at))) / (365 * 86400)))`
  );

  // --- Same hash bonus (exact duplicate = high confidence) ---
  if (options.contentHash) {
    params.push(options.contentHash);
    scoreParts.push(
      `CASE WHEN e.content_hash = $${paramIdx} THEN 30 ELSE 0 END`
    );
    paramIdx++;
  }

  // --- Same type bonus ---
  if (options.evidenceType) {
    params.push(options.evidenceType);
    scoreParts.push(
      `CASE WHEN e.evidence_type = $${paramIdx} THEN 8 ELSE 0 END`
    );
    paramIdx++;
  }

  const totalScoreExpr = scoreParts.length > 0
    ? scoreParts.join(' + ')
    : '0';

  // Build WHERE clause: require at least a minimum text match to avoid noise
  const whereConditions = [
    `e.status NOT IN ('expired', 'rejected', 'archived', 'deleted')`,
    `e.deleted_at IS NULL`,
  ];

  // Use OR-based filtering: match if full-text matches OR trigram similarity > threshold OR exact matches
  const orConditions: string[] = [];

  if (ext.hasFullText) {
    params.push(searchTitle);
    orConditions.push(
      `to_tsvector('english', COALESCE(e.title, '')) @@ plainto_tsquery('english', $${paramIdx})`
    );
    paramIdx++;
  }

  if (ext.hasTrgm) {
    params.push(searchTitle);
    // Trigram threshold: 0.15 is permissive enough for partial matches
    orConditions.push(`similarity(COALESCE(e.title, ''), $${paramIdx}) > 0.15`);
    paramIdx++;
  }

  if (options.contentHash) {
    params.push(options.contentHash);
    orConditions.push(`e.content_hash = $${paramIdx}`);
    paramIdx++;
  }

  if (options.controlId) {
    params.push(options.controlId);
    orConditions.push(`e.control_id = $${paramIdx}`);
    paramIdx++;
  }

  if (options.evidenceType) {
    params.push(options.evidenceType);
    orConditions.push(`e.evidence_type = $${paramIdx}`);
    paramIdx++;
  }

  if (orConditions.length > 0) {
    whereConditions.push(`(${orConditions.join(' OR ')})`);
  }

  params.push(limit * 3); // Fetch more than needed, then score and trim

  const query = `
    SELECT
      e.evidence_id,
      e.title,
      e.control_id,
      e.evidence_type,
      e.content_hash,
      e.framework_code,
      e.submitted_at,
      e.created_at,
      c.title AS control_title,
      c.framework_code AS control_framework,
      (${totalScoreExpr}) AS relevance_score
    FROM "${schema}".evidence e
    LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY relevance_score DESC, e.created_at DESC
    LIMIT $${paramIdx}
  `;

  const result = await safeQuery(query, params);

  if (result.rows.length === 0) return [];

  // Build suggestion objects with match reasons
  const suggestions: EnhancedReuseSuggestion[] = result.rows.map((row: GenericRow) => {
    const matchReasons: string[] = [];
    const rawScore = parseFloat(row.relevance_score) || 0;

    // Determine match reasons from the data
    if (options.contentHash && row.content_hash === options.contentHash) {
      matchReasons.push('same_hash');
    }
    if (options.controlId && row.control_id === options.controlId) {
      matchReasons.push('same_control');
    }
    if (options.controlId && row.control_id !== options.controlId) {
      const targetDomain = options.controlId.split('::')[0] || '';
      const rowDomain = (row.control_id || '').split('::')[0] || '';
      if (targetDomain && rowDomain && targetDomain === rowDomain) {
        matchReasons.push('same_domain');
      }
    }
    if (options.evidenceType && row.evidence_type === options.evidenceType) {
      matchReasons.push('same_type');
    }
    if (options.title && row.title) {
      const titleLower = options.title.toLowerCase();
      const rowTitleLower = row.title.toLowerCase();
      if (rowTitleLower.includes(titleLower) || titleLower.includes(rowTitleLower)) {
        matchReasons.push('similar_title');
      } else {
        // If we got here via full-text or trigram, it's a semantic match
        matchReasons.push('text_relevance');
      }
    }
    if (options.controlId) {
      const targetFramework = options.controlId.split('::')[0]?.split('-').slice(0, 1).join('-');
      const rowFramework = row.framework_code || row.control_framework || '';
      if (targetFramework && rowFramework && rowFramework.includes(targetFramework)) {
        matchReasons.push('framework_overlap');
      }
    }

    // Ensure at least one reason
    if (matchReasons.length === 0) matchReasons.push('partial_match');

    // Normalize score to 0-100 range
    // Maximum theoretical score: 60 (text) + 25 (control) + 10 (framework) + 15 (recency) + 30 (hash) + 8 (type) = 148
    const normalizedScore = Math.min(100, Math.round((rawScore / 120) * 100));

    return {
      evidenceId: row.evidence_id,
      title: row.title || '',
      controlId: row.control_id || '',
      evidenceType: row.evidence_type || null,
      contentHash: row.content_hash || null,
      frameworkCode: row.framework_code || null,
      submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
      matchReasons,
      matchScore: normalizedScore,
      sourceControlId: row.control_id || '',
    };
  });

  // Sort by score descending and return top N
  suggestions.sort((a, b) => b.matchScore - a.matchScore);
  return suggestions.slice(0, limit);
}

// ============================================================================
// Fallback ILIKE Search
// ============================================================================

/**
 * Fallback search using ILIKE when full-text search and trigram extensions
 * are unavailable. Uses basic string matching with application-level scoring.
 */
async function fallbackIlikeSearch(
  schema: string,
  options: {
    controlId?: string;
    title?: string;
    contentHash?: string;
    evidenceType?: string;
  },
  limit: number,
): Promise<EnhancedReuseSuggestion[]> {
  const conditions: string[] = [
    `e.status NOT IN ('expired', 'rejected', 'archived', 'deleted')`,
    `e.deleted_at IS NULL`,
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

  // Build OR conditions so we can find matches across multiple signals
  const orConditions: string[] = [];

  if (options.controlId) {
    params.push(options.controlId);
    orConditions.push(`e.control_id = $${paramIdx}`);
    paramIdx++;
    // Also match control domain prefix
    const domain = options.controlId.split('::')[0] || options.controlId;
    params.push(domain + '%');
    orConditions.push(`e.control_id LIKE $${paramIdx}`);
    paramIdx++;
  }

  if (options.contentHash) {
    params.push(options.contentHash);
    orConditions.push(`e.content_hash = $${paramIdx}`);
    paramIdx++;
  }

  if (options.title) {
    // Split title into words for broader ILIKE matching
    const words = options.title.trim().split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      // Match title containing any significant word
      const wordConditions = words.slice(0, 5).map(word => {
        params.push(`%${word}%`);
        const cond = `e.title ILIKE $${paramIdx}`;
        paramIdx++;
        return cond;
      });
      orConditions.push(`(${wordConditions.join(' OR ')})`);
    } else {
      params.push(`%${options.title}%`);
      orConditions.push(`e.title ILIKE $${paramIdx}`);
      paramIdx++;
    }
  }

  if (options.evidenceType) {
    params.push(options.evidenceType);
    orConditions.push(`e.evidence_type = $${paramIdx}`);
    paramIdx++;
  }

  if (orConditions.length === 0) return [];

  conditions.push(`(${orConditions.join(' OR ')})`);

  params.push(limit * 3);

  const query = `
    SELECT
      e.evidence_id,
      e.title,
      e.control_id,
      e.evidence_type,
      e.content_hash,
      e.framework_code,
      e.submitted_at,
      e.created_at,
      c.title AS control_title,
      c.framework_code AS control_framework
    FROM "${schema}".evidence e
    LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.created_at DESC
    LIMIT $${paramIdx}
  `;

  const result = await safeQuery(query, params);

  // Application-level scoring
  const suggestions: EnhancedReuseSuggestion[] = result.rows.map((row: GenericRow) => {
    const matchReasons: string[] = [];
    let matchScore = 0;

    // Same hash (weight: 30)
    if (options.contentHash && row.content_hash === options.contentHash) {
      matchReasons.push('same_hash');
      matchScore += 30;
    }

    // Same control (weight: 25)
    if (options.controlId && row.control_id === options.controlId) {
      matchReasons.push('same_control');
      matchScore += 25;
    }

    // Control domain overlap (weight: 15)
    if (options.controlId && row.control_id !== options.controlId) {
      const targetDomain = options.controlId.split('::')[0] || '';
      const rowDomain = (row.control_id || '').split('::')[0] || '';
      if (targetDomain && rowDomain && targetDomain === rowDomain) {
        matchReasons.push('same_domain');
        matchScore += 15;
      }
    }

    // Same type (weight: 10)
    if (options.evidenceType && row.evidence_type === options.evidenceType) {
      matchReasons.push('same_type');
      matchScore += 10;
    }

    // Title similarity (weight: 20, using word overlap)
    if (options.title && row.title) {
      const searchWords = new Set(options.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
      const rowWords = new Set((row.title as string).toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
      const overlap = [...searchWords].filter(w => rowWords.has(w)).length;
      const maxWords = Math.max(searchWords.size, 1);
      const titleScore = Math.round((overlap / maxWords) * 20);
      if (titleScore > 0) {
        matchReasons.push('similar_title');
        matchScore += titleScore;
      }
    }

    // Recency bonus (weight: 15, based on age)
    const ageMs = Date.now() - new Date(row.submitted_at || row.created_at || Date.now()).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, Math.round(15 * (1 - ageDays / 365)));
    matchScore += recencyScore;

    if (matchReasons.length === 0) matchReasons.push('partial_match');

    return {
      evidenceId: row.evidence_id,
      title: row.title || '',
      controlId: row.control_id || '',
      evidenceType: row.evidence_type || null,
      contentHash: row.content_hash || null,
      frameworkCode: row.framework_code || null,
      submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
      matchReasons,
      matchScore: Math.min(100, matchScore),
      sourceControlId: row.control_id || '',
    };
  });

  suggestions.sort((a, b) => b.matchScore - a.matchScore);
  return suggestions.slice(0, limit);
}

// ============================================================================
// Enterprise Reuse — Orphan Detection, Linking, Duplicate Management
// ============================================================================

/**
 * Detect orphan evidence — items not linked to any control, obligation, audit, or entity.
 */
export async function detectOrphans(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT e.evidence_id, e.title, e.evidence_type, e.status, e.created_at, e.owner_user_id
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
     WHERE e.status NOT IN ('expired', 'rejected', 'archived', 'deleted', 'disposed')
       AND e.deleted_at IS NULL
       AND e.control_id IS NULL
       AND el.id IS NULL
     ORDER BY e.created_at DESC`,
    []
  );
  return result.rows;
}

/**
 * Mark evidence as reusable across controls/obligations.
 */
export async function markAsReusable(tenantId: string, evidenceId: string, _userId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const ev = await safeQuery(`SELECT evidence_id FROM "${schema}".evidence WHERE evidence_id = $1`, [evidenceId]);
  if (ev.rows.length === 0) throw Object.assign(new Error('Evidence not found'), { statusCode: 404 });
  const result = await safeQuery(
    `UPDATE "${schema}".evidence SET reusable_flag = true, updated_at = NOW() WHERE evidence_id = $1 RETURNING *`,
    [evidenceId]
  );
  return getFirstRow(result);
}

/**
 * Remove reusable flag from evidence.
 */
export async function unmarkReusable(tenantId: string, evidenceId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".evidence SET reusable_flag = false, updated_at = NOW() WHERE evidence_id = $1 RETURNING *`,
    [evidenceId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Evidence not found'), { statusCode: 404 });
  return getFirstRow(result);
}

/**
 * Link evidence to any entity (control, obligation, audit, risk, policy, issue).
 */
export async function linkToObject(
  tenantId: string,
  evidenceId: string,
  objectType: string,
  objectId: string,
  linkType: string,
  userId: string,
  notes?: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const ev = await safeQuery(`SELECT evidence_id FROM "${schema}".evidence WHERE evidence_id = $1`, [evidenceId]);
  if (ev.rows.length === 0) throw Object.assign(new Error('Evidence not found'), { statusCode: 404 });

  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_links (evidence_id, linked_object_type, linked_object_id, link_type, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [evidenceId, objectType, objectId, linkType || 'supports', notes || null, userId]
  );
  return result.rows.length > 0 ? getFirstRow(result) : { message: 'Link already exists' };
}

/**
 * Remove a link from evidence.
 */
export async function unlinkFromObject(tenantId: string, evidenceId: string, linkId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".evidence_links WHERE id = $1 AND evidence_id = $2`,
    [linkId, evidenceId]
  );
  if (result.rowCount === 0) throw Object.assign(new Error('Link not found'), { statusCode: 404 });
}

/**
 * Get all links for an evidence item.
 */
export async function getEvidenceLinks(tenantId: string, evidenceId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, evidence_id, linked_object_type, linked_object_id, link_type, notes, created_by, created_at
     FROM "${schema}".evidence_links
     WHERE evidence_id = $1
     ORDER BY created_at DESC`,
    [evidenceId]
  );
  return result.rows;
}

/**
 * Get duplicate candidates (unresolved).
 */
export async function getDuplicateCandidates(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT dc.id, dc.evidence_a_id, dc.evidence_b_id, dc.similarity_score,
            dc.detection_method, dc.detected_at,
            ea.title AS title_a, eb.title AS title_b,
            ea.evidence_type AS type_a, eb.evidence_type AS type_b
     FROM "${schema}".evidence_duplicate_candidates dc
     JOIN "${schema}".evidence ea ON ea.evidence_id = dc.evidence_a_id
     JOIN "${schema}".evidence eb ON eb.evidence_id = dc.evidence_b_id
     WHERE dc.resolved = false
     ORDER BY dc.similarity_score DESC, dc.detected_at DESC`,
    []
  );
  return result.rows;
}

/**
 * Resolve a duplicate candidate.
 */
export async function resolveDuplicate(
  tenantId: string,
  candidateId: string,
  resolution: string,
  userId: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const validResolutions = ['merged', 'not_duplicate', 'ignored', 'archived_one'];
  if (!validResolutions.includes(resolution)) {
    throw Object.assign(new Error(`Invalid resolution. Must be one of: ${validResolutions.join(', ')}`), { statusCode: 400 });
  }
  const result = await safeQuery(
    `UPDATE "${schema}".evidence_duplicate_candidates
     SET resolved = true, resolution = $1, resolved_by = $2, resolved_at = NOW()
     WHERE id = $3 RETURNING *`,
    [resolution, userId, candidateId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Duplicate candidate not found'), { statusCode: 404 });
  return getFirstRow(result);
}

/**
 * Get reusable evidence — evidence marked as reusable with link counts.
 */
export async function getReusableEvidence(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT e.evidence_id, e.title, e.evidence_type, e.status, e.framework_code,
            e.control_id, e.created_at,
            COUNT(el.id) AS link_count
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_links el ON el.evidence_id = e.evidence_id
     WHERE e.reusable_flag = true
       AND e.status NOT IN ('expired', 'rejected', 'archived', 'deleted', 'disposed')
       AND e.deleted_at IS NULL
     GROUP BY e.evidence_id, e.title, e.evidence_type, e.status, e.framework_code, e.control_id, e.created_at
     ORDER BY link_count DESC, e.created_at DESC`,
    []
  );
  return result.rows;
}
