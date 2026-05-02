// ============================================
// Shahin-Ai — Qiyas Sector Benchmarking Service
// Cross-tenant anonymized benchmarking,
// maturity forecasting, and peer comparison.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

// ── Interfaces ──

export interface SectorBenchmark {
  sector_code: string;
  sector_name_en: string;
  sector_name_ar: string;
  model_code: string;
  participant_count: number;
  dimensions: DimensionBenchmark[];
  overall: BenchmarkStats;
  tenant_percentile: number;
  tenant_overall_score: number;
}

export interface DimensionBenchmark {
  dimension_code: string;
  dimension_name: string;
  tenant_score: number;
  sector_avg: number;
  sector_median: number;
  sector_min: number;
  sector_max: number;
  percentile: number;
}

export interface BenchmarkStats {
  avg: number;
  median: number;
  min: number;
  max: number;
  std_dev: number;
}

export interface MaturityForecast {
  current_level: number;
  target_level: number;
  estimated_weeks_to_target: number;
  velocity: number;
  improvement_actions: ImprovementAction[];
}

export interface ImprovementAction {
  domain_code: string;
  domain_name: string;
  current_score: number;
  target_score: number;
  action_en: string;
  action_ar: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_effort_hours: number;
}

export interface PeerComparisonResult {
  model_code: string;
  tenant_rank: number;
  total_peers: number;
  peers: PeerEntry[];
  opt_in: boolean;
  message?: string;
}

interface PeerEntry {
  label: string;
  overall_score: number;
  maturity_level: number;
  is_self: boolean;
}

// ── Helpers ──

/** Calculate median from a sorted array of numbers */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Calculate standard deviation */
function stdDev(values: number[], avg: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/** Calculate percentile rank of a value within a sorted array */
function percentileRank(sorted: number[], value: number): number {
  if (sorted.length === 0) return 0;
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return Math.round(((below + 0.5 * equal) / sorted.length) * 100);
}

/** Build stats from an array of numbers */
function buildStats(values: number[]): BenchmarkStats {
  if (values.length === 0) {
    return { avg: 0, median: 0, min: 0, max: 0, std_dev: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return {
    avg: Math.round(avg * 100) / 100,
    median: Math.round(median(sorted) * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    std_dev: Math.round(stdDev(values, avg) * 100) / 100,
  };
}

// ── Service Functions ──

/**
 * Get an anonymized sector benchmark for the given maturity model.
 * Aggregates assessment scores across all tenants in the same sector
 * and computes per-dimension statistics + percentile for the requesting tenant.
 *
 * Requires at least 3 participating tenants to produce meaningful benchmarks.
 */
export async function getSectorBenchmark(
  tenantId: string,
  modelCode: string
): Promise<SectorBenchmark | { message: string }> {
  // 1. Get the requesting tenant's sector from the public tenants table
  const tenantRow = await safeQuery(
    `SELECT sector_code, sector_name_en, sector_name_ar FROM public.tenants WHERE tenant_id = $1`,
    [tenantId]
  );
  if (tenantRow.rows.length === 0) {
    return { message: 'Tenant not found' };
  }
  const { sector_code, sector_name_en, sector_name_ar } = tenantRow.rows[0];

  // 2. Find all tenants in the same sector
  const sectorTenants = await safeQuery(
    `SELECT tenant_id FROM public.tenants WHERE sector_code = $1 AND status = 'active'`,
    [sector_code]
  );
  const tenantIds: string[] = sectorTenants.rows.map((r: GenericRow) => r.tenant_id);

  if (tenantIds.length < 3) {
    return {
      message: `Insufficient participants for benchmarking. At least 3 required, found ${tenantIds.length}.`,
    };
  }

  // 3. Gather the latest finalized assessment per tenant for this model
  const allScores: { tenant_id: string; overall_score: number; domain_scores: unknown[] }[] = [];

  for (const tid of tenantIds) {
    const schema = tenantSchema(tid);
    const result = await safeQuery(
      `SELECT a.overall_score, a.domain_scores, a.tenant_id
       FROM "${schema}".qiyas_assessments a
       JOIN "${schema}".qiyas_models m ON m.model_id = a.model_id
       WHERE m.model_code = $1 AND a.status = 'finalized'
       ORDER BY a.updated_at DESC LIMIT 1`,
      [modelCode]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      allScores.push({
        tenant_id: tid,
        overall_score: parseFloat(row.overall_score) || 0,
        domain_scores: Array.isArray(row.domain_scores)
          ? row.domain_scores
          : (typeof row.domain_scores === 'string' ? JSON.parse(row.domain_scores) : []),
      });
    }
  }

  if (allScores.length < 3) {
    return {
      message: `Insufficient finalized assessments for benchmarking. At least 3 required, found ${allScores.length}.`,
    };
  }

  // 4. Calculate overall stats
  const overallValues = allScores.map((s) => s.overall_score);
  const overallStats = buildStats(overallValues);
  const sortedOverall = [...overallValues].sort((a, b) => a - b);

  // 5. Find tenant's own score
  const tenantData = allScores.find((s) => s.tenant_id === tenantId);
  const tenantOverallScore = tenantData?.overall_score ?? 0;
  const tenantPercentile = percentileRank(sortedOverall, tenantOverallScore);

  // 6. Per-dimension benchmarking
  // Collect all unique dimension codes across all participants
  const dimensionMap: Record<string, { name: string; scores: { tenant_id: string; score: number }[] }> = {};
  for (const entry of allScores) {
    for (const ds of entry.domain_scores) {

      const code = ds.domain_code || ds.domain_id || ds.dimension_code || 'any';

      const name = ds.domain_name || ds.dimension_name || code;
      if (!dimensionMap[code]) {
        dimensionMap[code] = { name, scores: [] };
      }
      dimensionMap[code].scores.push({
        tenant_id: entry.tenant_id,

        score: parseFloat(ds.raw_score ?? ds.score ?? ds.weighted_score ?? 0),
      });
    }
  }

  const dimensions: DimensionBenchmark[] = [];
  for (const [code, data] of Object.entries(dimensionMap)) {
    const values = data.scores.map((s) => s.score);
    const stats = buildStats(values);
    const sorted = [...values].sort((a, b) => a - b);
    const tenantDimScore = data.scores.find((s) => s.tenant_id === tenantId)?.score ?? 0;

    dimensions.push({
      dimension_code: code,
      dimension_name: data.name,
      tenant_score: tenantDimScore,
      sector_avg: stats.avg,
      sector_median: stats.median,
      sector_min: stats.min,
      sector_max: stats.max,
      percentile: percentileRank(sorted, tenantDimScore),
    });
  }

  return {
    sector_code,
    sector_name_en: sector_name_en || sector_code,
    sector_name_ar: sector_name_ar || '',
    model_code: modelCode,
    participant_count: allScores.length,
    dimensions,
    overall: overallStats,
    tenant_percentile: tenantPercentile,
    tenant_overall_score: tenantOverallScore,
  };
}

/**
 * Forecast maturity progression based on historical assessment trend.
 * Requires at least 2 historical assessments to compute velocity; returns
 * template-based improvement actions for the lowest-scoring domains.
 */
export async function getMaturityForecast(
  tenantId: string,
  modelCode: string,
  targetLevel: number
): Promise<MaturityForecast> {
  const schema = tenantSchema(tenantId);

  // Get historical assessment scores (most recent first)
  const history = await safeQuery(
    `SELECT a.overall_score, a.maturity_level, a.domain_scores, a.updated_at
     FROM "${schema}".qiyas_assessments a
     JOIN "${schema}".qiyas_models m ON m.model_id = a.model_id
     WHERE m.model_code = $1 AND a.status = 'finalized'
     ORDER BY a.updated_at DESC
     LIMIT 12`,
    [modelCode]
  );

  const assessments = history.rows;
  const currentLevel = assessments.length > 0 ? (parseFloat(assessments[0].maturity_level) || 0) : 0;
  const _currentScore = assessments.length > 0 ? (parseFloat(assessments[0].overall_score) || 0) : 0;

  // Calculate velocity: score improvement per month
  let velocity = 0;
  if (assessments.length >= 2) {
    const newest = assessments[0];
    const oldest = assessments[assessments.length - 1];
    const scoreDiff = parseFloat(newest.overall_score) - parseFloat(oldest.overall_score);
    const timeDiffMs = new Date(newest.updated_at).getTime() - new Date(oldest.updated_at).getTime();
    const monthsDiff = Math.max(timeDiffMs / (1000 * 60 * 60 * 24 * 30), 1);
    velocity = Math.round((scoreDiff / monthsDiff) * 100) / 100;
  }

  // Estimate weeks to target based on velocity
  let estimatedWeeks = 0;
  if (velocity > 0 && currentLevel < targetLevel) {
    // Rough estimate: each maturity level ~ 20 score points
    const pointsNeeded = (targetLevel - currentLevel) * 20;
    const monthsNeeded = pointsNeeded / velocity;
    estimatedWeeks = Math.ceil(monthsNeeded * 4.33);
  } else if (currentLevel >= targetLevel) {
    estimatedWeeks = 0;
  } else {
    // No positive velocity; cannot forecast
    estimatedWeeks = -1; // indicates stagnation
  }

  // Generate improvement actions for lowest-scoring domains
  const domainScores = assessments.length > 0
    ? (Array.isArray(assessments[0].domain_scores)
        ? assessments[0].domain_scores
        : typeof assessments[0].domain_scores === 'string'
          ? JSON.parse(assessments[0].domain_scores)
          : [])
    : [];

  // Sort by score ascending to find weakest domains
  const sortedDomains = [...domainScores].sort(
    (a: any, b: any) => (parseFloat(a.raw_score ?? a.score ?? 0)) - (parseFloat(b.raw_score ?? b.score ?? 0))
  );

  const improvementActions: ImprovementAction[] = [];
  for (const d of sortedDomains.slice(0, 8)) {
    const score = parseFloat(d.raw_score ?? d.score ?? d.weighted_score ?? 0);
    const code = d.domain_code || d.domain_id || 'any';
    const name = d.domain_name || d.dimension_name || code;
    const targetScore = Math.min(score + 20, 100);

    const action = generateDomainAction(code, name, score);
    improvementActions.push({
      domain_code: code,
      domain_name: name,
      current_score: score,
      target_score: targetScore,
      action_en: action.en,
      action_ar: action.ar,
      priority: score < 30 ? 'critical' : score < 50 ? 'high' : score < 70 ? 'medium' : 'low',
      estimated_effort_hours: score < 30 ? 120 : score < 50 ? 80 : score < 70 ? 40 : 20,
    });
  }

  return {
    current_level: currentLevel,
    target_level: targetLevel,
    estimated_weeks_to_target: estimatedWeeks,
    velocity,
    improvement_actions: improvementActions,
  };
}

/**
 * Get anonymized peer comparison for opt-in tenants within the same sector.
 * Peers are labelled "Peer 1", "Peer 2", etc. The requesting tenant
 * is marked with is_self=true.
 */
export async function getPeerComparison(
  tenantId: string,
  modelCode: string
): Promise<PeerComparisonResult> {
  // Check if this tenant has opted in to peer comparison
  const tenantRow = await safeQuery(
    `SELECT sector_code, benchmark_opt_in FROM public.tenants WHERE tenant_id = $1`,
    [tenantId]
  );
  if (tenantRow.rows.length === 0) {
    return {
      model_code: modelCode,
      tenant_rank: 0,
      total_peers: 0,
      peers: [],
      opt_in: false,
      message: 'Tenant not found',
    };
  }
  const { sector_code, benchmark_opt_in } = tenantRow.rows[0];

  if (!benchmark_opt_in) {
    return {
      model_code: modelCode,
      tenant_rank: 0,
      total_peers: 0,
      peers: [],
      opt_in: false,
      message: 'Tenant has not opted in to peer comparison. Enable benchmark_opt_in to participate.',
    };
  }

  // Fetch all opted-in tenants in the same sector
  const optedIn = await safeQuery(
    `SELECT tenant_id FROM public.tenants
     WHERE sector_code = $1 AND status = 'active' AND benchmark_opt_in = true`,
    [sector_code]
  );

  // Gather latest finalized scores per tenant
  const peerScores: { tenant_id: string; overall_score: number; maturity_level: number }[] = [];
  for (const row of optedIn.rows) {
    const schema = tenantSchema(row.tenant_id);
    const result = await safeQuery(
      `SELECT a.overall_score, a.maturity_level
       FROM "${schema}".qiyas_assessments a
       JOIN "${schema}".qiyas_models m ON m.model_id = a.model_id
       WHERE m.model_code = $1 AND a.status = 'finalized'
       ORDER BY a.updated_at DESC LIMIT 1`,
      [modelCode]
    );
    if (result.rows.length > 0) {
      peerScores.push({
        tenant_id: row.tenant_id,
        overall_score: parseFloat(result.rows[0].overall_score) || 0,
        maturity_level: parseFloat(result.rows[0].maturity_level) || 0,
      });
    }
  }

  if (peerScores.length < 3) {
    return {
      model_code: modelCode,
      tenant_rank: 0,
      total_peers: peerScores.length,
      peers: [],
      opt_in: true,
      message: `Insufficient opted-in peers for comparison. At least 3 required, found ${peerScores.length}.`,
    };
  }

  // Sort by overall_score descending for ranking
  peerScores.sort((a, b) => b.overall_score - a.overall_score);

  // Build anonymized peer list
  let peerIndex = 0;
  let tenantRank = 0;
  const peers: PeerEntry[] = peerScores.map((p, idx) => {
    const isSelf = p.tenant_id === tenantId;
    if (isSelf) {
      tenantRank = idx + 1;
    }
    const label = isSelf ? 'You' : `Peer ${++peerIndex}`;
    return {
      label,
      overall_score: Math.round(p.overall_score * 100) / 100,
      maturity_level: p.maturity_level,
      is_self: isSelf,
    };
  });

  return {
    model_code: modelCode,
    tenant_rank: tenantRank,
    total_peers: peers.length,
    peers,
    opt_in: true,
  };
}

// ── Template-based improvement action generator ──

/**
 * Generate domain-specific improvement recommendations based on
 * the domain code keyword and current score.
 */
function generateDomainAction(
  domainCode: string,
  domainName: string,
  score: number
): { en: string; ar: string } {
  const code = domainCode.toLowerCase();

  if (code.includes('control') && score < 60) {
    return {
      en: `Implement automated control testing for ${domainName}`,
      ar: `تطبيق اختبار الضوابط الآلي لمجال ${domainName}`,
    };
  }
  if (code.includes('evidence') && score < 60) {
    return {
      en: `Establish evidence collection schedules for ${domainName}`,
      ar: `وضع جداول جمع الأدلة لمجال ${domainName}`,
    };
  }
  if (code.includes('governance') && score < 60) {
    return {
      en: `Define RACI matrix for ${domainName} decisions`,
      ar: `تحديد مصفوفة RACI لقرارات ${domainName}`,
    };
  }
  if (code.includes('risk') && score < 60) {
    return {
      en: `Conduct comprehensive risk assessment for ${domainName}`,
      ar: `إجراء تقييم شامل للمخاطر لمجال ${domainName}`,
    };
  }
  if (code.includes('policy') && score < 60) {
    return {
      en: `Review and update policy documentation for ${domainName}`,
      ar: `مراجعة وتحديث وثائق السياسات لمجال ${domainName}`,
    };
  }
  if (code.includes('audit') && score < 60) {
    return {
      en: `Strengthen audit procedures and finding resolution for ${domainName}`,
      ar: `تعزيز إجراءات التدقيق ومعالجة النتائج لمجال ${domainName}`,
    };
  }
  if (code.includes('compliance') && score < 60) {
    return {
      en: `Enhance compliance monitoring and reporting for ${domainName}`,
      ar: `تعزيز مراقبة الامتثال والتقارير لمجال ${domainName}`,
    };
  }
  if (code.includes('technology') || code.includes('it')) {
    return {
      en: `Improve technology controls and security posture for ${domainName}`,
      ar: `تحسين ضوابط التكنولوجيا والوضع الأمني لمجال ${domainName}`,
    };
  }

  // Generic fallback for any domain
  if (score < 40) {
    return {
      en: `Establish foundational processes and documentation for ${domainName}`,
      ar: `وضع العمليات والتوثيق الأساسي لمجال ${domainName}`,
    };
  }
  if (score < 60) {
    return {
      en: `Standardize and formalize practices for ${domainName}`,
      ar: `توحيد وتطوير الممارسات لمجال ${domainName}`,
    };
  }
  if (score < 80) {
    return {
      en: `Optimize and automate workflows for ${domainName}`,
      ar: `تحسين وأتمتة سير العمل لمجال ${domainName}`,
    };
  }
  return {
    en: `Maintain continuous improvement practices for ${domainName}`,
    ar: `الحفاظ على ممارسات التحسين المستمر لمجال ${domainName}`,
  };
}
