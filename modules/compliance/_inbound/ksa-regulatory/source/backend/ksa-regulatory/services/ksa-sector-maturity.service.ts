import { logger } from '../ports/logger.port';
// ============================================================================
// KSA Sector Maturity Assessment Service
// Calculates organizational maturity across 5 dimensions (Governance, Risk,
// Compliance, Technology, People) using real tenant data. Provides sector
// benchmarking, trend analysis, and AI-generated improvement roadmaps.
// Maturity levels follow CMMI-aligned 1-5 scale:
//   1=Initial, 2=Managed, 3=Defined, 4=Quantitatively Managed, 5=Optimizing
// ============================================================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { claudeJSON } from '../ports/ai.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// Re-export types so callers importing from this file still work
export type {
  MaturityLevel, MaturityDimension, SectorMaturityResult, SectorBenchmarkResult,
  MaturityTrendPoint, MaturityTrendResult, MaturityRoadmapItem, MaturityRoadmapResult,
} from './ksa-sector-maturity.types';
export { MATURITY_LABELS, MATURITY_LABELS_AR, scoreToLevel } from './ksa-sector-maturity.types';

import type {
  MaturityDimension, MaturityLevel, MaturityRoadmapItem, MaturityRoadmapResult,
  SectorMaturityResult, SectorBenchmarkResult, MaturityTrendResult, MaturityTrendPoint,
} from './ksa-sector-maturity.types';
import { MATURITY_LABELS, scoreToLevel } from './ksa-sector-maturity.types';

// Dimension assessors (extracted to companion file)
import {
  assessGovernanceMaturity, assessRiskMaturity, assessComplianceMaturity,
  assessTechnologyMaturity, assessPeopleMaturity,
} from './ksa-sector-maturity-dimensions';

// Helpers (extracted to companion file)
import {
  persistMaturitySnapshot, getTenantSector, getIndustryBenchmarks,
  calculatePercentile, buildFallbackNarrative, buildFallbackRoadmap,
  buildFallbackRoadmapResult,
} from './ksa-sector-maturity-helpers';

const LOG_PREFIX = '[KsaSectorMaturity]';

// === Public API ===

/**
 * Calculate maturity score across 5 dimensions using real tenant data.
 * Each dimension is assessed from quantitative DB metrics.
 */
export async function getSectorMaturityScore(
  tenantId: string
): Promise<SectorMaturityResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date();

  // 1. Determine tenant's sector
  const sectorInfo = await getTenantSector(schema, tenantId);

  // 2. Calculate each maturity dimension in parallel
  const [governance, risk, compliance, technology, people] = await Promise.all([
    assessGovernanceMaturity(schema),
    assessRiskMaturity(schema),
    assessComplianceMaturity(schema),
    assessTechnologyMaturity(schema),
    assessPeopleMaturity(schema),
  ]);

  const dimensions: MaturityDimension[] = [governance, risk, compliance, technology, people];

  // 3. Overall score is a weighted average (compliance and risk weighted higher for KSA regulatory context)
  const weights = { governance: 0.20, risk: 0.25, compliance: 0.25, technology: 0.15, people: 0.15 };
  const weightedScore =
    governance.score * weights.governance +
    risk.score * weights.risk +
    compliance.score * weights.compliance +
    technology.score * weights.technology +
    people.score * weights.people;
  const overallScore = Math.round(weightedScore);
  const overallLevel = scoreToLevel(overallScore);

  // 4. Generate AI narrative and roadmap
  let narrative = '';
  let roadmap: MaturityRoadmapItem[] = [];

  try {
    const aiResult = await claudeJSON<{
      narrative: string;
      roadmap: Array<{
        phase: number; title: string; description: string; dimension: string;
        impact: string; effort: string; estimatedWeeks: number; dependencies: string[];
      }>;
    }>({
      tenantId,
      agentId: 'ksa-maturity-assessor',
      decisionType: 'maturity_assessment',
      skipPiiRedaction: true,
      systemPrompt: `You are a senior GRC maturity consultant specializing in KSA regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, NDMO). Generate a maturity assessment narrative and improvement roadmap.`,
      userMessage: `Assess this organization's maturity profile and generate:
1. A narrative summary (200-300 words) of their current maturity state, strengths, and weaknesses
2. A prioritized roadmap of 5-8 improvement actions

Organization maturity data:
- Overall: ${overallScore}/100 (Level ${overallLevel}: ${MATURITY_LABELS[overallLevel]})
- Governance: ${governance.score}/100 — indicators: ${JSON.stringify(governance.indicators)}
- Risk: ${risk.score}/100 — indicators: ${JSON.stringify(risk.indicators)}
- Compliance: ${compliance.score}/100 — indicators: ${JSON.stringify(compliance.indicators)}
- Technology: ${technology.score}/100 — indicators: ${JSON.stringify(technology.indicators)}
- People: ${people.score}/100 — indicators: ${JSON.stringify(people.indicators)}
- Sector: ${sectorInfo.sectorCode} (${sectorInfo.sectorName})

Respond with JSON: { "narrative": "...", "roadmap": [{ "phase": 1, "title": "...", "description": "...", "dimension": "governance|risk|compliance|technology|people", "impact": "high|medium|low", "effort": "high|medium|low", "estimatedWeeks": N, "dependencies": [] }] }`,
      maxTokens: 2000,
      temperature: 0.4,
    });

    narrative = aiResult.narrative || '';
    roadmap = (aiResult.roadmap || []).map(item => ({
      phase: item.phase || 1,
      title: item.title || '',
      description: item.description || '',
      dimension: item.dimension || 'compliance',
      impact: (['high', 'medium', 'low'].includes(item.impact) ? item.impact : 'medium') as 'high' | 'medium' | 'low',
      effort: (['high', 'medium', 'low'].includes(item.effort) ? item.effort : 'medium') as 'high' | 'medium' | 'low',
      estimatedWeeks: item.estimatedWeeks || 4,
      dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
    }));
  } catch (err) {
    logger.error(`${LOG_PREFIX} AI maturity narrative failed:`, err);
    narrative = buildFallbackNarrative(overallScore, overallLevel, dimensions);
    roadmap = buildFallbackRoadmap(dimensions);
  }

  // 5. Persist snapshot for trend tracking
  await persistMaturitySnapshot(schema, tenantId, overallScore, overallLevel, dimensions).catch(err => {
    logger.error(`${LOG_PREFIX} Failed to persist maturity snapshot:`, err);
  });

  return {
    overallScore,
    overallLevel,
    overallLevelLabel: MATURITY_LABELS[overallLevel],
    dimensions,
    sectorBenchmark: sectorInfo.sectorCode
      ? { sectorCode: sectorInfo.sectorCode, sectorName: sectorInfo.sectorName, available: true }
      : null,
    narrative,
    roadmap,
    assessedAt: now.toISOString(),
  };
}

/**
 * Compare tenant maturity against sector peers.
 * Uses anonymized aggregate data from other tenants in the same sector.
 * Falls back to industry standard benchmarks if insufficient peer data.
 */
export async function getSectorBenchmark(
  tenantId: string,
  sectorCode?: string
): Promise<SectorBenchmarkResult> {
  // Get tenant's own maturity
  const ownMaturity = await getSectorMaturityScore(tenantId);
  const resolvedSector = sectorCode || ownMaturity.sectorBenchmark?.sectorCode || '';

  // Try to get anonymized peer data from public schema
  let peerScores: Array<{ overall: number; dimensions: Record<string, number> }> = [];
  if (resolvedSector) {
    const peerRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT ms.overall_score, ms.dimension_scores
       FROM public.maturity_snapshots ms
       JOIN public.tenant_sectors ts ON ts.tenant_id = ms.tenant_id
       WHERE ts.sector_code = $1
         AND ms.tenant_id != $2
         AND ms.assessed_at > NOW() - INTERVAL '90 days'
       ORDER BY ms.assessed_at DESC`,
      [resolvedSector, tenantId]
    ), { operation: 'fallback query' });

    peerScores = peerRes.rows.map((r: GenericRow) => ({
      overall: r.overall_score || 0,
      dimensions: r.dimension_scores || {},
    }));
  }

  // If insufficient peer data (<3 peers), use industry standard benchmarks
  const useBenchmark = peerScores.length < 3;
  if (useBenchmark) {
    peerScores = getIndustryBenchmarks(resolvedSector);
  }

  // Calculate statistics
  const peerOveralls = peerScores.map(p => p.overall).sort((a, b) => a - b);
  const sectorAverage = peerOveralls.length > 0
    ? Math.round(peerOveralls.reduce((s, v) => s + v, 0) / peerOveralls.length) : 50;
  const topQuartile = peerOveralls.length > 0
    ? peerOveralls[Math.floor(peerOveralls.length * 0.75)] || sectorAverage : 70;
  const percentile = calculatePercentile(ownMaturity.overallScore, peerOveralls);

  // Per-dimension comparison
  const dimKeys = ['governance', 'risk', 'compliance', 'technology', 'people'];
  const dimComparison = dimKeys.map(key => {
    const ownDim = ownMaturity.dimensions.find(d => d.key === key);
    const peerDimScores = peerScores
      .map(p => p.dimensions[key] || 0)
      .filter(v => v > 0)
      .sort((a, b) => a - b);
    const dimAvg = peerDimScores.length > 0
      ? Math.round(peerDimScores.reduce((s, v) => s + v, 0) / peerDimScores.length) : 50;
    const dimTop = peerDimScores.length > 0
      ? peerDimScores[Math.floor(peerDimScores.length * 0.75)] || dimAvg : 70;

    return {
      key,
      name: ownDim?.name || key,
      tenantScore: ownDim?.score || 0,
      sectorAverage: dimAvg,
      topQuartile: dimTop,
      percentile: calculatePercentile(ownDim?.score || 0, peerDimScores),
    };
  });

  // Generate recommendations based on comparison
  const recommendations: string[] = [];
  for (const dim of dimComparison) {
    if (dim.tenantScore < dim.sectorAverage) {
      recommendations.push(
        `${dim.name} maturity (${dim.tenantScore}) is below sector average (${dim.sectorAverage}). ` +
        `Prioritize improvement to reach at least the sector median.`
      );
    }
  }
  if (percentile >= 75) {
    recommendations.push('Organization is in the top quartile. Focus on sustaining maturity and sharing best practices.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Maturity levels are within expected range for the sector. Continue current improvement trajectory.');
  }

  return {
    percentile,
    sectorAverage,
    topQuartile,
    dimensions: dimComparison,
    recommendations,
  };
}

/**
 * Track maturity progression over time using historical snapshots.
 * Calculates improvement velocity and projects time to next maturity level.
 */
export async function getMaturityTrend(
  tenantId: string,
  timeRange?: { from?: string; to?: string }
): Promise<MaturityTrendResult> {
  const schema = tenantSchema(tenantId);

  const from = timeRange?.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = timeRange?.to || new Date().toISOString().slice(0, 10);

  // Query historical maturity snapshots from the dashboard_snapshots or a dedicated table
  const snapshotRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT snapshot_date::text AS date,
            COALESCE((data->>'maturity_overall')::int, 0) AS overall_score,
            data->'maturity_dimensions' AS dimensions
     FROM "${schema}".dashboard_snapshots
     WHERE snapshot_date >= $1::date AND snapshot_date <= $2::date
       AND data ? 'maturity_overall'
     ORDER BY snapshot_date ASC`,
    [from, to]
  ), { operation: 'query dashboard_snapshots' });

  let trend: MaturityTrendPoint[] = snapshotRes.rows.map((r: GenericRow) => ({
    date: r.date,
    overallScore: r.overall_score,
    overallLevel: scoreToLevel(r.overall_score),
    dimensions: typeof r.dimensions === 'object' ? r.dimensions : {},
  }));

  // If no historical data, compute current as single point
  if (trend.length === 0) {
    const current = await getSectorMaturityScore(tenantId);
    const dimMap: Record<string, number> = {};
    for (const d of current.dimensions) {
      dimMap[d.key] = d.score;
    }
    trend = [{
      date: new Date().toISOString().slice(0, 10),
      overallScore: current.overallScore,
      overallLevel: current.overallLevel,
      dimensions: dimMap,
    }];
  }

  // Calculate improvement velocity (points per month)
  const currentScore = trend[trend.length - 1].overallScore;
  const currentLevel = scoreToLevel(currentScore);
  let improvementVelocity = 0;

  if (trend.length >= 2) {
    const oldest = trend[0];
    const newest = trend[trend.length - 1];
    const monthsElapsed = Math.max(1,
      (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    improvementVelocity = Math.round(((newest.overallScore - oldest.overallScore) / monthsElapsed) * 10) / 10;
  }

  // Project next level
  let projectedNextLevel: MaturityLevel | null = null;
  let projectedDate: string | null = null;

  if (currentLevel < 5 && improvementVelocity > 0) {
    const nextLevelThreshold = currentLevel === 1 ? 25 : currentLevel === 2 ? 45 : currentLevel === 3 ? 65 : 85;
    const pointsNeeded = nextLevelThreshold - currentScore;
    const monthsToNext = Math.ceil(pointsNeeded / improvementVelocity);
    projectedNextLevel = (currentLevel + 1) as MaturityLevel;
    projectedDate = new Date(Date.now() + monthsToNext * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  return {
    trend,
    currentLevel,
    currentScore,
    projectedNextLevel,
    projectedDate,
    improvementVelocity,
  };
}

/**
 * Generate a comprehensive AI-powered maturity improvement roadmap.
 * Analyzes lowest-scoring dimensions and creates a phased plan.
 */
export async function generateMaturityRoadmap(
  tenantId: string
): Promise<MaturityRoadmapResult> {
  const maturity = await getSectorMaturityScore(tenantId);

  // Sort dimensions by score (lowest first) to prioritize weakest areas
  const sorted = [...maturity.dimensions].sort((a, b) => a.score - b.score);

  try {
    const aiRoadmap = await claudeJSON<{
      phases: Array<{
        phase: number; title: string;
        items: Array<{
          title: string; description: string; dimension: string;
          impact: string; effort: string; estimatedWeeks: number; dependencies: string[];
        }>;
      }>;
      quickWins: Array<{
        title: string; description: string; dimension: string;
        impact: string; effort: string; estimatedWeeks: number;
      }>;
      longTermGoals: Array<{
        title: string; description: string; dimension: string;
        impact: string; effort: string; estimatedWeeks: number;
      }>;
      estimatedTimeline: string;
    }>({
      tenantId,
      agentId: 'ksa-maturity-roadmap',
      decisionType: 'maturity_roadmap',
      skipPiiRedaction: true,
      systemPrompt: `You are a GRC maturity improvement consultant for Saudi Arabian organizations. Generate actionable, phased improvement plans aligned with KSA regulatory requirements (NCA-ECC, SAMA-CSF, PDPL, NDMO).`,
      userMessage: `Generate a maturity improvement roadmap for this organization:

Current maturity: Level ${maturity.overallLevel} (${maturity.overallLevelLabel}), Score: ${maturity.overallScore}/100

Dimension details (weakest first):
${sorted.map(d => `- ${d.name}: ${d.score}/100 (Level ${d.level}) — indicators: ${JSON.stringify(d.indicators)}`).join('\n')}

Sector: ${maturity.sectorBenchmark?.sectorName || 'General'}

Requirements:
1. Create 3 phases (Foundation 0-3mo, Build 3-6mo, Optimize 6-12mo)
2. 3-5 items per phase, prioritized by impact/effort ratio
3. 3-4 quick wins (high impact, low effort, <4 weeks)
4. 2-3 long-term goals (strategic, 6+ months)
5. All items must reference specific KSA regulatory requirements where applicable

Respond with JSON: { "phases": [{ "phase": 1, "title": "...", "items": [{ "title": "...", "description": "...", "dimension": "governance|risk|compliance|technology|people", "impact": "high|medium|low", "effort": "high|medium|low", "estimatedWeeks": N, "dependencies": [] }] }], "quickWins": [...], "longTermGoals": [...], "estimatedTimeline": "12 months" }`,
      maxTokens: 3000,
      temperature: 0.4,
    });

    interface AiRoadmapItem {
      title: string; description: string; dimension: string;
      impact: string; effort: string; estimatedWeeks: number; dependencies?: string[];
    }

    const mapItem = (item: AiRoadmapItem, phase: number): MaturityRoadmapItem => ({
      phase,
      title: item.title || '',
      description: item.description || '',
      dimension: item.dimension || 'compliance',
      impact: (['high', 'medium', 'low'].includes(item.impact) ? item.impact : 'medium') as 'high' | 'medium' | 'low',
      effort: (['high', 'medium', 'low'].includes(item.effort) ? item.effort : 'medium') as 'high' | 'medium' | 'low',
      estimatedWeeks: item.estimatedWeeks || 4,
      dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
    });

    const phases = (aiRoadmap.phases || []).map(p => ({
      phase: p.phase,
      title: p.title || `Phase ${p.phase}`,
      items: (p.items || []).map(i => mapItem(i, p.phase)),
      estimatedWeeks: (p.items || []).reduce((s: number, i: AiRoadmapItem) => s + (i.estimatedWeeks || 4), 0),
    }));

    return {
      phases,
      quickWins: (aiRoadmap.quickWins || []).map(i => mapItem(i, 0)),
      longTermGoals: (aiRoadmap.longTermGoals || []).map(i => mapItem(i, 4)),
      estimatedTimeline: aiRoadmap.estimatedTimeline || '12 months',
    };
  } catch (err) {
    logger.error(`${LOG_PREFIX} AI roadmap generation failed:`, err);
    return buildFallbackRoadmapResult(sorted);
  }
}

// Dimension assessment helpers, persistence, sector/benchmark helpers, and
// fallback content generators have been extracted to companion files:
//   - ksa-sector-maturity-dimensions.ts (assessXxxMaturity functions)
//   - ksa-sector-maturity-helpers.ts (persistence, sector lookup, benchmarks, fallbacks)

export async function assessMaturity(_tenantId: string): Promise<unknown> { return getSectorMaturityScore(_tenantId); }
