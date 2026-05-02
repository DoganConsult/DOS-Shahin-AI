// ============================================================================
// Shahin -- Evidence AI Service
// AI-powered evidence assistance: metadata suggestion, linkage proposals,
// duplicate detection, and AI status reporting.
// All AI calls are gated behind the AGRC_AI_ENABLED feature flag.
// ============================================================================

import { safeQuery, tenantSchema, emptyResult } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { eventBus } from '../../ports/events.port';
import { logger } from '../../ports/logger.port';
import { claudeJSON } from '../../ports/ai.port';

// ── Types ──

export interface EvidenceMetadataSuggestion {
  evidence_type: string;
  tags: string[];
  description: string;
  linked_control_ids: string[];
}

export interface LinkageSuggestion {
  entityType: string;
  entityId: string;
  entityTitle: string;
  confidence: number;
  reason: string;
}

export interface DuplicateCandidate {
  id: string;
  evidenceAId: string;
  evidenceBId: string;
  similarityScore: number;
  detectionMethod: string;
  titleA: string;
  titleB: string;
}

export interface AiSuggestionStatus {
  enabled: boolean;
  lastRun: string | null;
  totalSuggestions: number;
}

// ── Helpers ──

/**
 * Check whether AI features are enabled via the AGRC_AI_ENABLED env var.
 * Returns false if the variable is absent, empty, or set to a falsy value.
 */
function isAiEnabled(): boolean {
  const flag = process.env.AGRC_AI_ENABLED;
  return flag === '1' || flag === 'true' || flag === 'yes';
}

// ── Public API ──

/**
 * Use Claude to suggest metadata for a new or existing evidence item.
 * Returns suggested evidence_type, tags, description, and linked control IDs
 * based on the evidence title and optional content.
 *
 * Gated behind the AGRC_AI_ENABLED feature flag. Returns null when disabled.
 */
export async function suggestEvidenceMetadata(
  tenantId: string,
  title: string,
  content?: string,
): Promise<EvidenceMetadataSuggestion | null> {
  if (!isAiEnabled()) {
    logger.info('[EvidenceAI] AI disabled (AGRC_AI_ENABLED not set). Skipping metadata suggestion.');
    return null;
  }

  const schema = tenantSchema(tenantId);

  // Fetch existing control IDs and titles for context so the model can suggest linkages
  const controlsResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT control_id, title FROM "${schema}".controls ORDER BY control_id LIMIT 200`,
    ),
    { tenantId, operation: 'suggestEvidenceMetadata:fetchControls' },
  );

  const controlContext = controlsResult.rows
    .map((r: GenericRow) => `${r.control_id}: ${r.title}`)
    .join('\n');

  // Fetch known evidence types for context
  const typesResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT DISTINCT evidence_type FROM "${schema}".evidence WHERE evidence_type IS NOT NULL LIMIT 50`,
    ),
    { tenantId, operation: 'suggestEvidenceMetadata:fetchTypes' },
  );

  const knownTypes = typesResult.rows.map((r: GenericRow) => String(r.evidence_type));

  const systemPrompt = `You are an enterprise GRC evidence classification assistant.
Given an evidence title and optional content, suggest:
1. evidence_type — a short code from the known types if applicable, or a new descriptive code
2. tags — an array of 3-8 relevant tags for categorization
3. description — a concise one-paragraph description of what this evidence demonstrates
4. linked_control_ids — control IDs from the provided list that this evidence likely supports

Known evidence types: ${knownTypes.length > 0 ? knownTypes.join(', ') : 'policy, procedure, screenshot, log, report, certificate, attestation, config_export'}

Available controls:
${controlContext || 'No controls loaded.'}

Respond with a JSON object with keys: evidence_type, tags, description, linked_control_ids.`;

  const userMessage = content
    ? `Evidence title: "${title}"\n\nEvidence content/excerpt:\n${content.slice(0, 3000)}`
    : `Evidence title: "${title}"`;

  try {
    const suggestion = await claudeJSON<EvidenceMetadataSuggestion>({
      systemPrompt,
      userMessage,
      maxTokens: 1024,
      temperature: 0.3,
      tenantId,
      agentId: 'evidence-ai',
      decisionType: 'evidence_metadata_suggestion',
    });

    // Validate and sanitize the response
    const result: EvidenceMetadataSuggestion = {
      evidence_type: String(suggestion.evidence_type || 'document'),
      tags: Array.isArray(suggestion.tags) ? suggestion.tags.map(String).slice(0, 10) : [],
      description: String(suggestion.description || ''),
      linked_control_ids: Array.isArray(suggestion.linked_control_ids)
        ? suggestion.linked_control_ids.map(String).slice(0, 20)
        : [],
    };

    logger.info(`[EvidenceAI] Metadata suggested for "${title}": type=${result.evidence_type}, tags=${result.tags.length}, controls=${result.linked_control_ids.length}`);

    eventBus.publish('evidence.ai_suggestion', tenantId, {
      type: 'metadata',
      title,
      suggestion: result,
    });

    return result;
  } catch (err) {
    logger.error(`[EvidenceAI] Failed to suggest metadata for "${title}": ${err}`);
    return null;
  }
}

/**
 * Suggest linkages between an evidence item and controls, risks, and policies.
 * Uses text similarity (ILIKE on titles and descriptions) as a heuristic
 * to find potential entity connections.
 */
export async function suggestLinkages(
  tenantId: string,
  evidenceId: string,
): Promise<LinkageSuggestion[]> {
  const schema = tenantSchema(tenantId);

  // Fetch the evidence record
  const evidenceResult = await safeQuery(
    `SELECT evidence_id, title, description, evidence_type, control_id, framework_code
     FROM "${schema}".evidence
     WHERE evidence_id = $1`,
    [evidenceId],
  );

  const evidence = getFirstRow(evidenceResult)!;
  if (!evidence) {
    logger.warn(`[EvidenceAI] Evidence ${evidenceId} not found for linkage suggestion`);
    return [];
  }

  const title = String(evidence.title || '');
  const description = String(evidence.description || '');
  if (!title && !description) return [];

  // Extract significant words from title for ILIKE matching (words > 3 chars)
  const words = `${title} ${description}`
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 8);

  if (words.length === 0) return [];

  const suggestions: LinkageSuggestion[] = [];

  // Build ILIKE conditions for word matching
  const ilikeConditions = words
    .map((_, i) => `(COALESCE(title, '') || ' ' || COALESCE(description, '')) ILIKE $${i + 1}`)
    .join(' OR ');
  const ilikeParams = words.map((w) => `%${w}%`);

  // 1. Search controls
  const controlsResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT control_id AS entity_id, title AS entity_title,
              (SELECT COUNT(*) FROM unnest(ARRAY[${words.map((_, i) => `$${i + 1}`).join(',')}]) w
               WHERE (COALESCE(title, '') || ' ' || COALESCE(description, '')) ILIKE '%' || w || '%'
              ) AS match_count
       FROM "${schema}".controls
       WHERE ${ilikeConditions}
       ORDER BY match_count DESC
       LIMIT 10`,
      ilikeParams,
    ),
    { tenantId, operation: 'suggestLinkages:controls' },
  );

  for (const r of controlsResult.rows as GenericRow[]) {
    const matchCount = Number(r.match_count) || 1;
    suggestions.push({
      entityType: 'control',
      entityId: String(r.entity_id),
      entityTitle: String(r.entity_title || ''),
      confidence: Math.min(1, matchCount / words.length),
      reason: `Title/description contains ${matchCount} matching keyword(s)`,
    });
  }

  // 2. Search risks
  const risksResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT risk_id AS entity_id, title AS entity_title,
              (SELECT COUNT(*) FROM unnest(ARRAY[${words.map((_, i) => `$${i + 1}`).join(',')}]) w
               WHERE (COALESCE(title, '') || ' ' || COALESCE(description, '')) ILIKE '%' || w || '%'
              ) AS match_count
       FROM "${schema}".risks
       WHERE ${ilikeConditions}
       ORDER BY match_count DESC
       LIMIT 10`,
      ilikeParams,
    ),
    { tenantId, operation: 'suggestLinkages:risks' },
  );

  for (const r of risksResult.rows as GenericRow[]) {
    const matchCount = Number(r.match_count) || 1;
    suggestions.push({
      entityType: 'risk',
      entityId: String(r.entity_id),
      entityTitle: String(r.entity_title || ''),
      confidence: Math.min(1, matchCount / words.length),
      reason: `Title/description contains ${matchCount} matching keyword(s)`,
    });
  }

  // 3. Search policies
  const policiesResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT policy_id AS entity_id, title AS entity_title,
              (SELECT COUNT(*) FROM unnest(ARRAY[${words.map((_, i) => `$${i + 1}`).join(',')}]) w
               WHERE (COALESCE(title, '') || ' ' || COALESCE(description, '')) ILIKE '%' || w || '%'
              ) AS match_count
       FROM "${schema}".policies
       WHERE ${ilikeConditions}
       ORDER BY match_count DESC
       LIMIT 10`,
      ilikeParams,
    ),
    { tenantId, operation: 'suggestLinkages:policies' },
  );

  for (const r of policiesResult.rows as GenericRow[]) {
    const matchCount = Number(r.match_count) || 1;
    suggestions.push({
      entityType: 'policy',
      entityId: String(r.entity_id),
      entityTitle: String(r.entity_title || ''),
      confidence: Math.min(1, matchCount / words.length),
      reason: `Title/description contains ${matchCount} matching keyword(s)`,
    });
  }

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence);

  logger.info(`[EvidenceAI] Linkage suggestions for evidence ${evidenceId}: ${suggestions.length} candidates found`);

  return suggestions;
}

/**
 * Detect near-duplicate evidence items by comparing title similarity
 * (ILIKE word overlap), evidence_type match, and overlapping date ranges.
 * Inserts discovered candidates into the evidence_duplicate_candidates table.
 */
export async function detectDuplicates(
  tenantId: string,
  evidenceId: string,
): Promise<DuplicateCandidate[]> {
  const schema = tenantSchema(tenantId);

  // Fetch source evidence
  const sourceResult = await safeQuery(
    `SELECT evidence_id, title, evidence_type, content_hash, created_at, valid_from, valid_to
     FROM "${schema}".evidence
     WHERE evidence_id = $1`,
    [evidenceId],
  );

  const source = getFirstRow(sourceResult)!;
  if (!source) {
    logger.warn(`[EvidenceAI] Evidence ${evidenceId} not found for duplicate detection`);
    return [];
  }

  const title = String(source.title || '');
  const evidenceType = source.evidence_type;
  const contentHash = source.content_hash;

  // Strategy 1: Exact content hash match (strongest signal)
  const hashCandidates = contentHash
    ? await swallowDefault(
        EC.FALLBACK_QUERY,
        emptyResult(),
        safeQuery(
          `SELECT evidence_id, title, evidence_type
           FROM "${schema}".evidence
           WHERE content_hash = $1
             AND evidence_id != $2
             AND status NOT IN ('deleted', 'archived')
           LIMIT 20`,
          [contentHash, evidenceId],
        ),
        { tenantId, operation: 'detectDuplicates:hashMatch' },
      )
    : emptyResult();

  // Strategy 2: Title word overlap (at least 60% of words must match)
  const words = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 10);

  let titleCandidateRows: GenericRow[] = [];
  if (words.length >= 2) {
    // Find evidence where title matches at least 2 of the significant words
    const ilikeConditions = words
      .map((_, i) => `title ILIKE $${i + 2}`)
      .join(' OR ');
    const params: unknown[] = [evidenceId, ...words.map((w) => `%${w}%`)];

    const titleCandidates = await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      safeQuery(
        `SELECT evidence_id, title, evidence_type
         FROM "${schema}".evidence
         WHERE evidence_id != $1
           AND status NOT IN ('deleted', 'archived')
           AND (${ilikeConditions})
         LIMIT 50`,
        params,
      ),
      { tenantId, operation: 'detectDuplicates:titleMatch' },
    );
    titleCandidateRows = titleCandidates.rows;
  }

  // Strategy 3: Same evidence_type + similar date range
  let typeDateRows: GenericRow[] = [];
  if (evidenceType && source.created_at) {
    const typeDateCandidates = await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      safeQuery(
        `SELECT evidence_id, title, evidence_type
         FROM "${schema}".evidence
         WHERE evidence_id != $1
           AND evidence_type = $2
           AND status NOT IN ('deleted', 'archived')
           AND created_at BETWEEN $3::timestamptz - INTERVAL '7 days' AND $3::timestamptz + INTERVAL '7 days'
         LIMIT 20`,
        [evidenceId, evidenceType, source.created_at],
      ),
      { tenantId, operation: 'detectDuplicates:typeDateMatch' },
    );
    typeDateRows = typeDateCandidates.rows;
  }

  // Merge all candidates and compute similarity scores
  const candidateMap = new Map<string, { title: string; score: number; method: string }>();

  for (const r of hashCandidates.rows as GenericRow[]) {
    const id = String(r.evidence_id);
    candidateMap.set(id, {
      title: String(r.title || ''),
      score: 0.95, // near-certain duplicate for hash match
      method: 'content_hash',
    });
  }

  for (const r of titleCandidateRows) {
    const id = String(r.evidence_id);
    if (candidateMap.has(id)) continue; // hash match takes precedence

    // Compute word overlap ratio
    const candidateWords = new Set(
      String(r.title || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 2),
    );
    const overlap = words.filter((w) => candidateWords.has(w)).length;
    const ratio = words.length > 0 ? overlap / words.length : 0;

    if (ratio >= 0.5) {
      // Boost if evidence_type also matches
      const typeBonus = r.evidence_type === evidenceType ? 0.1 : 0;
      candidateMap.set(id, {
        title: String(r.title || ''),
        score: Math.min(0.95, ratio + typeBonus),
        method: 'title_similarity',
      });
    }
  }

  for (const r of typeDateRows) {
    const id = String(r.evidence_id);
    if (candidateMap.has(id)) continue;
    candidateMap.set(id, {
      title: String(r.title || ''),
      score: 0.4,
      method: 'type_date_proximity',
    });
  }

  if (candidateMap.size === 0) {
    logger.info(`[EvidenceAI] No duplicate candidates found for evidence ${evidenceId}`);
    return [];
  }

  // Insert candidates into evidence_duplicate_candidates
  // Handle both schema variants (716 uses evidence_a_id/evidence_b_id, 717 uses evidence_id_a/evidence_id_b)
  const candidates: DuplicateCandidate[] = [];

  for (const [candidateId, data] of candidateMap) {
    // Ensure consistent ordering (smaller UUID first) to avoid duplicate pairs
    const [idA, idB] = evidenceId < candidateId
      ? [evidenceId, candidateId]
      : [candidateId, evidenceId];

    // Try inserting with both possible column naming conventions
    const insertResult = await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      safeQuery(
        `INSERT INTO "${schema}".evidence_duplicate_candidates
           (evidence_a_id, evidence_b_id, similarity_score, detection_method, detected_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (evidence_a_id, evidence_b_id) DO UPDATE
           SET similarity_score = GREATEST(evidence_duplicate_candidates.similarity_score, EXCLUDED.similarity_score),
               detection_method = EXCLUDED.detection_method
         RETURNING id`,
        [idA, idB, data.score, data.method],
      ),
      { tenantId, operation: 'detectDuplicates:insert' },
    );

    const row = getFirstRow(insertResult)!;
    candidates.push({

      id: row?.id || '',
      evidenceAId: idA,
      evidenceBId: idB,
      similarityScore: data.score,
      detectionMethod: data.method,
      titleA: idA === evidenceId ? title : data.title,
      titleB: idA === evidenceId ? data.title : title,
    });
  }

  logger.info(`[EvidenceAI] Detected ${candidates.length} duplicate candidates for evidence ${evidenceId}`);

  eventBus.publish('evidence.duplicates_detected', tenantId, {
    evidenceId,
    candidateCount: candidates.length,
  });

  return candidates;
}

/**
 * Get AI suggestion feature status for the tenant.
 * Reports whether AI is enabled, the last time a suggestion was generated,
 * and total suggestion count from evidence_quality_assessments.
 */
export async function getAiSuggestionStatus(
  tenantId: string,
): Promise<AiSuggestionStatus> {
  const schema = tenantSchema(tenantId);
  const enabled = isAiEnabled();

  // Query the most recent AI-generated quality assessment as a proxy for "last run"
  const lastRunResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT assessed_at
       FROM "${schema}".evidence_quality_assessments
       WHERE assessed_by LIKE 'ai:%' OR assessed_by = 'evidence-ai'
       ORDER BY assessed_at DESC
       LIMIT 1`,
    ),
    { tenantId, operation: 'getAiSuggestionStatus:lastRun' },
  );

  const lastRunRow = getFirstRow(lastRunResult)!;
  const lastRun = lastRunRow?.assessed_at
    ? new Date((lastRunRow as any).assessed_at).toISOString()
    : null;

  // Count total AI-generated suggestions
  const countResult = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult([{ total: 0 }]),
    safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".evidence_quality_assessments
       WHERE assessed_by LIKE 'ai:%' OR assessed_by = 'evidence-ai'`,
    ),
    { tenantId, operation: 'getAiSuggestionStatus:count' },
  );

  const totalSuggestions = Number(getFirstRow(countResult)?.total) || 0;

  return {
    enabled,
    lastRun,
    totalSuggestions,
  };
}
