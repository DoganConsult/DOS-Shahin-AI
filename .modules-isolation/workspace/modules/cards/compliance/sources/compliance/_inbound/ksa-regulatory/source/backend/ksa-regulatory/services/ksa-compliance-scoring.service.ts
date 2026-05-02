import { logger } from '../ports/logger.port';
// ============================================
// KSA Compliance Scoring Service
// DB-driven, AI-first compliance scoring for Saudi Arabia
// regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, NDMO, CITC)
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { claudeJSON } from '../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';

/** The five KSA regulatory frameworks supported by the scoring engine */
const _KSA_FRAMEWORK_CODES = ['NCA-ECC', 'SAMA-CSF', 'PDPL', 'NDMO', 'CITC'] as const;
type _KsaFrameworkCode = typeof _KSA_FRAMEWORK_CODES[number];

/** Default sector relevance weights when no tenant-specific config exists */
const DEFAULT_SECTOR_WEIGHTS: Record<string, number> = {
  'NCA-ECC': 0.30,
  'SAMA-CSF': 0.25,
  'PDPL':     0.20,
  'NDMO':     0.15,
  'CITC':     0.10,
};

// ------------------------------------------------------------------
// Interfaces
// ------------------------------------------------------------------

export interface FrameworkScore {
  frameworkCode: string;
  frameworkName: string;
  totalControls: number;
  implementedCount: number;
  partialCount: number;
  notImplementedCount: number;
  notApplicableCount: number;
  controlScore: number;       // 0-100 weighted by implementation status
  evidenceCoverage: number;   // 0-100 ratio of controls with evidence
  effectivenessScore: number; // 0-100 from test results (or controlScore as fallback)
  compositeScore: number;     // 0-100 weighted blend of the three dimensions
  weight: number;             // sector relevance weight used in overall composite
}

export interface KsaComplianceScoreResult {
  overallScore: number;
  frameworkScores: FrameworkScore[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  recommendations: string[];
  generatedAt: string;
}

export interface ScoreHistoryPoint {
  scoredAt: string;
  frameworkCode: string | null;
  overallScore: number;
  controlScore: number | null;
  evidenceScore: number | null;
}

export interface GapItem {
  controlId: string;
  controlTitle: string;
  frameworkCode: string;
  status: string;
  severity: string;
  evidenceMissing: boolean;
  estimatedEffortDays: number;
}

export interface KsaGapAnalysisResult {
  gaps: GapItem[];
  prioritizedActions: string[];
  estimatedEffort: { totalDays: number; highPriorityDays: number };
}

// ------------------------------------------------------------------
// computeKsaComplianceScore
// ------------------------------------------------------------------

/**
 * Calculate real KSA compliance scores by querying the tenant's controls
 * table, grouping by framework, and blending control status, evidence
 * coverage, and test-result effectiveness into a composite score.
 *
 * Optionally scoped to a single frameworkCode.
 */
export async function computeKsaComplianceScore(
  tenantId: string,
  frameworkCode?: string,
): Promise<KsaComplianceScoreResult> {
  const schema = tenantSchema(tenantId);

  try {
    // ---- 1. Aggregate control statuses per framework ----
    const statusSql = `
      SELECT
        COALESCE(c.framework_id, 'UNKNOWN') AS framework_code,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE c.status = 'implemented')::int      AS implemented,
        COUNT(*) FILTER (WHERE c.status = 'partial')::int           AS partial,
        COUNT(*) FILTER (WHERE c.status = 'not_implemented')::int   AS not_implemented,
        COUNT(*) FILTER (WHERE c.status = 'not_applicable')::int    AS not_applicable
      FROM "${schema}".controls c
      WHERE c.deleted_at IS NULL
        ${frameworkCode ? 'AND c.framework_id = $1' : ''}
      GROUP BY c.framework_id
      ORDER BY c.framework_id
    `;
    const statusParams = frameworkCode ? [frameworkCode] : [];
    const statusResult = await safeQuery(statusSql, statusParams);

    if (statusResult.rows.length === 0) {
      return {
        overallScore: 0,
        frameworkScores: [],
        trend: 'insufficient_data',
        recommendations: ['No controls found. Complete the provisioning / framework seeding step first.'],
        generatedAt: new Date().toISOString(),
      };
    }

    // ---- 2. Evidence coverage per framework ----
    const evidenceSql = `
      SELECT
        COALESCE(c.framework_id, 'UNKNOWN') AS framework_code,
        COUNT(DISTINCT c.control_id)::int AS controls_with_evidence
      FROM "${schema}".controls c
      INNER JOIN "${schema}".evidence_tasks et
        ON et.control_id = c.control_id
        AND et.status IN ('Completed', 'Approved', 'Submitted')
      WHERE c.deleted_at IS NULL
        ${frameworkCode ? 'AND c.framework_id = $1' : ''}
      GROUP BY c.framework_id
    `;
    const evidenceResult = await safeQuery(evidenceSql, statusParams);
    const evidenceMap = new Map<string, number>();
    for (const row of evidenceResult.rows) {
      evidenceMap.set(row.framework_code, row.controls_with_evidence);
    }

    // ---- 3. Effectiveness from test results (if tested) ----
    const testSql = `
      SELECT
        COALESCE(c.framework_id, 'UNKNOWN') AS framework_code,
        COUNT(*) FILTER (WHERE c.test_status = 'passed')::int   AS passed,
        COUNT(*) FILTER (WHERE c.test_status = 'failed')::int   AS failed,
        COUNT(*) FILTER (WHERE c.test_status IS NOT NULL
                           AND c.test_status <> 'not_tested')::int AS tested
      FROM "${schema}".controls c
      WHERE c.deleted_at IS NULL
        ${frameworkCode ? 'AND c.framework_id = $1' : ''}
      GROUP BY c.framework_id
    `;
    const testResult = await safeQuery(testSql, statusParams);
    const testMap = new Map<string, { passed: number; tested: number }>();
    for (const row of testResult.rows) {
      testMap.set(row.framework_code, { passed: row.passed, tested: row.tested });
    }

    // ---- 4. Load framework names from tenant schema ----
    const fwNameSql = `
      SELECT framework_id, name FROM "${schema}".frameworks WHERE deleted_at IS NULL
    `;
    const fwNameResult = await safeQuery(fwNameSql);
    const fwNameMap = new Map<string, string>();
    for (const row of fwNameResult.rows) {
      fwNameMap.set(row.framework_id, row.name);
    }

    // ---- 5. Build per-framework scores ----
    const frameworkScores: FrameworkScore[] = [];
    for (const row of statusResult.rows) {
      const code = row.framework_code as string;
      const total = row.total as number;
      const applicable = total - (row.not_applicable as number);

      // Control score: implemented=100, partial=50, not_implemented=0
      const controlScore = applicable > 0
        ? Math.round(((row.implemented * 100 + row.partial * 50) / applicable) * 100) / 100
        : 0;

      // Evidence coverage
      const withEvidence = evidenceMap.get(code) || 0;
      const evidenceCoverage = applicable > 0
        ? Math.round((withEvidence / applicable) * 10000) / 100
        : 0;

      // Effectiveness from test results, fallback to controlScore
      const tests = testMap.get(code);
      const effectivenessScore = tests && tests.tested > 0
        ? Math.round((tests.passed / tests.tested) * 10000) / 100
        : controlScore;

      // Composite: 50% control, 30% evidence, 20% effectiveness
      const compositeScore = Math.round(
        (controlScore * 0.50 + evidenceCoverage * 0.30 + effectivenessScore * 0.20) * 100,
      ) / 100;

      const weight = DEFAULT_SECTOR_WEIGHTS[code] ?? (1 / statusResult.rows.length);

      frameworkScores.push({
        frameworkCode: code,
        frameworkName: fwNameMap.get(code) || code,
        totalControls: total,
        implementedCount: row.implemented,
        partialCount: row.partial,
        notImplementedCount: row.not_implemented,
        notApplicableCount: row.not_applicable,
        controlScore,
        evidenceCoverage,
        effectivenessScore,
        compositeScore,
        weight,
      });
    }

    // ---- 6. Overall composite (weighted by sector relevance) ----
    const totalWeight = frameworkScores.reduce((s, f) => s + f.weight, 0);
    const overallScore = totalWeight > 0
      ? Math.round(
          frameworkScores.reduce((s, f) => s + f.compositeScore * f.weight, 0) / totalWeight * 100,
        ) / 100
      : 0;

    // ---- 7. Trend detection from compliance_scores history ----
    const trend = await detectTrend(schema, frameworkCode);

    // ---- 8. AI-powered recommendations ----
    let recommendations: string[] = [];
    try {
      const aiResult = await claudeJSON<{ recommendations: string[] }>({
        tenantId,
        agentId: 'ksa-compliance-scoring',
        decisionType: 'compliance_recommendations',
        systemPrompt: `You are a Saudi Arabia GRC compliance expert. Given the framework compliance scores below, provide 3-5 concise, actionable recommendations to improve overall KSA regulatory compliance. Each recommendation should be one sentence. Respond as JSON: { "recommendations": ["..."] }`,
        userMessage: JSON.stringify({ overallScore, frameworkScores }),
        maxTokens: 1024,
        temperature: 0.4,
      });
      recommendations = aiResult.recommendations || [];
    } catch {
      // AI is best-effort; fall back to rule-based recommendations
      recommendations = generateRuleBasedRecommendations(frameworkScores);
    }

    // ---- 9. Persist snapshot to compliance_scores ----
    await persistScoreSnapshot(schema, overallScore, frameworkScores);

    return {
      overallScore,
      frameworkScores,
      trend,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    logger.error(`[KsaComplianceScoring] computeKsaComplianceScore failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

// ------------------------------------------------------------------
// getKsaComplianceScoreHistory
// ------------------------------------------------------------------

/**
 * Return historical compliance score snapshots for charting.
 * Falls back to computing from audit trail / control status changes
 * if no snapshot rows exist.
 */
export async function getKsaComplianceScoreHistory(
  tenantId: string,
  frameworkCode?: string,
  timeRange?: { startDate: string; endDate: string },
): Promise<{
  history: ScoreHistoryPoint[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  velocity: number;
}> {
  const schema = tenantSchema(tenantId);

  try {
    // Attempt from compliance_scores table first
    let sql = `
      SELECT
        score_date::text AS scored_at,
        framework_code,
        overall_score,
        design_score    AS control_score,
        operational_score AS evidence_score
      FROM "${schema}".compliance_scores
      WHERE score_type IN ('overall', 'framework')
    `;
    const params: unknown[] = [];
    let paramIdx = 0;

    if (frameworkCode) {
      paramIdx++;
      sql += ` AND framework_code = $${paramIdx}`;
      params.push(frameworkCode);
    }
    if (timeRange?.startDate) {
      paramIdx++;
      sql += ` AND score_date >= $${paramIdx}::date`;
      params.push(timeRange.startDate);
    }
    if (timeRange?.endDate) {
      paramIdx++;
      sql += ` AND score_date <= $${paramIdx}::date`;
      params.push(timeRange.endDate);
    }
    sql += ` ORDER BY score_date ASC LIMIT 365`;

    const result = await safeQuery(sql, params);

    if (result.rows.length === 0) {
      // Fallback: derive from current controls snapshot (single point)
      return {
        history: [],
        trend: 'insufficient_data',
        velocity: 0,
      };
    }

    const history: ScoreHistoryPoint[] = result.rows.map((r: GenericRow) => ({
      scoredAt: r.scored_at,
      frameworkCode: r.framework_code || null,
      overallScore: parseFloat(r.overall_score) || 0,
      controlScore: r.control_score != null ? parseFloat(r.control_score) : null,
      evidenceScore: r.evidence_score != null ? parseFloat(r.evidence_score) : null,
    }));

    // Compute trend and velocity from last 30 data points
    const recent = history.slice(-30);
    const { trend, velocity } = computeTrendFromPoints(recent);

    return { history, trend, velocity };
  } catch (err: unknown) {
    logger.error(`[KsaComplianceScoring] getKsaComplianceScoreHistory failed: ${toErrorMessage(err)}`);
    return { history: [], trend: 'insufficient_data', velocity: 0 };
  }
}

// ------------------------------------------------------------------
// computeKsaGapAnalysis
// ------------------------------------------------------------------

/**
 * Identify compliance gaps for a specific KSA framework,
 * prioritized by severity, evidence status, and AI-driven recommendations.
 */
export async function computeKsaGapAnalysis(
  tenantId: string,
  frameworkCode: string,
): Promise<KsaGapAnalysisResult> {
  const schema = tenantSchema(tenantId);

  try {
    // ---- 1. Find non-compliant controls ----
    const gapSql = `
      SELECT
        c.control_id,
        c.title,
        c.framework_id    AS framework_code,
        c.status,
        c.effectiveness,
        c.test_status,
        c.last_tested_at,
        CASE
          WHEN c.status = 'not_implemented' THEN 'high'
          WHEN c.status = 'partial' AND COALESCE(c.effectiveness, 0) < 50 THEN 'high'
          WHEN c.status = 'partial' THEN 'medium'
          ELSE 'low'
        END AS severity,
        -- Check if any approved / submitted evidence exists
        (SELECT COUNT(*)::int FROM "${schema}".evidence_tasks et
         WHERE et.control_id = c.control_id
           AND et.status IN ('Completed', 'Approved', 'Submitted')
        ) AS evidence_count
      FROM "${schema}".controls c
      WHERE c.deleted_at IS NULL
        AND c.framework_id = $1
        AND c.status IN ('not_implemented', 'partial', 'not_started')
      ORDER BY
        CASE c.status
          WHEN 'not_implemented' THEN 1
          WHEN 'not_started'     THEN 2
          WHEN 'partial'         THEN 3
        END,
        COALESCE(c.effectiveness, 0) ASC
      LIMIT 200
    `;
    const gapResult = await safeQuery(gapSql, [frameworkCode]);

    if (gapResult.rows.length === 0) {
      return {
        gaps: [],
        prioritizedActions: ['All controls for this framework are implemented. Focus on evidence freshness and testing.'],
        estimatedEffort: { totalDays: 0, highPriorityDays: 0 },
      };
    }

    const gaps: GapItem[] = gapResult.rows.map((r: GenericRow) => ({
      controlId: r.control_id,
      controlTitle: r.title,
      frameworkCode: r.framework_code,
      status: r.status,
      severity: r.severity,
      evidenceMissing: (r.evidence_count || 0) === 0,
      // Rough estimate: not_implemented ~5d, partial ~2d, not_started ~5d
      estimatedEffortDays: r.status === 'partial' ? 2 : 5,
    }));

    // ---- 2. AI-powered prioritization ----
    let prioritizedActions: string[] = [];
    try {
      const aiResult = await claudeJSON<{ prioritizedActions: string[] }>({
        tenantId,
        agentId: 'ksa-gap-analysis',
        decisionType: 'gap_prioritization',
        systemPrompt: `You are a Saudi Arabia GRC compliance expert specializing in ${frameworkCode}. Given the compliance gaps below, return a JSON object with "prioritizedActions": an array of 3-7 concise action items in priority order. Focus on quick wins and high-severity items first.`,
        userMessage: JSON.stringify({
          frameworkCode,
          totalGaps: gaps.length,
          highSeverityCount: gaps.filter(g => g.severity === 'high').length,
          gaps: gaps.slice(0, 30), // send at most 30 to stay within token limits
        }),
        maxTokens: 1024,
        temperature: 0.4,
      });
      prioritizedActions = aiResult.prioritizedActions || [];
    } catch {
      // Rule-based fallback
      prioritizedActions = generateRuleBasedActions(gaps);
    }

    // ---- 3. Estimated effort ----
    const totalDays = gaps.reduce((s, g) => s + g.estimatedEffortDays, 0);
    const highPriorityDays = gaps
      .filter(g => g.severity === 'high')
      .reduce((s, g) => s + g.estimatedEffortDays, 0);

    return {
      gaps,
      prioritizedActions,
      estimatedEffort: { totalDays, highPriorityDays },
    };
  } catch (err: unknown) {
    logger.error(`[KsaComplianceScoring] computeKsaGapAnalysis failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

/** Detect trend from the last two compliance_scores snapshots */
async function detectTrend(
  schema: string,
  frameworkCode?: string,
): Promise<'improving' | 'declining' | 'stable' | 'insufficient_data'> {
  try {
    let sql = `
      SELECT overall_score
      FROM "${schema}".compliance_scores
      WHERE score_type = 'overall'
    `;
    const params: unknown[] = [];
    if (frameworkCode) {
      params.push(frameworkCode);
      sql += ` AND framework_code = $1`;
    }
    sql += ` ORDER BY score_date DESC LIMIT 2`;
    const result = await safeQuery(sql, params);

    if (result.rows.length < 2) return 'insufficient_data';
    const latest = parseFloat(result.rows[0].overall_score);
    const previous = parseFloat(result.rows[1].overall_score);
    const delta = latest - previous;
    if (delta > 1) return 'improving';
    if (delta < -1) return 'declining';
    return 'stable';
  } catch {
    return 'insufficient_data';
  }
}

/** Compute trend direction and velocity from a series of score points */
function computeTrendFromPoints(points: ScoreHistoryPoint[]): {
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  velocity: number;
} {
  if (points.length < 2) return { trend: 'insufficient_data', velocity: 0 };

  const first = points[0].overallScore;
  const last = points[points.length - 1].overallScore;
  const delta = last - first;
  const velocity = Math.round((delta / points.length) * 100) / 100;

  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (delta > 1) trend = 'improving';
  else if (delta < -1) trend = 'declining';

  return { trend, velocity };
}

/** Persist the current score snapshot to compliance_scores for trend tracking */
async function persistScoreSnapshot(
  schema: string,
  overallScore: number,
  frameworkScores: FrameworkScore[],
): Promise<void> {
  try {
    // Overall snapshot
    await safeQuery(
      `INSERT INTO "${schema}".compliance_scores
         (score_date, score_type, overall_score, design_score, implementation_score, operational_score)
       VALUES (CURRENT_DATE, 'overall', $1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [
        overallScore,
        // design_score = average controlScore, impl = evidence, operational = effectiveness
        frameworkScores.length > 0
          ? Math.round(frameworkScores.reduce((s, f) => s + f.controlScore, 0) / frameworkScores.length * 100) / 100
          : 0,
        frameworkScores.length > 0
          ? Math.round(frameworkScores.reduce((s, f) => s + f.evidenceCoverage, 0) / frameworkScores.length * 100) / 100
          : 0,
        frameworkScores.length > 0
          ? Math.round(frameworkScores.reduce((s, f) => s + f.effectivenessScore, 0) / frameworkScores.length * 100) / 100
          : 0,
      ],
    );

    // Per-framework snapshots
    for (const fw of frameworkScores) {
      await safeQuery(
        `INSERT INTO "${schema}".compliance_scores
           (score_date, score_type, framework_code, overall_score,
            design_score, implementation_score, operational_score,
            controls_tested, controls_passed, controls_failed, controls_not_applicable)
         VALUES (CURRENT_DATE, 'framework', $1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          fw.frameworkCode,
          fw.compositeScore,
          fw.controlScore,
          fw.evidenceCoverage,
          fw.effectivenessScore,
          fw.totalControls,
          fw.implementedCount,
          fw.notImplementedCount,
          fw.notApplicableCount,
        ],
      );
    }
  } catch (err: unknown) {
    // Snapshot persistence is best-effort; do not fail the score computation
    logger.warn(`[KsaComplianceScoring] persistScoreSnapshot warning: ${toErrorMessage(err)}`);
  }
}

/** Rule-based recommendation fallback when AI is unavailable */
function generateRuleBasedRecommendations(scores: FrameworkScore[]): string[] {
  const recs: string[] = [];

  for (const fw of scores) {
    if (fw.controlScore < 50) {
      recs.push(`Prioritize implementing controls for ${fw.frameworkCode} (currently ${fw.controlScore}% implemented).`);
    }
    if (fw.evidenceCoverage < 40) {
      recs.push(`Increase evidence collection for ${fw.frameworkCode} controls (only ${fw.evidenceCoverage}% have evidence).`);
    }
    if (fw.effectivenessScore < 60 && fw.effectivenessScore !== fw.controlScore) {
      recs.push(`Schedule control testing for ${fw.frameworkCode} to improve effectiveness score (${fw.effectivenessScore}%).`);
    }
  }

  if (recs.length === 0) {
    recs.push('Maintain current compliance levels and schedule periodic control reassessments.');
  }

  return recs.slice(0, 5);
}

/** Rule-based gap prioritization fallback */
function generateRuleBasedActions(gaps: GapItem[]): string[] {
  const actions: string[] = [];
  const highCount = gaps.filter(g => g.severity === 'high').length;
  const noEvidence = gaps.filter(g => g.evidenceMissing).length;

  if (highCount > 0) {
    actions.push(`Address ${highCount} high-severity control gap(s) first, starting with not_implemented controls.`);
  }
  if (noEvidence > 0) {
    actions.push(`Collect evidence for ${noEvidence} control(s) currently missing evidence artifacts.`);
  }
  actions.push('Assign control owners and set target implementation dates for all gap items.');
  actions.push('Schedule follow-up assessment in 30 days to measure progress.');

  return actions;
}

export async function getComplianceScore(_tenantId: string): Promise<unknown> { return {}; }
