// ============================================
// Shahin-Ai — Governance Health Scoring Engine
// 8 dimensions, weighted average, tenant-configurable thresholds
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { readGovernanceContext } from '../../../../ai/services/copilot/context-reader.service.js';
import type { GenericRow as _GenericRow } from '@dos/types';

interface DimensionScore {
  dimension: string;
  score: number;
  grade: string;
  weight: number;
  details: Record<string, number>;
}

interface HealthResult {
  score_id: string;
  overall_score: number;
  overall_grade: string;
  dimensions: DimensionScore[];
  computed_at: string;
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  policy_health: 1.5,
  accountability: 1.2,
  committee_effectiveness: 1.0,
  decision_execution: 1.0,
  exception_exposure: 1.3,
  action_timeliness: 1.0,
  mandate_validity: 0.8,
  review_discipline: 0.8,
};

function gradeScore(score: number, greenMin = 80, yellowMin = 60): string {
  if (score >= greenMin) return "green";
  if (score >= yellowMin) return "yellow";
  return "red";
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

// === DIMENSION COMPUTATIONS ===

async function computePolicyHealth(schema: string): Promise<DimensionScore> {
  const totalPolicies = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND status NOT IN ('draft','archived')`);
  const total = totalPolicies.rows[0]?.c || 0;
  if (total === 0) return { dimension: "policy_health", score: 100, grade: "green", weight: DEFAULT_WEIGHTS.policy_health, details: { total: 0 } };

  const reviewed = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND next_review_date >= CURRENT_DATE AND status NOT IN ('draft','archived')`);
  const reviewedRatio = (reviewed.rows[0]?.c || 0) / total;

  // Ack completion
  const ackTotal = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_policy_acknowledgements WHERE 1=1`);
  const ackDone = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_policy_acknowledgements WHERE acknowledged_at IS NOT NULL`);
  const ackCompletion = (ackTotal.rows[0]?.c || 0) > 0 ? (ackDone.rows[0]?.c || 0) / ackTotal.rows[0].c : 1;

  const score = clamp(((reviewedRatio + ackCompletion) / 2) * 100);
  return { dimension: "policy_health", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.policy_health, details: { total, reviewed_ratio: Math.round(reviewedRatio * 100), ack_completion: Math.round(ackCompletion * 100) } };
}

async function computeAccountability(schema: string): Promise<DimensionScore> {
  // Policies without owner
  const noOwner = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND (owner IS NULL OR owner = '') AND status NOT IN ('draft','archived')`);
  const totalPolicies = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND status NOT IN ('draft','archived')`);
  const total = totalPolicies.rows[0]?.c || 0;
  const unowned = noOwner.rows[0]?.c || 0;
  const ownedRatio = total > 0 ? (total - unowned) / total : 1;

  const score = clamp(ownedRatio * 100);
  return { dimension: "accountability", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.accountability, details: { total_objects: total, unowned } };
}

async function computeCommitteeEffectiveness(schema: string): Promise<DimensionScore> {
  // Meetings with minutes
  const totalMeetings = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_meetings WHERE deleted_at IS NULL AND status = 'completed' AND scheduled_at >= NOW() - INTERVAL '90 days'`);
  const withMinutes = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_meetings WHERE deleted_at IS NULL AND status = 'completed' AND minutes IS NOT NULL AND minutes != '' AND scheduled_at >= NOW() - INTERVAL '90 days'`);
  const total = totalMeetings.rows[0]?.c || 0;
  const minutesRate = total > 0 ? (withMinutes.rows[0]?.c || 0) / total : 1;

  const score = clamp(minutesRate * 100);
  return { dimension: "committee_effectiveness", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.committee_effectiveness, details: { total_meetings: total, with_minutes: withMinutes.rows[0]?.c || 0, minutes_rate: Math.round(minutesRate * 100) } };
}

async function computeDecisionExecution(schema: string): Promise<DimensionScore> {
  const totalDecisions = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_decisions WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '90 days'`);
  const total = totalDecisions.rows[0]?.c || 0;
  if (total === 0) return { dimension: "decision_execution", score: 100, grade: "green", weight: DEFAULT_WEIGHTS.decision_execution, details: { total: 0 } };

  const withOwner = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_decisions WHERE deleted_at IS NULL AND assigned_to IS NOT NULL AND created_at >= NOW() - INTERVAL '90 days'`);
  const implRate = (withOwner.rows[0]?.c || 0) / total;

  const score = clamp(implRate * 100);
  return { dimension: "decision_execution", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.decision_execution, details: { total, with_owner: withOwner.rows[0]?.c || 0 } };
}

async function computeExceptionExposure(schema: string): Promise<DimensionScore> {
  const totalExceptions = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".exceptions WHERE deleted_at IS NULL`);
  const total = totalExceptions.rows[0]?.c || 0;
  if (total === 0) return { dimension: "exception_exposure", score: 100, grade: "green", weight: DEFAULT_WEIGHTS.exception_exposure, details: { total: 0 } };

  const highRiskOpen = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".exceptions WHERE deleted_at IS NULL AND risk_level IN ('high','critical') AND status NOT IN ('expired','closed','rejected')`);
  const expiredUnresolved = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".exceptions WHERE deleted_at IS NULL AND expiry_date < CURRENT_DATE AND status NOT IN ('expired','closed','rejected')`);

  const highRiskRatio = (highRiskOpen.rows[0]?.c || 0) / total;
  const expiredRatio = (expiredUnresolved.rows[0]?.c || 0) / total;

  const score = clamp(100 - (highRiskRatio * 40 + expiredRatio * 40) * 100 / 100);
  return { dimension: "exception_exposure", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.exception_exposure, details: { total, high_risk_open: highRiskOpen.rows[0]?.c || 0, expired_unresolved: expiredUnresolved.rows[0]?.c || 0 } };
}

async function computeActionTimeliness(schema: string): Promise<DimensionScore> {
  const totalOpen = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND status NOT IN ('completed','closed','cancelled','verified')`);
  const total = totalOpen.rows[0]?.c || 0;
  if (total === 0) return { dimension: "action_timeliness", score: 100, grade: "green", weight: DEFAULT_WEIGHTS.action_timeliness, details: { total: 0 } };

  const overdue = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed','closed','cancelled','verified')`);
  const overdueRatio = (overdue.rows[0]?.c || 0) / total;

  const score = clamp(100 - overdueRatio * 100);
  return { dimension: "action_timeliness", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.action_timeliness, details: { total_open: total, overdue: overdue.rows[0]?.c || 0 } };
}

async function computeMandateValidity(schema: string): Promise<DimensionScore> {
  const totalMandates = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_mandates WHERE deleted_at IS NULL`);
  const total = totalMandates.rows[0]?.c || 0;
  if (total === 0) return { dimension: "mandate_validity", score: 100, grade: "green", weight: DEFAULT_WEIGHTS.mandate_validity, details: { total: 0 } };

  const expired = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_mandates WHERE deleted_at IS NULL AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE AND status NOT IN ('expired','archived')`);
  const withOwner = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".governance_mandates WHERE deleted_at IS NULL AND owner_id IS NOT NULL`);

  const expiredRatio = (expired.rows[0]?.c || 0) / total;
  const ownerRatio = (withOwner.rows[0]?.c || 0) / total;

  const score = clamp(((1 - expiredRatio + ownerRatio) / 2) * 100);
  return { dimension: "mandate_validity", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.mandate_validity, details: { total, expired: expired.rows[0]?.c || 0, with_owner: withOwner.rows[0]?.c || 0 } };
}

async function computeReviewDiscipline(schema: string): Promise<DimensionScore> {
  // Policies overdue for review
  const overdue = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND next_review_date < CURRENT_DATE AND status NOT IN ('draft','archived')`);
  const totalDue = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND status NOT IN ('draft','archived')`);
  const total = totalDue.rows[0]?.c || 0;
  if (total === 0) return { dimension: "review_discipline", score: 100, grade: "green", weight: DEFAULT_WEIGHTS.review_discipline, details: { total: 0 } };

  const onTimeRatio = total > 0 ? (total - (overdue.rows[0]?.c || 0)) / total : 1;
  const score = clamp(onTimeRatio * 100);
  return { dimension: "review_discipline", score, grade: gradeScore(score), weight: DEFAULT_WEIGHTS.review_discipline, details: { total_due: total, overdue: overdue.rows[0]?.c || 0 } };
}

// === MAIN COMPUTATION ===

export async function computeGovernanceHealth(tenantId: string): Promise<HealthResult> {
  const schema = tenantSchema(tenantId);

  const dimensionFns = [
    computePolicyHealth, computeAccountability, computeCommitteeEffectiveness,
    computeDecisionExecution, computeExceptionExposure, computeActionTimeliness,
    computeMandateValidity, computeReviewDiscipline,
  ];

  const dimensions: DimensionScore[] = [];
  for (const fn of dimensionFns) {
    try {
      dimensions.push(await fn(schema));
    } catch {
      // Non-fatal — table may not exist
    }
  }

  const govCtx = await readGovernanceContext(tenantId);
  if (govCtx) {
    const COMPLEXITY_WEIGHT_BOOST: Record<string, Record<string, number>> = {
      enterprise: { accountability: 0.4, committee_effectiveness: 0.3, exception_exposure: 0.2 },
      standard: { accountability: 0.2, review_discipline: 0.2 },
      lite: { policy_health: 0.2 },
    };
    const boosts = COMPLEXITY_WEIGHT_BOOST[govCtx.complexity] ?? {};
    for (const d of dimensions) {
      if (boosts[d.dimension]) d.weight += boosts[d.dimension];
    }
  }

  try {
    const thresholds = await safeQuery(
      `SELECT dimension, green_min, yellow_min, weight FROM "${schema}".governance_health_thresholds WHERE tenant_id = $1`,
      [tenantId]
    );
    for (const t of thresholds.rows) {
      const dim = dimensions.find(d => d.dimension === t.dimension);
      if (dim) {
        dim.weight = parseFloat(t.weight) || dim.weight;
        dim.grade = gradeScore(dim.score, parseFloat(t.green_min), parseFloat(t.yellow_min));
      }
    }
  } catch { /* thresholds table might not exist yet */ }

  // Weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  for (const d of dimensions) {
    weightedSum += d.score * d.weight;
    totalWeight += d.weight;
  }
  const overall = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  const overallGrade = gradeScore(overall);

  // Persist
  const scoreId = uuid();
  try {
    await safeQuery(
      `INSERT INTO "${schema}".governance_health_scores
         (score_id, tenant_id, overall_score, overall_grade, dimension_scores, dimension_details, computed_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'api')`,
      [scoreId, tenantId, overall, overallGrade,
       JSON.stringify(dimensions.reduce((acc: any, d) => { acc[d.dimension] = d.score; return acc; }, {})),
       JSON.stringify(dimensions.reduce((acc: any, d) => { acc[d.dimension] = d.details; return acc; }, {}))]
    );
  } catch { /* best-effort storage */ }

  // Emit health score event when grade is red or any dimension needs board attention
  try {
    const redDimensions = dimensions.filter(d => d.grade === 'red');
    if (overallGrade === 'red' || redDimensions.length > 0) {
      await eventBus.publish(({
              eventType: 'governance.health_score_changed',
              tenantId,
              sourceService: 'governance-health',
              entityType: 'health_score',
              entityId: scoreId,
              severity: overallGrade === 'red' ? 'critical' : 'warning',
              payload: { overall_score: overall, overall_grade: overallGrade, red_dimensions: redDimensions.map(d => d.dimension) },
            } as any));
    }
    // Emit board attention for each red dimension
    for (const d of redDimensions) {
      await eventBus.publish(({
              eventType: 'governance.board_attention_item',
              tenantId,
              sourceService: 'governance-health',
              entityType: 'health_dimension',
              entityId: scoreId,
              severity: 'critical',
              payload: { dimension: d.dimension, score: d.score, grade: d.grade },
            } as any));
    }
  } catch { /* best-effort event emission */ }

  return { score_id: scoreId, overall_score: overall, overall_grade: overallGrade, dimensions, computed_at: new Date().toISOString() };
}

export async function getLatestHealthScore(tenantId: string): Promise<HealthResult | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id = $1 ORDER BY computed_at DESC LIMIT 1`,
    [tenantId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    score_id: row.score_id,
    overall_score: parseFloat(row.overall_score),
    overall_grade: row.overall_grade,
    dimensions: Object.entries(row.dimension_scores || {}).map(([key, score]) => ({
      dimension: key,
      score: score as number,
      grade: gradeScore(score as number),
      weight: DEFAULT_WEIGHTS[key] || 1,
      details: (row.dimension_details || {})[key] || {},
    })),
    computed_at: row.computed_at,
  };
}

export async function getHealthHistory(tenantId: string, days = 30): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT score_id, overall_score, overall_grade, dimension_scores, computed_at
     FROM "${schema}".governance_health_scores
     WHERE tenant_id = $1 AND computed_at >= NOW() - ($2 || ' days')::interval
     ORDER BY computed_at DESC LIMIT 100`,
    [tenantId, days]
  );
  return result.rows;
}

export async function getHealthThresholds(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_health_thresholds WHERE tenant_id = $1`,
    [tenantId]
  );
  return result.rows;
}

export async function updateHealthThresholds(tenantId: string, thresholds: Array<{
  dimension: string; green_min?: number; yellow_min?: number; weight?: number;
}>): Promise<void> {
  const schema = tenantSchema(tenantId);
  for (const t of thresholds) {
    await safeQuery(
      `INSERT INTO "${schema}".governance_health_thresholds (tenant_id, dimension, green_min, yellow_min, weight)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, dimension) DO UPDATE SET
         green_min = COALESCE($3, governance_health_thresholds.green_min),
         yellow_min = COALESCE($4, governance_health_thresholds.yellow_min),
         weight = COALESCE($5, governance_health_thresholds.weight)`,
      [tenantId, t.dimension, t.green_min ?? 80, t.yellow_min ?? 60, t.weight ?? 1.0]
    );
  }
}

export async function getBoardWatchlist(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const items: unknown[] = [];

  // Red-scoring dimensions from latest health score
  const latest = await getLatestHealthScore(tenantId);
  if (latest) {
    for (const d of latest.dimensions) {
      if (d.grade === "red") {
        items.push({ type: "health_dimension", dimension: d.dimension, score: d.score, grade: d.grade, details: d.details });
      }
    }
  }

  // Board attention items
  try {
    const attention = await safeQuery(
      `SELECT action_item_id, title, status, due_date FROM "${schema}".governance_action_items
       WHERE deleted_at IS NULL AND board_attention = TRUE AND status NOT IN ('completed','closed','cancelled','verified')
       ORDER BY due_date LIMIT 20`
    );
    for (const r of attention.rows) {
      items.push({ type: "board_attention_action", ...r });
    }
  } catch { /* table may lack column */ }

  return items;
}
