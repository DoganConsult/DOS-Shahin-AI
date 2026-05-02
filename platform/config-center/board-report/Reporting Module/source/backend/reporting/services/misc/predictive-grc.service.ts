/**
 * Predictive GRC Service — Pillar 7a
 *
 * ML-powered predictions:
 * 1. Risk prediction — predict next breach based on historical patterns
 * 2. Compliance forecast — predict audit readiness based on evidence freshness
 * 3. Resource optimizer — recommend team allocation based on risk exposure
 * 4. Trend analysis — detect deteriorating metrics early
 */

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

interface RiskRow {
  risk_id: string; title: string; severity: string; status: string;
  likelihood: number; impact: number; created_at: string; updated_at: string;
  open_tasks: number; overdue_tasks: number; failing_controls: number;
}
interface ComplianceControlsRow { total: number; compliant: number; failing_tests: number; stale: number }
interface EvidenceHealthRow { total: number; valid: number; stale: number }
interface GapRow { gaps_this_month: number }
interface AtRiskControlRow { control_id: string; title: string }
interface TeamRow {
  team_id: string; name: string; open_tasks: number; overdue: number; members: number;
}
interface StaleRow { stale: number }
interface OverdueRow { overdue: number }
interface FailingRow { failing: number }

export interface RiskPrediction {
  riskId: string;
  title: string;
  currentSeverity: string;
  predictedSeverity: string;
  breachProbability: number;    // 0-1
  timeToBreachDays: number;     // estimated days until breach
  factors: string[];            // contributing factors
  confidence: number;
}

export interface ComplianceForecast {
  currentScore: number;
  predictedScore30d: number;
  predictedScore90d: number;
  trend: 'improving' | 'stable' | 'declining';
  atRiskControls: { controlId: string; title: string; reason: string }[];
  evidenceGapRate: number;      // rate of new gaps per month
  auditReadinessDate: string;   // estimated date when audit-ready
}

export interface ResourceRecommendation {
  teamId: string;
  teamName: string;
  currentWorkload: number;
  recommendedCapacity: number;
  riskExposure: number;
  suggestion: string;
}

/**
 * Predict which risks are most likely to materialize.
 * Uses a weighted heuristic combining severity, overdue tasks, failing controls,
 * and review staleness to estimate breach probability.
 */
export async function predictRiskBreaches(tenantId: string): Promise<RiskPrediction[]> {
  const s = tenantSchema(tenantId);

  const risks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT r.risk_id, r.title, r.severity, r.status, r.likelihood, r.impact,
            r.created_at, r.updated_at,
            (SELECT COUNT(*) FROM "${s}".process_tasks pt WHERE pt.entity_id = r.risk_id AND pt.status = 'open')::int AS open_tasks,
            (SELECT COUNT(*) FROM "${s}".process_tasks pt WHERE pt.entity_id = r.risk_id AND pt.due_at < NOW())::int AS overdue_tasks,
            (SELECT COUNT(*) FROM "${s}".controls c WHERE c.risk_id = r.risk_id AND c.status != 'compliant')::int AS failing_controls
     FROM "${s}".risks r
     WHERE r.status NOT IN ('closed', 'archived')
     ORDER BY CASE r.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
     LIMIT 20`
  ), { tenantId: tenantId, operation: 'query process_tasks' });

  return (risks.rows as RiskRow[]).map(r => {
    // Weighted heuristic: combine multiple risk signals
    const severityScore: Record<string, number> = { critical: 0.9, high: 0.7, medium: 0.4, low: 0.2 };
    const baseSeverity = severityScore[r.severity as string] || 0.3;
    const taskPressure = r.overdue_tasks > 0 ? 0.3 : 0;
    const controlGap = r.failing_controls > 0 ? 0.2 : 0;
    const ageFactor = daysSince(r.updated_at) > 30 ? 0.15 : 0;

    const breachProbability = Math.min(0.99, baseSeverity + taskPressure + controlGap + ageFactor);
    const timeToBreachDays = Math.max(1, Math.round((1 - breachProbability) * 90));

    const factors: string[] = [];
    if (r.overdue_tasks > 0) factors.push(`${r.overdue_tasks} overdue remediation tasks`);
    if (r.failing_controls > 0) factors.push(`${r.failing_controls} non-compliant controls`);
    if (daysSince(r.updated_at) > 30) factors.push('Risk not reviewed in 30+ days');
    if (r.severity === 'critical') factors.push('Critical severity rating');
    if (factors.length === 0) factors.push('Standard monitoring');

    const predictedSeverity = breachProbability > 0.8 ? 'critical'
      : breachProbability > 0.6 ? 'high'
      : r.severity;

    return {
      riskId: r.risk_id,
      title: r.title,
      currentSeverity: r.severity,
      predictedSeverity,
      breachProbability: Math.round(breachProbability * 100) / 100,
      timeToBreachDays,
      factors,
      confidence: Math.min(0.95, 0.7 + (factors.length * 0.05)),
    };
  });
}

/**
 * Forecast compliance score trajectory based on control status,
 * evidence freshness, and recent gap events.
 */
export async function forecastCompliance(tenantId: string): Promise<ComplianceForecast> {
  const s = tenantSchema(tenantId);

  const [currentControls, evidenceHealth, recentGaps] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, compliant: 0, failing_tests: 0, stale: 0 }]), safeQuery(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
        COUNT(*) FILTER (WHERE test_status = 'failed')::int AS failing_tests,
        COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '60 days')::int AS stale
       FROM "${s}".controls`
    ), { tenantId: tenantId, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, valid: 0, stale: 0 }]), safeQuery(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'valid')::int AS valid,
        COUNT(*) FILTER (WHERE last_collected_at < NOW() - INTERVAL '30 days' OR last_collected_at IS NULL)::int AS stale
       FROM "${s}".evidence_tasks`
    ), { tenantId: tenantId, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ gaps_this_month: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS gaps_this_month
       FROM "${s}".agrc_event_log
       WHERE event_type ILIKE '%gap%' AND created_at > NOW() - INTERVAL '30 days'`
    ), { tenantId: tenantId, operation: 'query evidence_tasks' }),
  ]);

  const c = currentControls.rows[0] as ComplianceControlsRow;
  const _e = evidenceHealth.rows[0] as EvidenceHealthRow;
  const g = recentGaps.rows[0] as GapRow;

  const currentScore = c.total > 0 ? Math.round((c.compliant / c.total) * 100) : 0;

  // Project future score using stale-control ratio and gap velocity
  const staleRatio = c.total > 0 ? c.stale / c.total : 0;
  const evidenceGapRate = Number(g.gaps_this_month || 0);
  const monthlyDecline = (staleRatio * 5) + (evidenceGapRate * 0.5);

  const predictedScore30d = Math.max(0, Math.round(currentScore - monthlyDecline));
  const predictedScore90d = Math.max(0, Math.round(currentScore - (monthlyDecline * 3)));

  const trend: ComplianceForecast['trend'] =
    monthlyDecline <= 1 ? 'improving' : monthlyDecline <= 3 ? 'stable' : 'declining';

  // Identify controls most likely to fall out of compliance
  const atRiskResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT control_id, title FROM "${s}".controls
     WHERE (test_status = 'failed' OR status != 'compliant' OR updated_at < NOW() - INTERVAL '60 days')
     LIMIT 10`
  ), { tenantId: tenantId, operation: 'query controls' });

  const atRiskControls = (atRiskResult.rows as AtRiskControlRow[]).map(r => ({
    controlId: r.control_id,
    title: r.title || r.control_id,
    reason: 'Failing test or stale review',
  }));

  // Estimate days until audit-ready (target score >= 90)
  const targetScore = 90;
  const daysToReady = currentScore >= targetScore
    ? 0
    : Math.round(((targetScore - currentScore) / Math.max(1, monthlyDecline)) * 30);
  const auditReadinessDate = new Date(Date.now() + daysToReady * 86400000).toISOString().split('T')[0];

  return {
    currentScore,
    predictedScore30d,
    predictedScore90d,
    trend,
    atRiskControls,
    evidenceGapRate,
    auditReadinessDate,
  };
}

/**
 * Recommend resource allocation based on team workload and risk exposure.
 * Targets a sustainable workload of ~8 open tasks per team member.
 */
export async function recommendResources(tenantId: string): Promise<ResourceRecommendation[]> {
  const s = tenantSchema(tenantId);

  const teams = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT t.team_id, t.name,
            (SELECT COUNT(*) FROM "${s}".process_tasks pt WHERE pt.assigned_team = t.team_id AND pt.status IN ('open', 'in_progress'))::int AS open_tasks,
            (SELECT COUNT(*) FROM "${s}".process_tasks pt WHERE pt.assigned_team = t.team_id AND pt.due_at < NOW() AND pt.status != 'done')::int AS overdue,
            (SELECT COUNT(*) FROM "${s}".team_members tm WHERE tm.team_id = t.team_id AND tm.is_active = true)::int AS members
     FROM "${s}".teams t
     WHERE t.is_active = true
     LIMIT 20`
  ), { tenantId: tenantId, operation: 'query process_tasks' });

  return (teams.rows as TeamRow[]).map(t => {
    const workload = t.members > 0 ? Math.round(t.open_tasks / t.members) : t.open_tasks;
    const riskExposure = t.overdue > 0 ? Math.min(1, t.overdue / 5) : 0;
    const recommendedCapacity = Math.max(t.members, Math.ceil(t.open_tasks / 8));

    let suggestion = 'Workload balanced.';
    if (workload > 12) {
      suggestion = `Critical overload: ${workload} tasks/person. Add ${recommendedCapacity - t.members} team members.`;
    } else if (workload > 8) {
      suggestion = `High workload: ${workload} tasks/person. Consider redistributing or adding resources.`;
    } else if (t.overdue > 0) {
      suggestion = `${t.overdue} overdue tasks. Prioritize SLA compliance.`;
    }

    return {
      teamId: t.team_id,
      teamName: t.name,
      currentWorkload: workload,
      recommendedCapacity,
      riskExposure: Math.round(riskExposure * 100) / 100,
      suggestion,
    };
  });
}

/**
 * Detect early warning signals from metric trends.
 * Checks evidence freshness, task SLA compliance, and control effectiveness.
 */
export async function detectEarlyWarnings(tenantId: string): Promise<{
  warnings: { metric: string; signal: string; severity: string; recommendation: string }[];
}> {
  const s = tenantSchema(tenantId);
  const warnings: { metric: string; signal: string; severity: string; recommendation: string }[] = [];

  // Evidence freshness check
  const staleEvidence = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ stale: 0 }]), safeQuery(
    `SELECT COUNT(*)::int AS stale FROM "${s}".evidence_tasks
     WHERE last_collected_at < NOW() - INTERVAL '30 days' OR last_collected_at IS NULL`
  ), { tenantId: tenantId, operation: 'query evidence_tasks' });
  const staleCount = Number((staleEvidence.rows[0] as StaleRow)?.stale);
  if (staleCount > 10) {
    warnings.push({
      metric: 'Evidence Freshness',
      signal: `${staleCount} evidence items stale (>30 days)`,
      severity: 'high',
      recommendation: 'Initiate evidence collection campaign',
    });
  }

  // Task SLA compliance check
  const overdueTasks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ overdue: 0 }]), safeQuery(
    `SELECT COUNT(*)::int AS overdue FROM "${s}".process_tasks
     WHERE due_at < NOW() AND status IN ('open', 'in_progress')`
  ), { tenantId: tenantId, operation: 'query process_tasks' });
  const overdueCount = Number((overdueTasks.rows[0] as OverdueRow)?.overdue);
  if (overdueCount > 5) {
    warnings.push({
      metric: 'Task SLA',
      signal: `${overdueCount} tasks overdue`,
      severity: 'medium',
      recommendation: 'Review task assignments and SLA configuration',
    });
  }

  // Control effectiveness check
  const failingControls = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ failing: 0 }]), safeQuery(
    `SELECT COUNT(*)::int AS failing FROM "${s}".controls WHERE test_status = 'failed'`
  ), { tenantId: tenantId, operation: 'query controls' });
  const failingCount = Number((failingControls.rows[0] as FailingRow)?.failing);
  if (failingCount > 5) {
    warnings.push({
      metric: 'Control Effectiveness',
      signal: `${failingCount} controls failing tests`,
      severity: 'high',
      recommendation: 'Investigate root causes of control failures',
    });
  }

  return { warnings };
}

/** Calculate days elapsed since a given date. */
function daysSince(date: string | Date): number {
  return Math.round((Date.now() - new Date(date).getTime()) / 86400000);
}
