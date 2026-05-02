/**
 * DORA Dashboard Service — Readiness dashboard, scores, gap analysis, trends.
 *
 * MP-25 §3.1: DORA readiness dashboard providing:
 *   - Overall readiness score (0-100)
 *   - Per-pillar scores (ICT Risk, Incident, Resilience, Third-Party, Information Sharing)
 *   - Gap analysis summary
 *   - Trend data over time
 *   - Evidence coverage metrics
 *
 * Aggregates data from obligations, resilience tests, mappings, and assets.
 *
 * @owner dora
 * @module dora
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { getObligationStats, getObligationCountsByPillar } from './dora-obligation.service';
import { calculateResilienceScore, getResilienceStats } from './dora-resilience.service';
import { analyzeGaps } from './dora-mapping.service';
import type { GenericRow as _GenericRow } from '@dos/types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Dashboard Result Types ─────────────────────────────────────────────
export interface PillarScore {
  pillar: string;
  pillarLabel: string;
  score: number;
  status: 'critical' | 'at_risk' | 'needs_improvement' | 'good' | 'excellent';
  obligationCount: number;
  activeObligations: number;
  overdueObligations: number;
  coveragePercent: number;
}

export interface ReadinessResult {
  overallScore: number;
  overallStatus: string;
  pillarScores: PillarScore[];
  lastCalculated: string;
}

export interface GapAnalysisResult {
  uncoveredArticles: string[];
  lowCoveragePillars: { pillar: string; coveragePercent: number }[];
  criticalGaps: { article: string; pillar: string; reason: string }[];
  totalGaps: number;
  overallCoverage: number;
}

export interface TrendPoint {
  date: string;
  score: number;
  obligationsActive: number;
  obligationsOverdue: number;
  testsCompleted: number;
}

// ── Pillar Labels ──────────────────────────────────────────────────────
const PILLAR_LABELS: Record<string, string> = {
  ict_risk_management: 'ICT Risk Management',
  incident_reporting: 'ICT Incident Reporting',
  resilience_testing: 'Digital Operational Resilience Testing',
  third_party_risk: 'Third-Party ICT Risk Management',
  information_sharing: 'Information Sharing',
};

/**
 * Classify score into a readiness status level.
 */
function classifyScore(score: number): PillarScore['status'] {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'needs_improvement';
  if (score >= 25) return 'at_risk';
  return 'critical';
}

/**
 * Calculate the overall DORA readiness score and per-pillar breakdown.
 * Combines obligation completion, resilience test results, and mapping coverage.
 */
export async function getReadinessScores(
  tenantId: string,
): Promise<ReadinessResult> {
  // Gather data from the three main data sources
  const [obligationsByPillar, resilienceScore, gapAnalysis] = await Promise.all([
    getObligationCountsByPillar(tenantId),
    calculateResilienceScore(tenantId),
    analyzeGaps(tenantId),
  ]);

  // Build per-pillar scores
  const pillarScores: PillarScore[] = [];
  const pillars = ['ict_risk_management', 'incident_reporting', 'resilience_testing', 'third_party_risk', 'information_sharing'];

  for (const pillar of pillars) {
    const oblData = obligationsByPillar.find(o => o.pillar === pillar);
    const coverageData = gapAnalysis.pillarCoverage.find(p => p.pillar === pillar);

    const obligationTotal = oblData?.total ?? 0;
    const obligationActive = oblData?.active ?? 0;
    const obligationOverdue = oblData?.overdue ?? 0;

    // Obligation completion rate (0-100)
    const obligationRate = obligationTotal > 0
      ? Math.round(((obligationTotal - obligationOverdue) / obligationTotal) * 100)
      : 100; // No obligations = fully compliant by default

    // Coverage rate from mapping (0-100)
    const coveragePercent = coverageData?.coveragePercent ?? 0;

    // Pillar-specific adjustments
    let pillarScore: number;
    if (pillar === 'resilience_testing') {
      // Resilience pillar also factors in test results
      pillarScore = Math.round((obligationRate * 0.3) + (coveragePercent * 0.3) + (resilienceScore.overallScore * 0.4));
    } else {
      pillarScore = Math.round((obligationRate * 0.5) + (coveragePercent * 0.5));
    }

    pillarScores.push({
      pillar,
      pillarLabel: PILLAR_LABELS[pillar] || pillar,
      score: Math.min(100, Math.max(0, pillarScore)),
      status: classifyScore(pillarScore),
      obligationCount: obligationTotal,
      activeObligations: obligationActive,
      overdueObligations: obligationOverdue,
      coveragePercent,
    });
  }

  // Overall score is weighted average of pillar scores
  const overallScore = pillarScores.length > 0
    ? Math.round(pillarScores.reduce((sum, p) => sum + p.score, 0) / pillarScores.length)
    : 0;

  return {
    overallScore,
    overallStatus: classifyScore(overallScore),
    pillarScores,
    lastCalculated: new Date().toISOString(),
  };
}

/**
 * Get gap analysis summary for the DORA dashboard.
 * Identifies uncovered articles, low-coverage pillars, and critical gaps.
 */
export async function getGapAnalysis(
  tenantId: string,
): Promise<GapAnalysisResult> {
  const analysis = await analyzeGaps(tenantId);

  // Identify low-coverage pillars (below 50%)
  const lowCoveragePillars = analysis.pillarCoverage
    .filter(p => p.coveragePercent < 50)
    .map(p => ({ pillar: p.pillar, coveragePercent: p.coveragePercent }));

  // Identify critical gaps (articles in high-priority pillars with no coverage)
  const criticalPillars = ['ict_risk_management', 'incident_reporting', 'resilience_testing'];
  const criticalGaps: GapAnalysisResult['criticalGaps'] = [];

  for (const pillarData of analysis.pillarCoverage) {
    if (criticalPillars.includes(pillarData.pillar) && pillarData.noCoverage > 0) {
      // Find uncovered articles for this pillar
      for (const article of analysis.uncoveredArticles) {
        // Determine pillar membership based on article number
        const artNum = parseInt(article.replace('Art. ', ''), 10);
        const belongsToPillar =
          (pillarData.pillar === 'ict_risk_management' && artNum >= 5 && artNum <= 16) ||
          (pillarData.pillar === 'incident_reporting' && artNum >= 17 && artNum <= 23) ||
          (pillarData.pillar === 'resilience_testing' && artNum >= 24 && artNum <= 27);

        if (belongsToPillar) {
          criticalGaps.push({
            article,
            pillar: pillarData.pillar,
            reason: `No control mapping exists for ${article} in ${PILLAR_LABELS[pillarData.pillar]}`,
          });
        }
      }
    }
  }

  return {
    uncoveredArticles: analysis.uncoveredArticles,
    lowCoveragePillars,
    criticalGaps,
    totalGaps: analysis.uncoveredArticles.length,
    overallCoverage: analysis.overallCoveragePercent,
  };
}

/**
 * Get trend data for DORA readiness over the last N months.
 * Reads from the dora_readiness_snapshots table, populated by background jobs.
 */
export async function getTrendData(
  tenantId: string,
  months: number = 6,
): Promise<TrendPoint[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       snapshot_date::text AS date,
       overall_score AS score,
       obligations_active,
       obligations_overdue,
       tests_completed
     FROM "${schema}".dora_readiness_snapshots
     WHERE snapshot_date >= NOW() - ($1 || ' months')::interval
     ORDER BY snapshot_date ASC`,
    [months],
  ).catch(() => ({ rows: [] }));

  return result.rows.map((row: Record<string, unknown>) => ({
    date: row.date,
    score: row.score ?? 0,
    obligationsActive: row.obligations_active ?? 0,
    obligationsOverdue: row.obligations_overdue ?? 0,
    testsCompleted: row.tests_completed ?? 0,
  }));
}

/**
 * Get evidence coverage metrics for the DORA dashboard.
 * Shows how much evidence is linked to DORA obligations and controls.
 */
export async function getEvidenceCoverage(
  tenantId: string,
): Promise<{
  totalObligations: number;
  obligationsWithEvidence: number;
  evidenceCoveragePercent: number;
  totalControlMappings: number;
  controlMappingsWithEvidence: number;
  controlEvidencePercent: number;
}> {
  const schema = tenantSchema(tenantId);

  // Obligations with evidence linked via obligation_mappings
  const oblResult = await safeQuery(
    `SELECT
       COUNT(DISTINCT o.obligation_id)::int AS total,
       COUNT(DISTINCT CASE WHEN om.evidence_id IS NOT NULL THEN o.obligation_id END)::int AS with_evidence
     FROM "${schema}".dora_obligations o
     LEFT JOIN "${schema}".dora_obligation_mappings om
       ON o.obligation_id = om.obligation_id AND om.deleted_at IS NULL AND om.mapping_type = 'evidence'
     WHERE o.deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, with_evidence: 0 }] }));

  const oblTotal = getFirstRow(oblResult)?.total ?? 0;
  const oblWithEvidence = getFirstRow(oblResult)?.with_evidence ?? 0;

  // Control mappings with evidence
  const ctrlResult = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE evidence_ids != '[]' AND evidence_ids IS NOT NULL)::int AS with_evidence
     FROM "${schema}".dora_control_mappings
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, with_evidence: 0 }] }));

  const ctrlTotal = getFirstRow(ctrlResult)?.total ?? 0;
  const ctrlWithEvidence = getFirstRow(ctrlResult)?.with_evidence ?? 0;

  return {
    totalObligations: oblTotal,
    obligationsWithEvidence: oblWithEvidence,
    evidenceCoveragePercent: oblTotal > 0 ? Math.round((oblWithEvidence / oblTotal) * 100) : 0,
    totalControlMappings: ctrlTotal,
    controlMappingsWithEvidence: ctrlWithEvidence,
    controlEvidencePercent: ctrlTotal > 0 ? Math.round((ctrlWithEvidence / ctrlTotal) * 100) : 0,
  };
}

/**
 * Get a comprehensive DORA dashboard summary combining all metrics.
 * Single-call convenience method for the frontend dashboard page.
 */
export async function getDashboardSummary(
  tenantId: string,
): Promise<{
  readiness: ReadinessResult;
  obligationStats: Awaited<ReturnType<typeof getObligationStats>>;
  resilienceStats: Awaited<ReturnType<typeof getResilienceStats>>;
  gapAnalysis: GapAnalysisResult;
  evidenceCoverage: Awaited<ReturnType<typeof getEvidenceCoverage>>;
  assetOverview: Record<string, number>;
}> {
  const schema = tenantSchema(tenantId);

  // Parallel data fetching for performance
  const [readiness, obligationStats, resilienceStats, gapAnalysis, evidenceCoverage, assetResult] = await Promise.all([
    getReadinessScores(tenantId),
    getObligationStats(tenantId),
    getResilienceStats(tenantId),
    getGapAnalysis(tenantId),
    getEvidenceCoverage(tenantId),
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical
       FROM "${schema}".dora_ict_assets
       WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{ total: 0, active: 0, critical: 0 }] })),
  ]);

  const assetRow = getFirstRow(assetResult)!;

  return {
    readiness,
    obligationStats,
    resilienceStats,
    gapAnalysis,
    evidenceCoverage,
    assetOverview: {
      totalAssets: assetRow?.total ?? 0,
      activeAssets: assetRow?.active ?? 0,
      criticalAssets: assetRow?.critical ?? 0,
    },
  };
}

/**
 * Persist a readiness snapshot for trend tracking.
 * Called by background job (dora-monitor) periodically.
 */
export async function saveReadinessSnapshot(
  tenantId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const readiness = await getReadinessScores(tenantId);
  const oblStats = await getObligationStats(tenantId);
  const resStats = await getResilienceStats(tenantId);

  await safeQuery(
    `INSERT INTO "${schema}".dora_readiness_snapshots
      (overall_score, pillar_scores, obligations_active, obligations_overdue, tests_completed, snapshot_date)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [
      readiness.overallScore,
      JSON.stringify(readiness.pillarScores),
      oblStats.active,
      oblStats.overdue,
      resStats.completed,
    ],
  ).catch(catchHandler(EC.FALLBACK_QUERY, {
    operation: 'persist DORA dashboard snapshot',
    tenantId,
  }));
}
