import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Evidence Quality Scoring Service
// Evaluates evidence quality across 5 dimensions:
// Freshness (25%), Completeness (25%), Source Reliability (25%),
// Reviewer Sign-off (15%), Format Match (10%)
// Scores 0-100, persists in evidence_quality_tier (A/B/C)
// Factors into control effectiveness calculation
// ============================================

import { withTenantClient } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import type { GenericRow } from '@dos/types';

// ============================================================
// Types
// ============================================================

export interface EvidenceQualityScore {
  evidenceId: string;
  compositeScore: number; // 0-100
  qualityTier: 'A' | 'B' | 'C';
  dimensionScores: {
    freshness: number;      // 0-100
    completeness: number;   // 0-100
    sourceReliability: number; // 0-100
    reviewerSignOff: number;   // 0-100
    formatMatch: number;       // 0-100
  };
  breakdown: {
    freshness: { score: number; reason: string };
    completeness: { score: number; reason: string };
    sourceReliability: { score: number; reason: string };
    reviewerSignOff: { score: number; reason: string };
    formatMatch: { score: number; reason: string };
  };
  computedAt: string;
}

// ============================================================
// Core Scoring Functions
// ============================================================

/**
 * Score evidence freshness (25% weight).
 * Evaluates: days since collection vs expected cadence/freshness_days.
 * 
 * Scoring logic:
 * - If within freshness_days: 100
 * - If within 1.5x freshness_days: 80
 * - If within 2x freshness_days: 60
 * - If within 3x freshness_days: 40
 * - If expired (expiry_date < now): 0
 * - Otherwise: 20
 */
function scoreFreshness(
  submittedAt: Date | string | null,
  expiryDate: Date | string | null,
  freshnessDays: number | null,
  requiredCadence: string | null
): { score: number; reason: string } {
  if (!submittedAt) {
    return { score: 0, reason: 'No submission date available' };
  }

  const submitted = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
  const now = new Date();
  const daysSinceSubmission = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));

  // Check if expired
  if (expiryDate) {
    const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    if (expiry < now) {
      return { score: 0, reason: `Evidence expired on ${expiry.toISOString().split('T')[0]}` };
    }
  }

  // Determine expected freshness window
  let expectedDays = freshnessDays;
  if (!expectedDays && requiredCadence) {
    // Map cadence to days (defaults)
    const cadenceMap: Record<string, number> = {
      'daily': 1,
      'weekly': 7,
      'monthly': 30,
      'quarterly': 90,
      'semi-annually': 180,
      'annually': 365,
      'on_change': 365, // Treat as annual for scoring
    };
    expectedDays = cadenceMap[requiredCadence.toLowerCase()] || 90; // Default to quarterly
  }
  if (!expectedDays) {
    expectedDays = 90; // Default to quarterly
  }

  // Score based on age
  if (daysSinceSubmission <= expectedDays) {
    return { score: 100, reason: `Submitted ${daysSinceSubmission} days ago, within ${expectedDays}-day window` };
  } else if (daysSinceSubmission <= expectedDays * 1.5) {
    return { score: 80, reason: `Submitted ${daysSinceSubmission} days ago, slightly stale (1.5x window)` };
  } else if (daysSinceSubmission <= expectedDays * 2) {
    return { score: 60, reason: `Submitted ${daysSinceSubmission} days ago, moderately stale (2x window)` };
  } else if (daysSinceSubmission <= expectedDays * 3) {
    return { score: 40, reason: `Submitted ${daysSinceSubmission} days ago, significantly stale (3x window)` };
  } else {
    return { score: 20, reason: `Submitted ${daysSinceSubmission} days ago, very stale (>3x window)` };
  }
}

/**
 * Score evidence completeness (25% weight).
 * Evaluates: required fields populated (title, description, file_path/content, control_id, submitted_by).
 * 
 * Scoring logic:
 * - All required fields: 100
 * - Missing 1 field: 80
 * - Missing 2 fields: 60
 * - Missing 3+ fields: 40
 * - Critical fields missing (control_id, submitted_by): 0
 */
function scoreCompleteness(evidence: {
  title?: string | null;
  description?: string | null;
  file_path?: string | null;
  content?: string | null;
  control_id?: string | null;
  submitted_by?: string | null;
  owner_user_id?: string | null;
}): { score: number; reason: string } {
  const requiredFields = [
    { key: 'title', value: evidence.title },
    { key: 'control_id', value: evidence.control_id },
    { key: 'submitted_by', value: evidence.submitted_by },
  ];
  const optionalFields = [
    { key: 'description', value: evidence.description },
    { key: 'file_path', value: evidence.file_path },
    { key: 'content', value: evidence.content },
    { key: 'owner_user_id', value: evidence.owner_user_id },
  ];

  // Critical fields must be present
  const missingCritical = requiredFields.filter(f => !f.value || (typeof f.value === 'string' && f.value.trim() === ''));
  if (missingCritical.length > 0) {
    return {
      score: 0,
      reason: `Missing critical fields: ${missingCritical.map(f => f.key).join(', ')}`
    };
  }

  // Count missing optional fields
  const missingOptional = optionalFields.filter(f => !f.value || (typeof f.value === 'string' && f.value.trim() === ''));
  const totalFields = requiredFields.length + optionalFields.length;
  const presentFields = totalFields - missingOptional.length;

  const score = Math.round((presentFields / totalFields) * 100);
  const reason = missingOptional.length === 0
    ? 'All fields populated'
    : `Missing ${missingOptional.length} optional field(s): ${missingOptional.map(f => f.key).join(', ')}`;

  return { score, reason };
}

/**
 * Score source reliability (25% weight).
 * Evaluates: manual upload vs connector-automated vs system-generated.
 * 
 * Scoring logic:
 * - System-generated (connector, automated): 100
 * - Connector-automated: 90
 * - Manual upload with metadata: 70
 * - Manual upload without metadata: 50
 * - Unknown source: 30
 */
function scoreSourceReliability(evidence: {
  source_type?: string | null;
  system_reference?: string | null;
  ticket_id?: string | null;
  content_hash?: string | null;
}): { score: number; reason: string } {
  const sourceType = (evidence.source_type || '').toLowerCase();
  const hasMetadata = !!(evidence.system_reference || evidence.ticket_id || evidence.content_hash);

  if (sourceType === 'system-generated' || sourceType === 'connector') {
    return { score: 100, reason: 'System-generated or connector-automated evidence' };
  } else if (sourceType === 'automated' || sourceType === 'api') {
    return { score: 90, reason: 'Automated collection via API or connector' };
  } else if (sourceType === 'manual-upload' || sourceType === 'manual') {
    if (hasMetadata) {
      return { score: 70, reason: 'Manual upload with system reference/ticket/hash metadata' };
    } else {
      return { score: 50, reason: 'Manual upload without metadata' };
    }
  } else if (sourceType) {
    return { score: 60, reason: `Source type: ${sourceType}` };
  } else {
    return { score: 30, reason: 'Unknown or missing source type' };
  }
}

/**
 * Score reviewer sign-off (15% weight).
 * Evaluates: presence of accepted review in evidence_reviews table.
 * 
 * Scoring logic:
 * - Accepted review within 30 days: 100
 * - Accepted review within 90 days: 90
 * - Accepted review older: 80
 * - Needs revision: 50
 * - Rejected: 0
 * - No review: 30
 */
async function scoreReviewerSignOff(
  tenantId: string,
  evidenceId: string
): Promise<{ score: number; reason: string }> {
  const review = await withTenantClient(tenantId, async (client) => {
    try {
      const r = await client.query<{ outcome: string; reviewed_at: string | null }>(
        `SELECT outcome, reviewed_at
           FROM evidence_reviews
          WHERE evidence_id = $1 AND deleted_at IS NULL
          ORDER BY reviewed_at DESC
          LIMIT 1`,
        [evidenceId],
      );
      return r.rows[0] ?? null;
    } catch {
      return null;
    }
  });

  if (!review) {
    return { score: 30, reason: 'No review record found' };
  }

  const outcome = (review.outcome || '').toLowerCase();
  const reviewedAt = review.reviewed_at ? new Date(review.reviewed_at) : null;

  if (outcome === 'accepted') {
    if (!reviewedAt) {
      return { score: 80, reason: 'Accepted review (date any)' };
    }
    const daysSinceReview = Math.floor((new Date().getTime() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceReview <= 30) {
      return { score: 100, reason: `Accepted review ${daysSinceReview} days ago` };
    } else if (daysSinceReview <= 90) {
      return { score: 90, reason: `Accepted review ${daysSinceReview} days ago` };
    } else {
      return { score: 80, reason: `Accepted review ${daysSinceReview} days ago (older)` };
    }
  } else if (outcome === 'needs_revision') {
    return { score: 50, reason: 'Review status: needs revision' };
  } else if (outcome === 'rejected') {
    return { score: 0, reason: 'Review status: rejected' };
  } else if (outcome === 'expired') {
    return { score: 0, reason: 'Review status: expired' };
  } else {
    return { score: 40, reason: `Review status: ${outcome}` };
  }
}

/**
 * Score format match (10% weight).
 * Evaluates: expected format (from control_evidence_requirements) vs actual format (file extension, evidence_type).
 * 
 * Scoring logic:
 * - Perfect match: 100
 * - Compatible format: 80
 * - Partial match: 60
 * - No match: 40
 * - No requirement defined: 70 (neutral)
 */
async function scoreFormatMatch(
  tenantId: string,
  evidenceId: string,
  controlId: string | null,
  filePath: string | null,
  evidenceType: string | null
): Promise<{ score: number; reason: string }> {
  if (!controlId) {
    return { score: 50, reason: 'No control_id to match format requirements' };
  }

  // Get expected evidence type from control_evidence_requirements
  const expectedType = await withTenantClient(tenantId, async (client) => {
    try {
      const r = await client.query<{ evidence_type_code: string }>(
        `SELECT evidence_type_code
           FROM control_evidence_requirements
          WHERE control_id = $1 AND deleted_at IS NULL
          LIMIT 1`,
        [controlId],
      );
      return r.rows[0]?.evidence_type_code ?? null;
    } catch {
      return null;
    }
  });

  if (!expectedType) {
    return { score: 70, reason: 'No format requirement defined for this control' };
  }

  // Check if actual type matches expected
  if (evidenceType && evidenceType.toLowerCase() === expectedType.toLowerCase()) {
    return { score: 100, reason: `Format matches expected type: ${expectedType}` };
  }

  // Check file extension compatibility
  if (filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const compatibleExts: Record<string, string[]> = {
      'policy': ['pdf', 'doc', 'docx'],
      'procedure': ['pdf', 'doc', 'docx'],
      'log': ['log', 'txt', 'csv', 'json'],
      'config': ['json', 'xml', 'yaml', 'yml'],
      'screenshot': ['png', 'jpg', 'jpeg', 'pdf'],
      'audit_report': ['pdf', 'doc', 'docx', 'xlsx'],
    };

    const expectedCompatible = compatibleExts[expectedType.toLowerCase()] ?? [];
    if (expectedCompatible.includes(ext)) {
      return { score: 80, reason: `File extension (${ext}) compatible with expected type: ${expectedType}` };
    }
  }

  if (evidenceType) {
    return { score: 60, reason: `Format partially matches: expected ${expectedType}, got ${evidenceType}` };
  }

  return { score: 40, reason: `Format mismatch: expected ${expectedType}, no evidence type specified` };
}

/**
 * Compute composite evidence quality score (0-100) from dimension scores.
 * Weights: Freshness (25%), Completeness (25%), Source Reliability (25%), Reviewer Sign-off (15%), Format Match (10%).
 */
function computeCompositeScore(dimensionScores: {
  freshness: number;
  completeness: number;
  sourceReliability: number;
  reviewerSignOff: number;
  formatMatch: number;
}): number {
  // Use DB-driven weights if loaded, otherwise fall back to defaults
  const weights = _dbWeightsCache ?? {
    freshness: 0.25,
    completeness: 0.25,
    sourceReliability: 0.25,
    reviewerSignOff: 0.15,
    formatMatch: 0.10,
  };

  const weightedSum =
    dimensionScores.freshness * weights.freshness +
    dimensionScores.completeness * weights.completeness +
    dimensionScores.sourceReliability * weights.sourceReliability +
    dimensionScores.reviewerSignOff * weights.reviewerSignOff +
    dimensionScores.formatMatch * weights.formatMatch;

  return Math.round(weightedSum * 100) / 100;
}

// ============================================================
// DB-Driven Quality Weights
// ============================================================

interface QualityWeights {
  freshness: number;
  completeness: number;
  sourceReliability: number;
  reviewerSignOff: number;
  formatMatch: number;
}

let _dbWeightsCache: QualityWeights | null = null;

/**
 * Load quality scoring weights from evidence_quality_rules table.
 * Maps dimension codes to weight multipliers. Normalizes so total = 1.0.
 * Falls back to hardcoded defaults if table does not exist or is empty.
 */
export async function loadQualityWeightsFromDb(tenantId: string): Promise<QualityWeights> {
  const dimensionMap: Record<string, keyof QualityWeights> = {
    freshness: 'freshness',
    currentness: 'freshness',
    completeness: 'completeness',
    authenticity: 'sourceReliability',
    readability: 'formatMatch',
    scope_match: 'reviewerSignOff',
    provenance: 'sourceReliability',
    format: 'formatMatch',
    metadata: 'completeness',
  };

  try {
    const rows = await withTenantClient(tenantId, async (client) => {
      const r = await client.query<{ dimension: string; weight: string | number }>(
        `SELECT dimension, weight FROM evidence_quality_rules WHERE active = true`,
      );
      return r.rows;
    });

    if (rows.length === 0) return _dbWeightsCache ?? getDefaultWeights();

    const raw: Record<string, number> = {
      freshness: 0,
      completeness: 0,
      sourceReliability: 0,
      reviewerSignOff: 0,
      formatMatch: 0,
    };

    for (const row of rows) {
      const key = dimensionMap[row.dimension];
      if (key) raw[key] += parseFloat(String(row.weight)) || 0;
    }

    // Normalize to sum = 1.0
    const total = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
    const weights: QualityWeights = {
      freshness: raw.freshness / total,
      completeness: raw.completeness / total,
      sourceReliability: raw.sourceReliability / total,
      reviewerSignOff: raw.reviewerSignOff / total,
      formatMatch: raw.formatMatch / total,
    };

    _dbWeightsCache = weights;
    return weights;
  } catch {
    return _dbWeightsCache ?? getDefaultWeights();
  }
}

function getDefaultWeights(): QualityWeights {
  return { freshness: 0.25, completeness: 0.25, sourceReliability: 0.25, reviewerSignOff: 0.15, formatMatch: 0.10 };
}

/** Clear cached weights (e.g., after admin updates rules). */
export function invalidateQualityWeightsCache(): void {
  _dbWeightsCache = null;
}

/**
 * Map composite score (0-100) to quality tier (A, B, C).
 * - A: 80-100
 * - B: 50-79
 * - C: 0-49
 */
function mapScoreToTier(score: number): 'A' | 'B' | 'C' {
  if (score >= 80) return 'A';
  if (score >= 50) return 'B';
  return 'C';
}

// ============================================================
// Main Service Functions
// ============================================================

/**
 * Score a single evidence item and update its quality_tier.
 * Returns the full quality score breakdown.
 */
export async function scoreEvidenceQuality(
  tenantId: string,
  evidenceId: string
): Promise<EvidenceQualityScore> {
  // Load rule weights (best-effort, may be cached or fall back to defaults).
  await loadQualityWeightsFromDb(tenantId).catch(() => undefined);

  const evidence = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<{
      evidence_id: string;
      title: string | null;
      description: string | null;
      file_path: string | null;
      content: string | null;
      control_id: string | null;
      submitted_by: string | null;
      owner_user_id: string | null;
      submitted_at: string | null;
      expiry_date: string | null;
      freshness_days: number | null;
      required_cadence: string | null;
      source_type: string | null;
      system_reference: string | null;
      ticket_id: string | null;
      content_hash: string | null;
      evidence_type: string | null;
    }>(
      `SELECT evidence_id, title, description, file_path, content,
              control_id, submitted_by, owner_user_id,
              submitted_at, expiry_date, freshness_days, required_cadence,
              source_type, system_reference, ticket_id, content_hash,
              evidence_type
         FROM evidence
        WHERE evidence_id = $1
        LIMIT 1`,
      [evidenceId],
    );
    return r.rows[0] ?? null;
  });

  if (!evidence) {
    throw new Error(`evidence ${evidenceId} not found in tenant ${tenantId}`);
  }

  const fresh = scoreFreshness(
    evidence.submitted_at,
    evidence.expiry_date,
    evidence.freshness_days,
    evidence.required_cadence,
  );
  const complete = scoreCompleteness(evidence);
  const reliable = scoreSourceReliability(evidence);
  const review = await scoreReviewerSignOff(tenantId, evidenceId);
  const format = await scoreFormatMatch(
    tenantId,
    evidenceId,
    evidence.control_id,
    evidence.file_path,
    evidence.evidence_type,
  );

  const dimensionScores = {
    freshness: fresh.score,
    completeness: complete.score,
    sourceReliability: reliable.score,
    reviewerSignOff: review.score,
    formatMatch: format.score,
  };

  const compositeScore = computeCompositeScore(dimensionScores);
  const qualityTier = mapScoreToTier(compositeScore);

  // Persist tier on the evidence row (best-effort).
  await withTenantClient(tenantId, async (client) => {
    await client.query(
      `UPDATE evidence SET quality_tier = $1, quality_score = $2, scored_at = NOW()
        WHERE evidence_id = $3`,
      [qualityTier, compositeScore, evidenceId],
    ).catch(() => undefined);
  });

  // Emit event for downstream control-effectiveness recompute.
  try {
    await eventBus.emit('evidence.quality_scored', {
      tenantId,
      evidenceId,
      compositeScore,
      qualityTier,
      controlId: evidence.control_id,
    });
  } catch {
    /* event-bus is best-effort; do not block scoring */
  }

  return {
    evidenceId,
    compositeScore,
    qualityTier,
    dimensionScores,
    breakdown: {
      freshness: fresh,
      completeness: complete,
      sourceReliability: reliable,
      reviewerSignOff: review,
      formatMatch: format,
    },
    computedAt: new Date().toISOString(),
  };
}

/**
 * Batch score multiple evidence items.
 * Returns array of quality scores.
 */
export async function batchScoreEvidenceQuality(
  tenantId: string,
  evidenceIds: string[]
): Promise<EvidenceQualityScore[]> {
  const results: EvidenceQualityScore[] = [];
  for (const evidenceId of evidenceIds) {
    try {
      const score = await scoreEvidenceQuality(tenantId, evidenceId);
      results.push(score);
    } catch (error) {
      // Log error but continue with other items
      logger.error(`Failed to score evidence ${evidenceId}:`, error);
    }
  }
  return results;
}

/**
 * Score all evidence for a specific control.
 * Useful for recalculating control effectiveness after evidence changes.
 */
export async function scoreControlEvidence(
  tenantId: string,
  controlId: string
): Promise<EvidenceQualityScore[]> {
  const evidenceIds = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<{ evidence_id: string }>(
      `SELECT evidence_id FROM evidence
        WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`,
      [controlId],
    );
    return r.rows.map((row: GenericRow) => row.evidence_id as string);
  });
  return batchScoreEvidenceQuality(tenantId, evidenceIds);
}

/**
 * Get average evidence quality score for a control.
 * Used in control effectiveness calculation.
 */
export async function getControlEvidenceQualityAverage(
  tenantId: string,
  controlId: string
): Promise<{ averageScore: number; tier: 'A' | 'B' | 'C'; evidenceCount: number }> {
  const row = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<{ evidence_count: string | number; avg_score: string | number }>(
      `SELECT
         COUNT(*)::int AS evidence_count,
         COALESCE(AVG(
           CASE quality_tier
             WHEN 'A' THEN 90
             WHEN 'B' THEN 65
             WHEN 'C' THEN 25
             ELSE 50
           END
         )::numeric, 50) AS avg_score
       FROM evidence
      WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`,
      [controlId],
    );
    return r.rows[0]!;
  });
  const evidenceCount = parseInt(String(row.evidence_count), 10) || 0;
  const averageScore = parseFloat(String(row.avg_score)) || 50;
  const tier = mapScoreToTier(averageScore);

  return { averageScore, tier, evidenceCount };
}
