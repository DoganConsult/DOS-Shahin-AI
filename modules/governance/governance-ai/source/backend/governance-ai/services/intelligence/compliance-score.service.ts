import { logger } from '../../ports/logger.port';
/**
 * Comprehensive Weighted Compliance Score Computation
 *
 * Computes a real-time compliance score across 4 dimensions:
 *   1. Control Effectiveness (40%)
 *   2. Evidence Freshness (25%)
 *   3. Policy Coverage (20%)
 *   4. Audit Findings Closure (15%)
 *
 * Persists snapshots for trend analysis and generates bilingual narratives.
 */

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { catchHandler, swallowDefault, EC } from '@dos/platform-core/resilience';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ComplianceScoreResult {
  overall_score: number;           // 0-100
  previous_score: number;
  delta: number;
  dimensions: ComplianceDimension[];
  narrative_en: string;
  narrative_ar: string;
  computed_at: string;
}

export interface ComplianceDimension {
  dimension: string;
  score: number;
  weight: number;
  weighted_score: number;
  grade: 'green' | 'yellow' | 'red';
  detail: string;
}

// ---------------------------------------------------------------------------
// Dimension weights
// ---------------------------------------------------------------------------

const WEIGHTS = {
  control_effectiveness: 0.40,
  evidence_freshness: 0.25,
  policy_coverage: 0.20,
  audit_findings_closure: 0.15,
} as const;

// ---------------------------------------------------------------------------
// Grade helper
// ---------------------------------------------------------------------------

function toGrade(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

// ---------------------------------------------------------------------------
// Dimension computations
// ---------------------------------------------------------------------------

async function computeControlEffectiveness(schema: string): Promise<ComplianceDimension> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, effective: 0, tested_passed: 0 }]), safeQuery(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'effective')::int AS effective,
           COUNT(*) FILTER (WHERE test_status = 'passed')::int AS tested_passed
    FROM "${schema}".controls
    WHERE deleted_at IS NULL
  `), { operation: 'query controls' });

  const { total, effective, tested_passed } = res.rows[0] ?? { total: 0, effective: 0, tested_passed: 0 };
  const score = total > 0
    ? Math.round(((effective / total) * 60 + (tested_passed / total) * 40) * 100) / 100
    : 0;

  return {
    dimension: 'Control Effectiveness',
    score,
    weight: WEIGHTS.control_effectiveness,
    weighted_score: Math.round(score * WEIGHTS.control_effectiveness * 100) / 100,
    grade: toGrade(score),
    detail: `${effective}/${total} effective, ${tested_passed}/${total} tested & passed`,
  };
}

async function computeEvidenceFreshness(schema: string): Promise<ComplianceDimension> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, fresh: 0 }]), safeQuery(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'approved' AND (valid_until IS NULL OR valid_until > NOW()))::int AS fresh
    FROM "${schema}".evidence
    WHERE deleted_at IS NULL
  `), { operation: 'query evidence' });

  const { total, fresh } = res.rows[0] ?? { total: 0, fresh: 0 };
  const score = total > 0
    ? Math.round((fresh / total) * 100 * 100) / 100
    : 0;

  return {
    dimension: 'Evidence Freshness',
    score,
    weight: WEIGHTS.evidence_freshness,
    weighted_score: Math.round(score * WEIGHTS.evidence_freshness * 100) / 100,
    grade: toGrade(score),
    detail: `${fresh}/${total} approved & current`,
  };
}

async function computePolicyCoverage(schema: string): Promise<ComplianceDimension> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, approved: 0, current: 0 }]), safeQuery(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'approved' OR status = 'published')::int AS approved,
           COUNT(*) FILTER (WHERE review_date IS NOT NULL AND review_date > NOW())::int AS current
    FROM "${schema}".policies
    WHERE deleted_at IS NULL
  `), { operation: 'query policies' });

  const { total, approved, current } = res.rows[0] ?? { total: 0, approved: 0, current: 0 };
  const score = total > 0
    ? Math.round(((approved / total) * 70 + (current / total) * 30) * 100) / 100
    : 0;

  return {
    dimension: 'Policy Coverage',
    score,
    weight: WEIGHTS.policy_coverage,
    weighted_score: Math.round(score * WEIGHTS.policy_coverage * 100) / 100,
    grade: toGrade(score),
    detail: `${approved}/${total} approved, ${current}/${total} review-current`,
  };
}

async function computeAuditFindingsClosure(schema: string): Promise<ComplianceDimension> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, closed: 0 }]), safeQuery(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('closed','resolved','remediated'))::int AS closed
    FROM "${schema}".audit_findings
    WHERE deleted_at IS NULL
  `), { operation: 'query audit_findings' });

  const { total, closed } = res.rows[0] ?? { total: 0, closed: 0 };
  // No findings = perfect score (nothing to close)
  const score = total > 0
    ? Math.round((closed / total) * 100 * 100) / 100
    : 100;

  return {
    dimension: 'Audit Findings Closure',
    score,
    weight: WEIGHTS.audit_findings_closure,
    weighted_score: Math.round(score * WEIGHTS.audit_findings_closure * 100) / 100,
    grade: toGrade(score),
    detail: total > 0 ? `${closed}/${total} closed/resolved` : 'No findings — clean slate',
  };
}

// ---------------------------------------------------------------------------
// Narrative generation (template-based, no AI call)
// ---------------------------------------------------------------------------

function buildNarrativeEn(score: number, delta: number, dimensions: ComplianceDimension[]): string {
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const deltaText = delta > 0
    ? `+${delta.toFixed(1)}`
    : delta < 0
      ? delta.toFixed(1)
      : 'no change';

  const parts: string[] = [
    `Your compliance score is ${score.toFixed(1)}/100 (${deltaText} from last assessment).`,
    `${strongest.dimension} is your strongest area at ${strongest.score.toFixed(0)}.`,
  ];

  if (weakest.dimension !== strongest.dimension) {
    parts.push(`${weakest.dimension} needs attention at ${weakest.score.toFixed(0)}.`);
  }

  // Add specific callouts for red dimensions
  const redDims = dimensions.filter(d => d.grade === 'red');
  if (redDims.length > 0) {
    parts.push(`Critical areas requiring immediate action: ${redDims.map(d => d.dimension).join(', ')}.`);
  }

  return parts.join(' ');
}

function buildNarrativeAr(score: number, delta: number, dimensions: ComplianceDimension[]): string {
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const DIMENSION_AR: Record<string, string> = {
    'Control Effectiveness': '\u0641\u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0636\u0648\u0627\u0628\u0637',
    'Evidence Freshness': '\u062D\u062F\u0627\u062B\u0629 \u0627\u0644\u0623\u062F\u0644\u0629',
    'Policy Coverage': '\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A',
    'Audit Findings Closure': '\u0625\u063A\u0644\u0627\u0642 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642',
  };

  const deltaText = delta > 0
    ? `+${delta.toFixed(1)}`
    : delta < 0
      ? delta.toFixed(1)
      : '\u0628\u062F\u0648\u0646 \u062A\u063A\u064A\u064A\u0631';

  const parts: string[] = [
    `\u062F\u0631\u062C\u0629 \u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0643 \u0647\u064A ${score.toFixed(1)}/100 (${deltaText} \u0645\u0646 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0633\u0627\u0628\u0642).`,
    `${DIMENSION_AR[strongest.dimension] || strongest.dimension} \u0647\u064A \u0623\u0642\u0648\u0649 \u0645\u062C\u0627\u0644\u0627\u062A\u0643 \u0628\u0646\u0633\u0628\u0629 ${strongest.score.toFixed(0)}.`,
  ];

  if (weakest.dimension !== strongest.dimension) {
    parts.push(`${DIMENSION_AR[weakest.dimension] || weakest.dimension} \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0627\u0647\u062A\u0645\u0627\u0645 \u0628\u0646\u0633\u0628\u0629 ${weakest.score.toFixed(0)}.`);
  }

  const redDims = dimensions.filter(d => d.grade === 'red');
  if (redDims.length > 0) {
    parts.push(`\u0645\u062C\u0627\u0644\u0627\u062A \u062D\u0631\u062C\u0629 \u062A\u062A\u0637\u0644\u0628 \u0625\u062C\u0631\u0627\u0621 \u0641\u0648\u0631\u064A: ${redDims.map(d => DIMENSION_AR[d.dimension] || d.dimension).join('\u060C ')}.`);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute a comprehensive weighted compliance score for a tenant,
 * persist the snapshot, and return the result with bilingual narratives.
 */
export async function computeComplianceScore(tenantId: string): Promise<ComplianceScoreResult> {
  const schema = tenantSchema(tenantId);

  // Compute all 4 dimensions in parallel
  const [controlDim, evidenceDim, policyDim, auditDim] = await Promise.all([
    computeControlEffectiveness(schema),
    computeEvidenceFreshness(schema),
    computePolicyCoverage(schema),
    computeAuditFindingsClosure(schema),
  ]);

  const dimensions: ComplianceDimension[] = [controlDim, evidenceDim, policyDim, auditDim];

  // Overall = sum of weighted scores
  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.weighted_score, 0) * 100
  ) / 100;

  // Fetch previous score from snapshots
  const prevRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT score FROM "${schema}".compliance_score_snapshots
    ORDER BY snapshot_date DESC LIMIT 1
  `), { operation: 'query compliance_score_snapshots' });
  const previousScore = prevRes.rows[0]?.score ?? overall;

  const delta = Math.round((overall - previousScore) * 100) / 100;

  // Generate bilingual narratives
  const narrativeEn = buildNarrativeEn(overall, delta, dimensions);
  const narrativeAr = buildNarrativeAr(overall, delta, dimensions);

  const computedAt = new Date().toISOString();

  // Extract total/effective controls for the legacy columns
  const totalControls = controlDim.detail.match(/(\d+)\/(\d+) effective/);
  const totalCtrl = totalControls ? parseInt(totalControls[2], 10) : 0;
  const effectiveCtrl = totalControls ? parseInt(totalControls[1], 10) : 0;

  // Persist snapshot (upsert by snapshot_date)
  await safeQuery(`
    INSERT INTO "${schema}".compliance_score_snapshots
      (score, control_score, evidence_score, policy_score, audit_score,
       total_controls, effective_controls, narrative_en, narrative_ar,
       dimensions_json, snapshot_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE)
    ON CONFLICT (snapshot_date) DO UPDATE SET
      score = $1,
      control_score = $2,
      evidence_score = $3,
      policy_score = $4,
      audit_score = $5,
      total_controls = $6,
      effective_controls = $7,
      narrative_en = $8,
      narrative_ar = $9,
      dimensions_json = $10
  `, [
    overall,
    controlDim.score,
    evidenceDim.score,
    policyDim.score,
    auditDim.score,
    totalCtrl,
    effectiveCtrl,
    narrativeEn,
    narrativeAr,
    JSON.stringify(dimensions),
  ]).catch((err) => {
    // Table may not exist yet for newly provisioned tenants — non-fatal
    logger.warn(`[ComplianceScore] Failed to persist snapshot for tenant ${tenantId}:`, (err instanceof Error ? err.message : String(err)));
  });

  // Update the public tenants table with the latest score
  await safeQuery(
    `UPDATE public.tenants SET compliance_score = $1 WHERE tenant_id = $2`,
    [overall, tenantId],
  ).catch(catchHandler(EC.FALLBACK_QUERY, {
    operation: 'update tenant compliance score snapshot',
    tenantId,
  }));

  return {
    overall_score: overall,

    previous_score: previousScore,
    delta,
    dimensions,
    narrative_en: narrativeEn,
    narrative_ar: narrativeAr,
    computed_at: computedAt,
  };
}

/**
 * Retrieve the latest persisted compliance score snapshot for a tenant.
 * Returns null if no snapshot exists.
 */
export async function getLatestComplianceScore(tenantId: string): Promise<ComplianceScoreResult | null> {
  const schema = tenantSchema(tenantId);
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT score, control_score, evidence_score, policy_score, audit_score,
           narrative_en, narrative_ar, dimensions_json, snapshot_date
    FROM "${schema}".compliance_score_snapshots
    ORDER BY snapshot_date DESC LIMIT 1
  `), { operation: 'query compliance_score_snapshots' });

  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const dimensions: ComplianceDimension[] = typeof row.dimensions_json === 'string'
    ? JSON.parse(row.dimensions_json)
    : (row.dimensions_json || []);

  // Fetch the previous snapshot to compute delta
  const prevRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT score FROM "${schema}".compliance_score_snapshots
    ORDER BY snapshot_date DESC LIMIT 1 OFFSET 1
  `), { operation: 'query compliance_score_snapshots' });
  const previousScore = prevRes.rows[0]?.score ?? row.score;

  return {
    overall_score: parseFloat((row as any).score) || 0,
    previous_score: parseFloat((previousScore as any)) || 0,
    delta: Math.round(((parseFloat((row as any).score) || 0) - (parseFloat((previousScore as any)) || 0)) * 100) / 100,
    dimensions,

    narrative_en: row.narrative_en || '',

    narrative_ar: row.narrative_ar || '',

    computed_at: row.snapshot_date?.toISOString?.() || row.snapshot_date || '',
  };
}
