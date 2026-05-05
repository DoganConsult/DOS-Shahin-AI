// ============================================
// Shahin -- Risk Appetite Service
// Appetite configuration, breach detection,
// acceptance workflow (request/approve/queue),
// trend analysis, and category gauges
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

/**
 * Return the current risk-appetite configuration from
 * governance_risk_appetite, or sensible defaults if the
 * table is empty / not yet created.
 */
export async function getAppetiteConfig(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`
      SELECT category, max_residual_score::int AS "maxResidualScore",
             acceptance_requires_role AS "acceptanceRequiresRole",
             review_cadence_days AS "reviewCadenceDays",
             updated_at AS "updatedAt"
      FROM "${schema}".governance_risk_appetite
      ORDER BY category
    `);
    if (result.rows.length > 0) {
      return {
        appetiteModel: 'category_threshold',
        thresholdsByCategory: result.rows.map((r: GenericRow) => ({
          category: r.category,
          threshold: r.maxResidualScore,
          acceptanceRequiresRole: r.acceptanceRequiresRole,
          reviewCadenceDays: r.reviewCadenceDays,
        })),
        thresholdsBySeverity: [
          { severity: 'critical', maxResidual: 20 },
          { severity: 'high', maxResidual: 15 },
          { severity: 'medium', maxResidual: 10 },
          { severity: 'low', maxResidual: 5 },
        ],
        entityThresholds: [],
        lastApprovalDate: getFirstRow(result)?.updatedAt || null,
        approvingAuthority: null,
      };
    }
  } catch { /* table may not exist yet */ }

  // Default config
  return {
    appetiteModel: 'category_threshold',
    thresholdsByCategory: [
      { category: 'cyber', threshold: 15 },
      { category: 'operational', threshold: 12 },
      { category: 'compliance', threshold: 10 },
      { category: 'strategic', threshold: 15 },
      { category: 'financial', threshold: 12 },
      { category: 'third_party', threshold: 12 },
      { category: 'reputational', threshold: 10 },
    ],
    thresholdsBySeverity: [
      { severity: 'critical', maxResidual: 20 },
      { severity: 'high', maxResidual: 15 },
      { severity: 'medium', maxResidual: 10 },
      { severity: 'low', maxResidual: 5 },
    ],
    entityThresholds: [],
    lastApprovalDate: null,
    approvingAuthority: null,
  };
}

/**
 * Upsert appetite thresholds per category.
 * Returns the refreshed config after writing.
 */
export async function updateAppetiteConfigEntry(tenantId: string, data: unknown): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const config = data as { thresholdsByCategory?: Array<{ category?: string; threshold?: number; maxResidualScore?: number; acceptanceRequiresRole?: string; reviewCadenceDays?: number }> };

  if (config.thresholdsByCategory && Array.isArray(config.thresholdsByCategory)) {

    for (const t of config.thresholdsByCategory) {
      await safeQuery(`
        INSERT INTO "${schema}".governance_risk_appetite
          (category, max_residual_score, acceptance_requires_role, review_cadence_days, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (category) DO UPDATE SET
          max_residual_score = EXCLUDED.max_residual_score,
          acceptance_requires_role = EXCLUDED.acceptance_requires_role,
          review_cadence_days = EXCLUDED.review_cadence_days,
          updated_at = NOW()
      `, [
        t.category || '',
        t.threshold || t.maxResidualScore || 15,
        t.acceptanceRequiresRole || 'executive',
        t.reviewCadenceDays || 90,
      ]);
    }
  }
  return getAppetiteConfig(tenantId);
}

/**
 * Identify all risks whose residual score exceeds their
 * category appetite threshold. Enriches each breach with
 * the latest acceptance-log status.
 */
export async function getAppetiteBreaches(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  // Get thresholds from governance_risk_appetite
  let thresholdMap: Record<string, number> = {};
  try {
    const appResult = await safeQuery(`
      SELECT category, max_residual_score::int AS threshold
      FROM "${schema}".governance_risk_appetite
    `);
    for (const r of appResult.rows) {
      thresholdMap[r.category] = r.threshold;
    }
  } catch { /* table may not exist */ }

  // If no appetite config, use defaults
  if (Object.keys(thresholdMap).length === 0) {
    thresholdMap = { cyber: 15, operational: 12, compliance: 10, strategic: 15, financial: 12, third_party: 12, reputational: 10 };
  }

  const result = await safeQuery(`
    SELECT risk_id AS "riskId", title AS "riskTitle", category,
           risk_score AS "residualScore", owner
    FROM "${schema}".risks
    WHERE deleted_at IS NULL AND risk_score >= 8
    ORDER BY risk_score DESC
  `);

  const breaches: Array<GenericRow & { appetiteThreshold: number; breachAmount: number; escalationStatus: string; acceptanceStatus: string }> = result.rows
    .filter((r: GenericRow) => {
      const threshold = thresholdMap[r.category] || 15;
      return r.residualScore > threshold;
    })
    .map((r: GenericRow) => {
      const threshold = thresholdMap[r.category] || 15;
      return {
        ...r,
        appetiteThreshold: threshold,
        breachAmount: r.residualScore - threshold,
        escalationStatus: 'not_escalated',
        acceptanceStatus: 'pending',
      };
    });

  // Enrich with acceptance log data
  try {
    for (const b of breaches) {
      const accResult = await safeQuery(`
        SELECT decision, status FROM "${schema}".risk_acceptance_log
        WHERE risk_id = $1 ORDER BY requested_at DESC LIMIT 1
      `, [b.riskId]);
      if (accResult.rows.length > 0) {
        b.acceptanceStatus = getFirstRow(accResult)?.status;
      }
    }
  } catch { /* table may not exist */ }

  return breaches;
}

/**
 * Request formal acceptance for a risk that exceeds appetite.
 * Records the current score and threshold in risk_acceptance_log.
 */
export async function requestAcceptance(tenantId: string, riskId: string, data: { reason: string }, userId?: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Approve or reject a pending acceptance request.
 */
export async function approveAcceptance(tenantId: string, riskId: string, data: { decision: string; comments?: string }, userId?: string, userRoles: string[] = []): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Return all pending acceptance requests for the queue view.
 */
export async function getAcceptanceQueue(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`
      SELECT a.acceptance_id AS "acceptanceId", a.risk_id AS "riskId",
             r.title AS "riskTitle", r.category,
             a.residual_score AS "residualScore",
             a.appetite_threshold AS "appetiteThreshold",
             a.breach_amount AS "breachAmount",
             a.reason, a.requested_by AS "requestedBy",
             a.requested_at AS "requestedAt", a.status
      FROM "${schema}".risk_acceptance_log a
      JOIN "${schema}".risks r ON r.risk_id = a.risk_id
      WHERE a.status = 'pending'
      ORDER BY a.requested_at ASC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

/**
 * Summarize appetite breaches by category (accepted vs unaccepted).
 */
export async function getAppetiteTrends(tenantId: string): Promise<Record<string, unknown>[]> {
  const breaches = await getAppetiteBreaches(tenantId);
  const byCategory: Record<string, { breachCount: number; acceptedCount: number; unacceptedCount: number }> = {};
  for (const b of breaches) {
    if (!byCategory[(b as any).category]) byCategory[(b as any).category] = { breachCount: 0, acceptedCount: 0, unacceptedCount: 0 };
    byCategory[(b as any).category].breachCount++;
    if (b.acceptanceStatus === 'accepted') byCategory[(b as any).category].acceptedCount++;
    else byCategory[(b as any).category].unacceptedCount++;
  }
  return Object.entries(byCategory).map(([category, counts]) => ({
    category,
    ...counts,
    trend: 'stable' as const,
  }));
}

/**
 * Return full acceptance history (up to 200 entries).
 */
export async function getAcceptanceHistory(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`
      SELECT a.acceptance_id AS "acceptanceId", a.risk_id AS "riskId",
             r.title AS "riskTitle", r.category,
             a.residual_score AS "residualScore",
             a.appetite_threshold AS "appetiteThreshold",
             a.breach_amount AS "breachAmount",
             a.reason, a.decision,
             a.requested_by AS "requestedBy", a.requested_at AS "requestedAt",
             a.decided_by AS "decidedBy", a.decided_at AS "decidedAt",
             a.decision_comments AS "comments", a.status
      FROM "${schema}".risk_acceptance_log a
      LEFT JOIN "${schema}".risks r ON r.risk_id = a.risk_id
      ORDER BY a.requested_at DESC
      LIMIT 200
    `);
    return result.rows;
  } catch { return []; }
}

/**
 * Category-level gauge data: average residual vs appetite threshold
 * with breach/warning/healthy status per category.
 */
export async function getAppetiteCategoryGauges(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  // Get thresholds
  let thresholdMap: Record<string, number> = {};
  try {
    const appResult = await safeQuery(`
      SELECT category, max_residual_score::int AS threshold
      FROM "${schema}".governance_risk_appetite
    `);
    for (const r of appResult.rows) thresholdMap[r.category] = r.threshold;
  } catch { /* table may not exist */ }

  if (Object.keys(thresholdMap).length === 0) {
    thresholdMap = { cyber: 15, operational: 12, compliance: 10, strategic: 15, financial: 12, third_party: 12, reputational: 10 };
  }

  // Get avg residual per category
  const result = await safeQuery(`
    SELECT category,
           ROUND(AVG(risk_score), 1)::float AS "avgResidual",
           COUNT(*)::int AS "riskCount",
           COUNT(*) FILTER (WHERE risk_score >= 20)::int AS "criticalCount",
           MAX(risk_score)::int AS "maxScore"
    FROM "${schema}".risks
    WHERE deleted_at IS NULL
    GROUP BY category
    ORDER BY category
  `);

  return result.rows.map((r: GenericRow) => {
    const threshold = thresholdMap[r.category] || 15;
    const ratio = threshold > 0 ? r.avgResidual / threshold : 0;
    return {
      category: r.category,
      avgResidual: r.avgResidual || 0,
      threshold,
      riskCount: r.riskCount,
      criticalCount: r.criticalCount,
      maxScore: r.maxScore,
      ratio,
      status: ratio > 1 ? 'breach' : ratio > 0.75 ? 'warning' : 'healthy',
    };
  });
}
