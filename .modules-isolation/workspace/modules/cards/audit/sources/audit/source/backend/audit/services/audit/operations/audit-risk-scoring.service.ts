// ============================================
// Shahin — Audit Risk Scoring Service
// Risk scores per audit universe entity
// Table: audit_risk_scores
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

// ── Get all scores for a universe entity ────────────────────────────

export async function getScoresForEntity(tenantId: string, universeId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_risk_scores
     WHERE universe_id = $1
     ORDER BY created_at DESC`,
    [universeId]
  );
  return result.rows;
}

// ── Upsert a risk score ─────────────────────────────────────────────

export async function upsertScore(
  tenantId: string,
  universeId: string,
  riskFactor: string,
  score: number,
  weight: number,
  assessedBy: string
) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_risk_scores
       (id, universe_id, risk_factor, score, weight, assessed_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (universe_id, risk_factor)
     DO UPDATE SET score = $4, weight = $5, assessed_by = $6, updated_at = NOW()
     RETURNING *`,
    [id, universeId, riskFactor, score, weight, assessedBy]
  );
  return getFirstRow(result);
}

// ── Compute weighted average score for a universe entity ────────────

export async function computeWeightedScore(tenantId: string, universeId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       CASE WHEN SUM(weight) > 0
            THEN ROUND((SUM(score * weight) / SUM(weight))::numeric, 2)
            ELSE 0
       END AS weighted_score,
       COUNT(*)::int AS factor_count,
       SUM(weight)::numeric AS total_weight
     FROM "${s}".audit_risk_scores
     WHERE universe_id = $1`,
    [universeId]
  );
  return getFirstRow(result);
}

// ── Ranked list enriched with risk register data ────────────────────

export async function getRankedListWithRiskRegister(tenantId: string) {
  const s = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`
      SELECT
        u.id, u.entity_name, u.entity_type, u.risk_rating,
        u.last_audited_at, u.audit_frequency_months,
        COALESCE(rs.weighted_score, 0)            AS weighted_score,
        COALESCE(rs.inherent_risk, 0)              AS inherent_risk,
        COALESCE(rs.control_effectiveness, 0)      AS control_effectiveness,
        COALESCE(rs.materiality, 0)                AS materiality,
        (SELECT COUNT(*)::int FROM "${s}".risks r
         WHERE r.deleted_at IS NULL
           AND r.status = 'open')                  AS open_risks_count,
        (SELECT AVG(r.likelihood * r.impact)::numeric(5,2)
         FROM "${s}".risks r
         WHERE r.deleted_at IS NULL)               AS avg_risk_score
      FROM "${s}".audit_universe u
      LEFT JOIN (
        SELECT universe_id,
          AVG(score * weight)::numeric(5,2)                                      AS weighted_score,
          MAX(CASE WHEN risk_factor = 'inherent_risk'          THEN score END)   AS inherent_risk,
          MAX(CASE WHEN risk_factor = 'control_effectiveness'  THEN score END)   AS control_effectiveness,
          MAX(CASE WHEN risk_factor = 'materiality'            THEN score END)   AS materiality
        FROM "${s}".audit_risk_scores
        GROUP BY universe_id
      ) rs ON rs.universe_id = u.id
      WHERE u.deleted_at IS NULL
      ORDER BY COALESCE(rs.weighted_score, 0) DESC
    `);
    return { ranked_list: result.rows };
  } catch (err: unknown) {
    // Graceful fallback when underlying tables do not exist yet
    return { ranked_list: [], error: toErrorMessage(err) };
  }
}

// ── Risk-ranked list of all universe entities ───────────────────────

export async function getRiskRankedList(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       au.id AS universe_id,
       au.name,
       au.entity_type,
       au.department,
       au.risk_rating,
       COALESCE(
         CASE WHEN SUM(ars.weight) > 0
              THEN ROUND((SUM(ars.score * ars.weight) / SUM(ars.weight))::numeric, 2)
              ELSE 0
         END,
         0
       ) AS weighted_score,
       COUNT(ars.id)::int AS factor_count
     FROM "${s}".audit_universe au
     LEFT JOIN "${s}".audit_risk_scores ars ON ars.universe_id = au.id
     WHERE au.deleted_at IS NULL
     GROUP BY au.id, au.name, au.entity_type, au.department, au.risk_rating
     ORDER BY weighted_score DESC`
  );
  return result.rows;
}
