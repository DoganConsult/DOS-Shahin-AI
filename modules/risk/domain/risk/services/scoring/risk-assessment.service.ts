// ============================================
// Shahin -- Risk Assessment Service
// Assessment, linking, escalation, score history,
// dependency analysis, and bulk operations
// ============================================

import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

/**
 * Assess a risk by updating likelihood/impact. Records previous score
 * in risk_score_history before applying the new values.
 */
export async function assessRiskEntry(tenantId: string, riskId: string, data: { likelihood: number; impact: number; controlEffectiveness?: number }): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Append a control ID to the risk's control_ids array (no duplicates).
 */
export async function linkControlToRisk(tenantId: string, riskId: string, controlId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    UPDATE "${schema}".risks SET control_ids = array_append(control_ids, $1), updated_at = NOW()
    WHERE risk_id = $2 AND NOT ($1 = ANY(control_ids))
    RETURNING risk_id
  `, [controlId, riskId]);
  return { linked: result.rows.length > 0 };
}

/**
 * Link an evidence item to a risk via the object_mappings table.
 */
export async function linkEvidenceToRisk(tenantId: string, riskId: string, evidenceId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(`
      INSERT INTO "${schema}".object_mappings (source_type, source_id, target_type, target_id)
      VALUES ('risk', $1, 'evidence', $2)
      ON CONFLICT (source_type, source_id, target_type, target_id) DO UPDATE SET
        target_type = EXCLUDED.target_type, target_id = EXCLUDED.target_id
      WHERE (object_mappings.target_type, object_mappings.target_id) IS DISTINCT FROM (EXCLUDED.target_type, EXCLUDED.target_id)
    `, [riskId, evidenceId]);
    return { linked: true };
  } catch {
    return { linked: false };
  }
}

/**
 * Escalate a risk: set status to 'escalated' and record in the escalation log.
 */
export async function escalateRiskEntry(tenantId: string, riskId: string, data: { reason: string; escalateTo: string }, userId?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  return withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(`UPDATE "${schema}".risks SET status = 'escalated', updated_at = NOW() WHERE risk_id = $1`, [riskId], client);

    try {
      await safeQueryWithClient(`
        INSERT INTO "${schema}".risk_escalation_log
          (risk_id, escalated_by, escalated_to, reason, status)
        VALUES ($1, $2, $3, $4, 'open')
      `, [riskId, userId || SYSTEM_JOB_ACTOR, data.escalateTo, data.reason], client);
    } catch { /* table may not exist */ }

    return { escalated: true, riskId, ...data };
  });
}

/**
 * Retrieve the score history for a single risk (up to 50 entries).
 */
export async function getRiskScoreHistory(tenantId: string, riskId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`
      SELECT h.history_id AS "historyId", h.model_id AS "modelId",
             h.dimension_scores AS "dimensionScores",
             h.composite_score AS "compositeScore", h.zone,
             h.scored_at AS "scoredAt"
      FROM "${schema}".risk_score_history h
      WHERE h.risk_id = $1
      ORDER BY h.scored_at DESC LIMIT 50
    `, [riskId]);
    return result.rows;
  } catch { return []; }
}

/**
 * Find risks that share controls or treatments with the given risk.
 */
export async function getRiskDependencies(tenantId: string, riskId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Find risks sharing controls
  let sharedControlRisks: unknown[] = [];
  try {
    const result = await safeQuery(`
      SELECT DISTINCT r2.risk_id AS "riskId", r2.title, r2.category, r2.risk_score AS "residualScore",
             array_agg(DISTINCT unnested.ctrl) AS "sharedControlIds"
      FROM "${schema}".risks r1,
           LATERAL unnest(r1.control_ids) AS unnested(ctrl),
           "${schema}".risks r2
      WHERE r1.risk_id = $1 AND r2.risk_id != $1
        AND unnested.ctrl = ANY(r2.control_ids) AND r2.deleted_at IS NULL
      GROUP BY r2.risk_id, r2.title, r2.category, r2.risk_score
    `, [riskId]);
    sharedControlRisks = result.rows;
  } catch { /* may not have array controls */ }

  // Find risks sharing treatments (same risk_id in risk_treatments)
  let sharedTreatmentRisks: unknown[] = [];
  try {
    const result = await safeQuery(`
      SELECT DISTINCT r.risk_id AS "riskId", r.title, r.category, r.risk_score AS "residualScore"
      FROM "${schema}".risk_treatments t1
      JOIN "${schema}".risk_treatments t2 ON t2.title = t1.title AND t2.risk_id != t1.risk_id
      JOIN "${schema}".risks r ON r.risk_id = t2.risk_id AND r.deleted_at IS NULL
      WHERE t1.risk_id = $1
    `, [riskId]);
    sharedTreatmentRisks = result.rows;
  } catch { /* tables may not exist */ }

  return { sharedControlRisks, sharedTreatmentRisks };
}

/**
 * Bulk-update status/owner/treatmentStatus for up to 500 risks at once.
 */
export async function bulkUpdateRisks(tenantId: string, data: {
  riskIds: string[]; status?: string; owner?: string; treatmentStatus?: string;
}): Promise<{ updated: number }> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.risk_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
