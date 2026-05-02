// Auto-extracted Risk repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class RiskAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT risk_id FROM "${schema}".risks
     WHERE status IN ('open', 'mitigating', 'active')
       AND deleted_at IS NULL
     ORDER BY risk_id`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks
       SET risk_score = $2,
           residual_risk_score = $2,
           last_scored_at = NOW(),
           scoring_method = $3
       WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT c.effectiveness_score, c.compliance_status
       FROM "${schema}".controls c
       JOIN "${schema}".risk_control_mappings rcm ON rcm.control_id = c.control_id
       WHERE rcm.risk_id = $1 AND c.deleted_at IS NULL AND c.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, COALESCE(risk_score, 0) AS current_score, impact, likelihood
     FROM "${schema}".risks
     WHERE risk_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT rf.factor_id, rf.risk_id, rf.factor_name, rf.factor_type,
              rf.raw_value, rf.weight, rf.source, rf.updated_at
       FROM "${schema}".risk_factors rf
       WHERE rf.risk_id = $1 AND rf.deleted_at IS NULL
       ORDER BY rf.factor_type, rf.factor_name`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT
         d.date::date::text AS date,
         COUNT(r.risk_id) FILTER (WHERE r.created_at::date = d.date::date)::int AS new_risks,
         COUNT(r.risk_id) FILTER (
           WHERE r.status = 'closed'
             AND r.updated_at::date = d.date::date
         )::int AS closed_risks
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       LEFT JOIN "${schema}".risks r
         ON (r.created_at::date = d.date::date
             OR (r.status = 'closed' AND r.updated_at::date = d.date::date))
       GROUP BY d.date
       ORDER BY d.date ASC`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')::int AS open_critical,
         COUNT(*) FILTER (WHERE severity = 'high' AND status NOT IN ('mitigated', 'closed'))::int AS unmitigated_high
       FROM "${schema}".risks`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
         COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE severity = 'low')::int AS low,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'mitigated')::int AS mitigated,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM "${schema}".risks`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".risk_assessments WHERE status = 'overdue' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".risks WHERE status = 'critical' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".risks WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'risk' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'risk','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET status = $1, updated_at = NOW() WHERE risk_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `
      SELECT r.risk_id AS "riskId", r.title, r.category,
             r.likelihood AS "inherentLikelihood", r.impact AS "inherentImpact",
             (r.likelihood * r.impact) AS "inherentScore",
             r.risk_score AS "residualScore",
             r.control_ids
      FROM "${schema}".risks r
      WHERE r.deleted_at IS NULL
      ORDER BY r.risk_score DESC
    `;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE risk_score >= 20)::int AS critical,
      COUNT(*) FILTER (WHERE risk_score >= 15)::int AS high,
      COUNT(*) FILTER (WHERE risk_score >= 8)::int AS medium,
      COUNT(*) FILTER (WHERE risk_score < 8)::int AS low
    FROM "${schema}".risks WHERE deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `
    SELECT likelihood, impact, COUNT(*)::int AS count,
           ARRAY_AGG(risk_id) AS "riskIds",
           ARRAY_AGG(json_build_object(
             'riskId', risk_id, 'title', title, 'status', status, 'owner', owner
           )) AS risks
    FROM "${schema}".risks
    WHERE deleted_at IS NULL
    GROUP BY likelihood, impact
    ORDER BY likelihood, impact
  `;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT likelihood, impact, risk_id, title, status
     FROM "${schema}".risks`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT likelihood, impact, COUNT(*)::int as count
     FROM "${schema}".risks
     GROUP BY likelihood, impact`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT
       DATE(created_at) AS date,
       AVG(risk_score)::float AS avg_score,
       COUNT(*)::int AS count
     FROM "${schema}".risks
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY DATE(created_at)
     ORDER BY date ASC`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, risk_score, likelihood, impact, status, owner, created_at
     FROM "${schema}".risks
     ORDER BY risk_score DESC, created_at DESC
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(AVG(risk_score), 0)::float AS avg_score,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE risk_score >= 20)::int AS critical,
       COUNT(*) FILTER (WHERE risk_score >= 12 AND risk_score < 20)::int AS high,
       COUNT(*) FILTER (WHERE risk_score >= 6  AND risk_score < 12)::int AS medium,
       COUNT(*) FILTER (WHERE risk_score < 6)::int AS low
     FROM "${schema}".risks`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `
    SELECT r.risk_id, r.title, r.category, r.owner,
           COALESCE(r.risk_score, r.likelihood * r.impact, 0) as score,
           ac.appetite_level, ac.threshold_high, ac.threshold_critical
    FROM "${schema}".risks r
    LEFT JOIN "${schema}".risk_appetite_config ac ON ac.risk_category = r.category AND ac.is_active = true
    WHERE r.deleted_at IS NULL
      AND COALESCE(r.risk_score, r.likelihood * r.impact, 0) > COALESCE(ac.threshold_high, 15)
    ORDER BY score DESC
  `;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `
    SELECT s.scenario_id, s.scenario_name, s.baseline_score, s.scenario_score,
           s.mc_mean_loss, s.mc_p95_loss, r.title as risk_title, r.category
    FROM "${schema}".risk_scenarios s
    JOIN "${schema}".risks r ON r.risk_id = s.risk_id
    ORDER BY s.mc_p95_loss DESC NULLS LAST
  `;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COALESCE(r.category, 'unclassified') as business_segment,
      COUNT(*) as total_risks,
      COUNT(*) FILTER (WHERE COALESCE(r.risk_score, r.likelihood * r.impact, 0) >= 20) as critical,
      COUNT(*) FILTER (WHERE COALESCE(r.risk_score, r.likelihood * r.impact, 0) BETWEEN 12 AND 19) as high,
      COUNT(*) FILTER (WHERE r.treatment_status IN ('untreated', 'in_progress')) as open_treatments,
      AVG(COALESCE(r.risk_score, r.likelihood * r.impact, 0))::numeric(5,2) as avg_score
    FROM "${schema}".risks r
    WHERE r.deleted_at IS NULL
    GROUP BY business_segment
    ORDER BY avg_score DESC
  `;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `
    SELECT r.risk_id, r.title, r.category, r.owner,
           COALESCE(r.risk_score, r.likelihood * r.impact, 0) as inherent_score,
           r.treatment_status, r.status,
           (SELECT COUNT(*) FROM "${schema}".control_risk_mappings crm WHERE crm.risk_id = r.risk_id) as control_count
    FROM "${schema}".risks r
    WHERE r.deleted_at IS NULL AND r.status = 'active'
    ORDER BY inherent_score DESC
    LIMIT 25
  `;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as new_risks
      FROM "${schema}".risks WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `
      SELECT category, COUNT(*) as count
      FROM "${schema}".risks WHERE deleted_at IS NULL
      GROUP BY category ORDER BY count DESC
    `;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `
      SELECT risk_id, title, category, COALESCE(risk_score, likelihood * impact, 0) as score, treatment_status, owner
      FROM "${schema}".risks WHERE deleted_at IS NULL AND status = 'active'
      ORDER BY score DESC LIMIT 10
    `;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `
      SELECT
        COUNT(*) as total_risks,
        COUNT(*) FILTER (WHERE COALESCE(risk_score, likelihood * impact, 0) >= 20) as critical_risks,
        COUNT(*) FILTER (WHERE COALESCE(risk_score, likelihood * impact, 0) BETWEEN 12 AND 19) as high_risks,
        COUNT(*) FILTER (WHERE status = 'active') as active_risks,
        COUNT(*) FILTER (WHERE treatment_status = 'untreated') as untreated_risks
      FROM "${schema}".risks WHERE deleted_at IS NULL
    `;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT DATE(created_at) as date, AVG(risk_score)::float as avg_score, COUNT(*)::int as count
     FROM "${schema}".risks
     WHERE created_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risks SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      statement = COALESCE($3, statement),
      category = COALESCE($4, category),
      likelihood = COALESCE($5, likelihood),
      impact = COALESCE($6, impact),
      owner = COALESCE($7, owner),
      owner_user_id = COALESCE($8, owner_user_id),
      status = COALESCE($9, status),
      treatment_status = COALESCE($10, treatment_status),
      cause_text = COALESCE($11, cause_text),
      event_text = COALESCE($12, event_text),
      impact_text = COALESCE($13, impact_text),
      business_unit_id = COALESCE($14::uuid, business_unit_id),
      trend_direction = COALESCE($15, trend_direction),
      appetite_status = COALESCE($16, appetite_status),
      inherent_likelihood = COALESCE($17, inherent_likelihood),
      inherent_impact = COALESCE($18, inherent_impact),
      inherent_score = COALESCE($19, inherent_score),
      residual_likelihood = COALESCE($20, residual_likelihood),
      residual_impact = COALESCE($21, residual_impact),
      residual_score = COALESCE($22, residual_score),
      next_review_date = COALESCE($23, next_review_date),
      updated_at = NOW()
    WHERE risk_id = $24
    RETURNING risk_id AS "riskId", risk_code AS "riskCode", title, description, statement,
              category, owner, owner_user_id AS "ownerUserId", status,
              likelihood, impact, risk_score AS "riskScore",
              inherent_likelihood AS "inherentLikelihood", inherent_impact AS "inherentImpact",
              inherent_score AS "inherentScore",
              residual_likelihood AS "residualLikelihood", residual_impact AS "residualImpact",
              residual_score AS "residualScore",
              treatment_status AS "treatmentStatus",
              trend_direction AS "trendDirection", appetite_status AS "appetiteStatus",
              business_unit_id AS "businessUnitId",
              next_review_date AS "nextReviewDate",
              cause_text AS "causeText", event_text AS "eventText", impact_text AS "impactText",
              updated_at AS "updatedAt"
  `;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".risks
      (risk_id, risk_code, title, description, statement,
       category, likelihood, impact, owner, owner_user_id, status,
       treatment_status, control_ids,
       cause_text, event_text, impact_text,
       business_unit_id, trend_direction, appetite_status,
       inherent_likelihood, inherent_impact, inherent_score,
       next_review_date, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23, NOW())
    RETURNING risk_id AS "riskId", risk_code AS "riskCode", title, description, statement,
              category, owner, owner_user_id AS "ownerUserId", status,
              likelihood, impact, risk_score AS "riskScore",
              inherent_likelihood AS "inherentLikelihood", inherent_impact AS "inherentImpact",
              inherent_score AS "inherentScore",
              treatment_status AS "treatmentStatus",
              trend_direction AS "trendDirection", appetite_status AS "appetiteStatus",
              business_unit_id AS "businessUnitId",
              next_review_date AS "nextReviewDate",
              created_at AS "createdAt"
  `;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `
      SELECT COUNT(*)::int AS cnt FROM "${schema}".risks r
      WHERE r.risk_score >= 12 AND NOT EXISTS (
        SELECT 1 FROM "${schema}".risk_treatments rt WHERE rt.risk_id = r.risk_id
      )
    `;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".risk_acceptance_log WHERE status = 'pending'`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".risk_escalation_log WHERE status = 'open'`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `
    SELECT risk_id AS "riskId", title, category, owner, status,
           likelihood, impact, risk_score AS "inherentScore",
           risk_score AS "residualScore", treatment_status AS "treatmentStatus"
    FROM "${schema}".risks
    ORDER BY risk_score DESC LIMIT 10
  `;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `
    SELECT
      CASE
        WHEN risk_score >= 20 THEN 'critical'
        WHEN risk_score >= 15 THEN 'high'
        WHEN risk_score >= 8 THEN 'medium'
        ELSE 'low'
      END AS severity,
      COUNT(*)::int AS count
    FROM "${schema}".risks GROUP BY 1 ORDER BY count DESC
  `;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `
    SELECT category, COUNT(*)::int AS count
    FROM "${schema}".risks GROUP BY category ORDER BY count DESC
  `;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `
      SELECT COUNT(DISTINCT risk_id)::int AS cnt FROM "${schema}".risk_review_log
      WHERE review_date > NOW() - INTERVAL '90 days'
    `;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `
      SELECT COUNT(*)::int AS cnt FROM "${schema}".governance_risk_appetite ga
      JOIN "${schema}".risks r ON r.category = ga.category
      WHERE r.risk_score > ga.max_residual_score
    `;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `
      SELECT COUNT(*)::int AS cnt FROM "${schema}".risk_treatments
      WHERE target_date < NOW() AND status NOT IN ('done','validated','completed')
    `;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*)::int AS "totalRisks",
      COUNT(*) FILTER (WHERE r.risk_score >= 15)::int AS "highRisks",
      COUNT(*) FILTER (WHERE r.risk_score >= 20)::int AS "criticalRisks",
      COUNT(*) FILTER (WHERE COALESCE(r.owner,'') = '')::int AS "risksWithoutOwner",
      ROUND(AVG(CASE WHEN r.risk_score > 0 THEN r.risk_score ELSE NULL END),1)::float AS "residualRiskTrend"
    FROM "${schema}".risks r
    WHERE r.deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `
      SELECT acceptance_id AS "acceptanceId", reason, decision,
             requested_by AS "requestedBy", requested_at AS "requestedAt",
             decided_by AS "decidedBy", decided_at AS "decidedAt",
             decision_comments AS "comments"
      FROM "${schema}".risk_acceptance_log
      WHERE risk_id = $1 ORDER BY requested_at DESC
    `;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `
      SELECT review_id AS "reviewId", reviewer, review_date AS date,
             outcome, previous_score AS "previousScore",
             new_score AS "newScore", notes
      FROM "${schema}".risk_review_log
      WHERE risk_id = $1 ORDER BY review_date DESC
    `;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `
      SELECT escalation_id AS "escalationId", escalated_by AS "escalatedBy",
             escalated_to AS "escalatedTo", reason, status,
             escalated_at AS "escalatedAt", resolution_notes AS "resolutionNotes"
      FROM "${schema}".risk_escalation_log
      WHERE risk_id = $1 ORDER BY escalated_at DESC
    `;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `
      SELECT treatment_id AS "treatmentId", title, status, owner,
             strategy, target_date AS "targetDate",
             expected_reduction AS "expectedReduction",
             actual_reduction AS "actualReduction",
             created_at AS "createdAt",
             CASE WHEN target_date < NOW() AND status NOT IN ('done','validated','completed') THEN true ELSE false END AS overdue
      FROM "${schema}".risk_treatments
      WHERE risk_id = $1
      ORDER BY created_at DESC
    `;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `
      SELECT om.target_id AS "evidenceId",
             COALESCE(e.title, om.target_id) AS title,
             'evidence' AS type, 'linked' AS status
      FROM "${schema}".object_mappings om
      LEFT JOIN "${schema}".evidence e ON e.evidence_id = om.target_id
      WHERE om.source_type = 'risk' AND om.source_id = $1 AND om.target_type = 'evidence'
      LIMIT 20
    `;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `
        SELECT e.evidence_id AS "evidenceId", e.title, 'evidence' AS type, 'collected' AS status
        FROM "${schema}".evidence e
        WHERE e.control_id = ANY($1)
        LIMIT 20
      `;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `
        SELECT control_id AS "controlId", title, status,
               COALESCE(effectiveness, 0) AS effectiveness
        FROM "${schema}".controls WHERE control_id = ANY($1)
      `;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `
    SELECT r.risk_id AS "riskId", r.title, r.description, r.category, r.owner, r.status,
           r.likelihood, r.impact,
           (r.likelihood * r.impact) AS "inherentScore",
           r.risk_score AS "residualScore",
           r.treatment_status AS "treatmentStatus", r.treatment_plan AS "treatmentPlan",
           r.control_ids, r.kri_config,
           r.owner_team_id AS "ownerTeamId",
           t.name AS "ownerTeamName",
           t.team_code AS "ownerTeamCode",
           r.org_unit_id AS "orgUnitId",
           d.name AS "departmentName",
           bu.name AS "businessUnitName",
           ou.full_name AS "ownerFullName",
           ou.email AS "ownerEmail",
           r.created_at AS "createdAt", r.updated_at AS "updatedAt"
    FROM "${schema}".risks r
    LEFT JOIN "${schema}".teams t ON t.team_id = r.owner_team_id
    LEFT JOIN "${schema}".departments d ON d.id = r.org_unit_id
    LEFT JOIN "${schema}".business_units bu ON bu.id = d.business_unit_id
    LEFT JOIN "${schema}".users ou ON ou.user_id = r.owner_user_id
    WHERE r.risk_id = $1 AND r.deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `
        SELECT control_id, COALESCE(effectiveness, 0)::int AS eff
        FROM "${schema}".controls WHERE control_id = ANY($1)
      `;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `
    SELECT r.risk_id AS "riskId", r.risk_code AS "riskCode", r.title, r.description, r.statement,
           r.category, r.owner, r.owner_user_id AS "ownerUserId", r.status,
           r.likelihood, r.impact,
           COALESCE(r.inherent_score, r.likelihood * r.impact) AS "inherentScore",
           COALESCE(r.residual_score, r.risk_score) AS "residualScore",
           r.inherent_likelihood AS "inherentLikelihood", r.inherent_impact AS "inherentImpact",
           r.residual_likelihood AS "residualLikelihood", r.residual_impact AS "residualImpact",
           r.control_ids,
           r.treatment_status AS "treatmentStatus",
           r.trend_direction AS "trendDirection",
           r.appetite_status AS "appetiteStatus",
           r.business_unit_id AS "businessUnitId",
           r.next_review_date AS "nextReviewDate",
           r.cause_text AS "causeText", r.event_text AS "eventText", r.impact_text AS "impactText",
           r.owner_team_id AS "ownerTeamId",
           t.name AS "ownerTeamName",
           t.team_code AS "ownerTeamCode",
           r.created_at AS "createdAt", r.updated_at AS "updatedAt"
    FROM "${schema}".risks r
    LEFT JOIN "${schema}".teams t ON t.team_id = r.owner_team_id
    WHERE r.deleted_at IS NULL
    ORDER BY r.updated_at DESC
    LIMIT 50 OFFSET 0
  `;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".risks r WHERE r.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS n
       FROM "${schema}".risks r
       JOIN "${schema}".risk_appetite a ON r.category = a.category
       WHERE r.source_type = 'vendor' AND r.deleted_at IS NULL AND r.status != 'closed'
         AND r.risk_score > a.max_acceptable_score`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(SUM(risk_score), 0)::int AS total
     FROM "${schema}".risks WHERE deleted_at IS NULL AND status != 'closed'`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT r.risk_id, r.title, r.risk_score, r.likelihood, r.impact,
            r.source_id AS vendor_id, r.status, r.treatment_status,
            v.name AS vendor_name, v.risk_rating AS vendor_tier
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = r.source_id
     WHERE r.source_type = 'vendor' AND r.deleted_at IS NULL AND r.status != 'closed'
     ORDER BY r.risk_score DESC`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET kri_config = $1, updated_at = NOW() WHERE risk_id = $2 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT kri_config FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, kri_config, likelihood, impact, risk_score, treatment_status
     FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE risk_score >= 20)::int as critical,
            COUNT(*) FILTER (WHERE risk_score >= 12 AND risk_score < 20)::int as high,
            COUNT(*) FILTER (WHERE risk_score >= 6 AND risk_score < 12)::int as medium,
            COUNT(*) FILTER (WHERE risk_score < 6)::int as low,
            COUNT(*) FILTER (WHERE treatment_status = 'treated')::int as treated,
            COUNT(*) FILTER (WHERE treatment_status = 'untreated')::int as untreated
     FROM "${schema}".risks
     WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT likelihood, impact, COUNT(*)::int as count,
            ARRAY_AGG(json_build_object('risk_id', risk_id, 'title', title, 'status', status)) as risks
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     GROUP BY likelihood, impact
     ORDER BY likelihood, impact`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE risk_id = ANY($1::text[]) AND deleted_at IS NULL
     RETURNING risk_id`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE risk_id = $1 AND deleted_at IS NULL
     RETURNING risk_id`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risks WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT $1 OFFSET $2`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".risks WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      likelihood = COALESCE($4, likelihood),
      impact = COALESCE($5, impact),
      status = COALESCE($6, status),
      owner = COALESCE($7, owner),
      treatment_plan = COALESCE($8, treatment_plan),
      treatment_status = COALESCE($9, treatment_status),
      control_ids = COALESCE($10, control_ids),
      kri_config = COALESCE($11, kri_config),
      risk_category = COALESCE($12, risk_category),
      entity_links = COALESCE($13, entity_links),
      updated_at = NOW()
     WHERE risk_id = $14 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risks
          (risk_id, title, description, category, likelihood, impact, owner, treatment_plan, treatment_status, control_ids, owner_user_id, created_by, org_unit_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12)
         RETURNING *`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risks
          (risk_id, title, description, category, likelihood, impact, owner, treatment_plan, treatment_status, control_ids, owner_user_id, created_by, org_unit_id, risk_category, entity_links)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14)
         RETURNING *`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT CASE WHEN likelihood*impact>=15 THEN 'Critical' WHEN likelihood*impact>=9 THEN 'High' WHEN likelihood*impact>=4 THEN 'Medium' ELSE 'Low' END AS severity, COUNT(*) AS cnt FROM "${schema}".risks GROUP BY 1 ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT category, COUNT(*) AS cnt FROM "${schema}".risks GROUP BY category ORDER BY cnt DESC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed, ROUND(AVG(likelihood * impact),2) AS avg_score FROM "${schema}".risks`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".risks WHERE next_review_date < NOW() AND status = 'open'`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".risks WHERE owner IS NULL`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".risks WHERE status = 'open' AND likelihood * impact >= 12`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT r.title, r.category, r.likelihood, r.impact, r.status, r.owner,
            COUNT(rc.id) AS control_count
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".risk_controls rc ON rc.risk_id = r.id
     WHERE r.id = $1 GROUP BY r.id, r.title, r.category, r.likelihood, r.impact, r.status, r.owner`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT category, likelihood, impact FROM "${schema}".risks WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT r.title, r.description, r.category, r.likelihood, r.impact, r.status, r.owner,
            r.created_at, r.updated_at
     FROM "${schema}".risks r WHERE r.id = $1`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*) FILTER (WHERE status != 'completed') as open_issues,
      COUNT(*) FILTER (WHERE status = 'completed') as closed_issues,
      COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status != 'completed') as overdue_issues,
      COUNT(*) FILTER (WHERE escalation_level > 0) as escalated_issues
    FROM "${schema}".process_tasks
    WHERE entity_type = 'risk'
  `;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".process_tasks
    SET status = 'completed', completed_at = NOW(), completed_by = $1
    WHERE task_id = $2 AND entity_type = 'risk'
    RETURNING entity_id as risk_id
  `;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `
    SELECT pt.*, r.title as risk_title
    FROM "${schema}".process_tasks pt
    LEFT JOIN "${schema}".risks r ON r.risk_id = pt.entity_id
    WHERE pt.entity_type = 'risk'
    ORDER BY pt.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".process_tasks (
      title, description, entity_type, entity_id, priority, status,
      assigned_to, created_by, sla_deadline
    ) VALUES ($1, $2, 'risk', $3, $4, 'open', $5, $6, $7)
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".risk_asset_links WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".risk_vendor_links WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".incident_risk_links WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".risk_compliance_links WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".risk_evidence_links WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".risk_policy_links WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count FROM "${schema}".control_risk_mappings WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".incident_risk_links (risk_id, incident_id, link_type, impact_on_risk, linked_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (incident_id, risk_id) DO UPDATE SET
      link_type = EXCLUDED.link_type, impact_on_risk = EXCLUDED.impact_on_risk, updated_at = NOW()
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `
    SELECT irl.*, i.title AS incident_title, i.severity AS incident_severity,
           i.status AS incident_status, i.reported_at
    FROM "${schema}".incident_risk_links irl
    LEFT JOIN "${schema}".incidents i ON i.incident_id = irl.incident_id
    WHERE irl.risk_id = $1
    ORDER BY irl.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".risk_evidence_links WHERE link_id = $1`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".risk_evidence_links (risk_id, evidence_id, link_type, notes, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (risk_id, evidence_id) DO UPDATE SET
      link_type = EXCLUDED.link_type, notes = EXCLUDED.notes
    RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `
    SELECT l.*, e.title AS "evidenceTitle"
    FROM "${schema}".risk_evidence_links l
    LEFT JOIN "${schema}".evidence e ON e.evidence_id = l.evidence_id
    WHERE l.risk_id = $1
    ORDER BY l.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_taxonomy WHERE is_default = true AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_taxonomy WHERE deleted_at IS NULL ORDER BY is_default DESC, version DESC`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_velocity_scales ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_likelihood_scales ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_impact_scales ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risk_categories SET deleted_at = NOW() WHERE category_id = $1`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risk_categories SET updated_at = NOW() WHERE category_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_categories (code, name_en, name_ar, description, parent_category_id, display_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_categories WHERE deleted_at IS NULL ORDER BY display_order, code`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".kri_tracking
         (risk_id, kri_name, kri_name_ar, kri_description, unit, threshold_value, threshold_direction)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT kt.kri_id, kt.kri_name, kt.risk_id, kt.threshold_value, kt.threshold_direction,
            kt.current_value, kt.breach_count, kv.value AS breach_value, kv.recorded_at AS breach_at
     FROM "${schema}".kri_tracking kt
     JOIN "${schema}".kri_values kv ON kv.kri_id = kt.kri_id AND kv.exceeded = TRUE
     WHERE kt.enabled = TRUE
     ORDER BY kv.recorded_at DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `SELECT value_id, kri_id, risk_id, value, exceeded, recorded_at
     FROM "${schema}".kri_values WHERE kri_id = $1
     ORDER BY recorded_at DESC LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".kri_tracking
     SET last_value = current_value, current_value = $1, last_recorded_at = NOW(),
         breach_count = breach_count + CASE WHEN $2 THEN 1 ELSE 0 END,
         updated_at = NOW()
     WHERE kri_id = $3`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".kri_values (kri_id, tenant_id, risk_id, value, exceeded, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT kri_id, kri_name, threshold_value, threshold_direction, current_value
     FROM "${schema}".kri_tracking WHERE kri_id = $1 AND enabled = TRUE`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_indicator_templates WHERE is_active = true ORDER BY name`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_scoring_models ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_appetite_config WHERE is_active = true ORDER BY appetite_level`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_velocity_scales ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_likelihood_scales ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_impact_scales ORDER BY level`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_categories WHERE deleted_at IS NULL ORDER BY display_order`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `
      SELECT k.kri_id AS "kriId", k.name AS "kriName", k.linked_category AS "category",
             k.current_value AS "currentValue", k.status,
             COUNT(r.risk_id)::int AS "linkedRiskCount",
             ROUND(AVG(r.risk_score), 1)::float AS "avgRiskScore"
      FROM "${schema}".risk_kris k
      LEFT JOIN "${schema}".risks r ON r.category = k.linked_category AND r.deleted_at IS NULL
      GROUP BY k.kri_id, k.name, k.linked_category, k.current_value, k.status
      ORDER BY k.linked_category, k.name
    `;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `
      SELECT dp.data_point_id AS "dataPointId", dp.value, dp.collected_at AS "collectedAt",
             dp.collected_by AS "collectedBy"
      FROM "${schema}".kri_data_points dp
      WHERE dp.kri_id = $1
      ORDER BY dp.collected_at DESC LIMIT 30
    `;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `
      SELECT risk_id AS "entityId", 'risk' AS "entityType", title AS name, owner,
             updated_at AS "lastReview"
      FROM "${schema}".risks WHERE deleted_at IS NULL ORDER BY updated_at ASC LIMIT 50
    `;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `
      SELECT r.risk_id AS "entityId", 'risk' AS "entityType", r.title AS name, r.owner,
             rl.review_date AS "lastReview", rl.next_review_date AS "nextReview"
      FROM "${schema}".risks r
      LEFT JOIN LATERAL (
        SELECT review_date, next_review_date
        FROM "${schema}".risk_review_log
        WHERE risk_id = r.risk_id ORDER BY review_date DESC LIMIT 1
      ) rl ON true
      WHERE r.deleted_at IS NULL
      ORDER BY rl.review_date ASC NULLS FIRST
      LIMIT 50
    `;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `
      SELECT b.breach_id AS "breachId", b.kri_id AS "kriId",
             k.name AS "kriName",
             b.breached_at AS "breachDate", b.breach_value AS value,
             b.threshold_value AS threshold,
             b.linked_risk_id AS "linkedRiskId", b.owner,
             b.action_taken AS "actionTaken", b.status
      FROM "${schema}".kri_breach_log b
      LEFT JOIN "${schema}".risk_kris k ON k.kri_id = b.kri_id
      ORDER BY b.breached_at DESC
      LIMIT $1 OFFSET $2
    `;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".kri_breach_log`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `
      SELECT k.kri_id AS "kriId", k.name,
             k.threshold_red AS "thresholdRed", k.threshold_amber AS "thresholdAmber",
             k.threshold_green AS "thresholdGreen",
             COALESCE(
               (SELECT json_agg(json_build_object('date', dp.collected_at, 'value', dp.value) ORDER BY dp.collected_at)
                FROM "${schema}".kri_data_points dp WHERE dp.kri_id = k.kri_id),
               '[]'::json
             ) AS "dataPoints"
      FROM "${schema}".risk_kris k
      WHERE 1=1
    `;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risk_kris SET
      name = COALESCE($1, name),
      current_value = COALESCE($2, current_value),
      owner = COALESCE($3, owner),
      last_collected_at = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE last_collected_at END,
      updated_at = NOW(),
      status = COALESCE($5, status)
    WHERE kri_id = $4
    RETURNING kri_id AS "kriId", name, status, current_value AS "currentValue"
  `;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `
            INSERT INTO "${schema}".kri_breach_log
              (kri_id, breach_value, threshold_breached, threshold_value, linked_risk_id)
            SELECT $1, $2, 'red', threshold_red, linked_risk_id
            FROM "${schema}".risk_kris WHERE kri_id = $1
          `;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `
      SELECT threshold_red, threshold_amber FROM "${schema}".risk_kris WHERE kri_id = $1
    `;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `
        INSERT INTO "${schema}".kri_data_points (kri_id, value, collected_by)
        VALUES ($1, $2, $3)
      `;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".risk_kris
      (name, description, linked_risk_id, linked_category, owner,
       threshold_red, threshold_amber, threshold_green,
       current_value, status, collection_frequency)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING kri_id AS "kriId", name, status, current_value AS "currentValue"
  `;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `
      SELECT k.kri_id AS "kriId", k.name, k.description,
             k.linked_risk_id AS "linkedRiskId", k.linked_category AS "linkedCategory",
             k.owner, k.current_value AS "currentValue",
             k.threshold_red AS "thresholdRed", k.threshold_amber AS "thresholdAmber",
             k.threshold_green AS "thresholdGreen",
             k.status, k.trend, k.collection_frequency AS "collectionFrequency",
             k.last_collected_at AS "lastUpdated",
             r.title AS "linkedRiskTitle"
      FROM "${schema}".risk_kris k
      LEFT JOIN "${schema}".risks r ON r.risk_id = k.linked_risk_id
      WHERE 1=1
      ORDER BY k.status DESC, k.current_value DESC
      LIMIT 100 OFFSET 0
    `;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".risk_kris k`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, annual_expected_loss, currency, confidence
     FROM "${schema}".fair_financial_exposures
     WHERE tenant_id = $1
     ORDER BY annual_expected_loss DESC`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, description, category, likelihood, impact, owner
     FROM "${schema}".risks
     WHERE tenant_id = $1 AND risk_id = $2`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".fair_financial_exposures
     WHERE tenant_id = $1 AND risk_id = $2
     ORDER BY computed_at DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".fair_financial_exposures
       (tenant_id, risk_id, annual_expected_loss, lef_data, lm_data, currency, confidence, category_breakdown, ai_enhanced, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tenant_id, risk_id)
     DO UPDATE SET
       annual_expected_loss = EXCLUDED.annual_expected_loss,
       lef_data = EXCLUDED.lef_data,
       lm_data = EXCLUDED.lm_data,
       currency = EXCLUDED.currency,
       confidence = EXCLUDED.confidence,
       category_breakdown = EXCLUDED.category_breakdown,
       ai_enhanced = EXCLUDED.ai_enhanced,
       computed_at = EXCLUDED.computed_at,
       updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `CREATE TABLE IF NOT EXISTS "${schema}".fair_financial_exposures (
      exposure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      risk_id UUID NOT NULL,
      annual_expected_loss NUMERIC(15,2) NOT NULL,
      lef_data JSONB NOT NULL,
      lm_data JSONB NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
      confidence NUMERIC(3,2) NOT NULL,
      category_breakdown JSONB NOT NULL,
      ai_enhanced BOOLEAN NOT NULL DEFAULT false,
      computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, risk_id)
    )`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `SELECT
       TO_CHAR(COALESCE(event_date, created_at::date), 'YYYY-MM') as month,
       COUNT(*)::int as count,
       COALESCE(SUM(loss_amount), 0)::numeric as total
     FROM "${schema}".loss_events
     WHERE COALESCE(event_date, created_at::date) >= CURRENT_DATE - INTERVAL '12 months'
     GROUP BY TO_CHAR(COALESCE(event_date, created_at::date), 'YYYY-MM')
     ORDER BY month`;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(loss_category, 'Uncategorized') as category,
       COUNT(*)::int as count,
       COALESCE(SUM(loss_amount), 0)::numeric as total
     FROM "${schema}".loss_events
     GROUP BY COALESCE(loss_category, 'Uncategorized')
     ORDER BY total DESC`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int as total_losses,
       COALESCE(SUM(loss_amount), 0)::numeric as total_amount,
       COALESCE(AVG(loss_amount), 0)::numeric as avg_amount,
       COALESCE(MAX(loss_amount), 0)::numeric as max_amount,
       COALESCE(SUM(recovery_amount), 0)::numeric as total_recovery
     FROM "${schema}".loss_events`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".loss_events
     WHERE 1=1
     ORDER BY event_date DESC NULLS LAST, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".loss_events
      (risk_id, title, description, loss_amount, currency, loss_category,
       event_date, root_cause, business_unit, recovery_amount, insurance_claimed, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".emerging_risks
      (title, description, category, horizon, velocity, confidence_level,
       potential_impact, monitoring_owner, status, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".emerging_risks
     WHERE category = 'emerging' OR status = 'monitoring'
     ORDER BY first_identified_at DESC`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, category, owner, control_ids
     FROM "${schema}".risks
     ORDER BY risk_id`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_appetite_versions
     ORDER BY version_number DESC`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_appetite_versions
      (version_number, appetite_data, approved_by, approved_at, effective_from, status, notes)
     VALUES ($1, $2, $3, NOW(), $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
     FROM "${schema}".risk_appetite_versions`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(category, 'Unassigned') as group_name,
       COUNT(*)::int as risk_count,
       ROUND(AVG(likelihood * impact)::numeric, 2) as avg_inherent_score,
       ROUND(AVG(COALESCE(risk_score, likelihood * impact))::numeric, 2) as avg_residual_score,
       MAX(likelihood * impact)::numeric as max_severity,
       SUM(likelihood * impact)::numeric as total_exposure
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     GROUP BY COALESCE(category, 'Unassigned')
     ORDER BY total_exposure DESC`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    const query = `SELECT score FROM "${schema}".kri_history
     WHERE kri_id = $1 AND tenant_id = $2
     ORDER BY recorded_at DESC LIMIT 90`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    const query = `SELECT score, recorded_at FROM "${schema}".kri_history
       WHERE kri_id = $1 AND tenant_id = $2
       ORDER BY recorded_at DESC LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, score FROM "${schema}".risk_register ORDER BY score DESC`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    const query = `SELECT kri_id, score, recorded_at FROM "${schema}".kri_history
     WHERE tenant_id = $1
     ORDER BY recorded_at DESC`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    const query = `SELECT score, recorded_at FROM "${schema}".kri_history
     WHERE kri_id = $1 AND tenant_id = $2
     ORDER BY recorded_at DESC
     LIMIT 90`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    const query = `SELECT score, recorded_at FROM "${schema}".kri_history
     WHERE kri_id = $1 AND tenant_id = $2
     ORDER BY recorded_at ASC`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".mitigating_control_mappings
     (consequence_id, control_id, control_title, effectiveness, notes)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".preventive_control_mappings
     (threat_id, control_id, control_title, effectiveness, notes)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_consequences
     (consequence_id, risk_id, name, description, consequence_type, impact, financial_estimate)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_threats
     (threat_id, risk_id, name, description, threat_category, likelihood, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_fair_assessments
     (assessment_id, risk_id, tef_min, tef_likely, tef_max,
      vulnerability_pct, plm_min, plm_likely, plm_max,
      slm_min, slm_likely, slm_max,
      annualised_loss_expectancy, risk_percentile_90, risk_percentile_99,
      confidence_interval, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,'completed')
     ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_scenarios WHERE risk_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    const query = `SELECT title FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_scenarios
     (risk_id, scenario_name, baseline_score, scenario_score, assumptions, mc_mean_loss, mc_p95_loss)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    const query = `SELECT likelihood, impact FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(c.effectiveness_score, 0.5) as eff
     FROM "${schema}".controls c
     JOIN "${schema}".risk_control_mappings rcm ON rcm.control_id = c.control_id
     WHERE rcm.risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    const query = `SELECT likelihood, impact,
            COALESCE(financial_impact_low, impact::numeric * 10000) as fin_low,
            COALESCE(financial_impact_high, impact::numeric * 100000) as fin_high
     FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    const query = `SELECT likelihood, impact, risk_score FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risks SET updated_at = NOW()
    WHERE risk_id = ANY($1) AND deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    const query = `
      SELECT DISTINCT r.risk_id AS "riskId", r.title, r.category, r.risk_score AS "residualScore"
      FROM "${schema}".risk_treatments t1
      JOIN "${schema}".risk_treatments t2 ON t2.title = t1.title AND t2.risk_id != t1.risk_id
      JOIN "${schema}".risks r ON r.risk_id = t2.risk_id AND r.deleted_at IS NULL
      WHERE t1.risk_id = $1
    `;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    const query = `
      SELECT DISTINCT r2.risk_id AS "riskId", r2.title, r2.category, r2.risk_score AS "residualScore",
             array_agg(DISTINCT unnested.ctrl) AS "sharedControlIds"
      FROM "${schema}".risks r1,
           LATERAL unnest(r1.control_ids) AS unnested(ctrl),
           "${schema}".risks r2
      WHERE r1.risk_id = $1 AND r2.risk_id != $1
        AND unnested.ctrl = ANY(r2.control_ids) AND r2.deleted_at IS NULL
      GROUP BY r2.risk_id, r2.title, r2.category, r2.risk_score
    `;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    const query = `
      SELECT h.history_id AS "historyId", h.model_id AS "modelId",
             h.dimension_scores AS "dimensionScores",
             h.composite_score AS "compositeScore", h.zone,
             h.scored_at AS "scoredAt"
      FROM "${schema}".risk_score_history h
      WHERE h.risk_id = $1
      ORDER BY h.scored_at DESC LIMIT 50
    `;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    const query = `
      INSERT INTO "${schema}".object_mappings (source_type, source_id, target_type, target_id)
      VALUES ('risk', $1, 'evidence', $2)
      ON CONFLICT (source_type, source_id, target_type, target_id) DO UPDATE SET
        target_type = EXCLUDED.target_type, target_id = EXCLUDED.target_id
      WHERE (object_mappings.target_type, object_mappings.target_id) IS DISTINCT FROM (EXCLUDED.target_type, EXCLUDED.target_id)
    `;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risks SET control_ids = array_append(control_ids, $1), updated_at = NOW()
    WHERE risk_id = $2 AND NOT ($1 = ANY(control_ids))
    RETURNING risk_id
  `;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    const query = `SELECT r.risk_id, r.title, r.risk_score, r.risk_level,
            h.composite_score, h.zone, h.model_id
     FROM "${schema}".risks r
     LEFT JOIN LATERAL (
       SELECT composite_score, zone, model_id
       FROM "${schema}".risk_score_history
       WHERE risk_id = r.risk_id
       ORDER BY scored_at DESC
       LIMIT 1
     ) h ON true
     WHERE r.risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    const query = `SELECT
       DATE(scored_at) AS date,
       AVG(composite_score)::float AS avg_score
     FROM "${schema}".risk_score_history
     WHERE scored_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(scored_at)
     ORDER BY date ASC`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".risks`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT ON (h.risk_id)
       h.risk_id, h.composite_score, h.zone, h.scored_at,
       r.title, r.likelihood, r.impact
     FROM "${schema}".risk_score_history h
     LEFT JOIN "${schema}".risks r ON r.risk_id = h.risk_id
     ORDER BY h.risk_id, h.scored_at DESC`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    const query = `SELECT composite_score, zone, scored_at
     FROM "${schema}".risk_score_history
     WHERE risk_id = $1
     ORDER BY scored_at DESC
     LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_score_history
       (risk_id, model_id, dimension_scores, composite_score, zone)
     VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    const query = `SELECT owner, title FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    const query = `SELECT composite_score FROM "${schema}".risk_score_history
     WHERE risk_id = $1 AND model_id = $2
     ORDER BY scored_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risk_scoring_models SET
       name_en = $1, name_ar = $2, dimensions = $3, thresholds = $4, formula = $5, zone_definitions = $6
     WHERE model_id = $7 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_scoring_models WHERE model_id = $1`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_scoring_models
       (model_id, name_en, name_ar, dimensions, thresholds, formula, zone_definitions)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_scoring_models ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    const query = `
    SELECT category,
           ROUND(AVG(risk_score), 1)::float AS "avgResidual",
           COUNT(*)::int AS "riskCount",
           COUNT(*) FILTER (WHERE risk_score >= 20)::int AS "criticalCount",
           MAX(risk_score)::int AS "maxScore"
    FROM "${schema}".risks
    WHERE deleted_at IS NULL
    GROUP BY category
    ORDER BY category
  `;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    const query = `
      SELECT category, max_residual_score::int AS threshold
      FROM "${schema}".governance_risk_appetite
    `;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    const query = `
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
    `;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    const query = `
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
    `;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risk_acceptance_log SET
      decision = $1, decided_by = $2, decided_at = NOW(),
      decision_comments = $3, status = $1
    WHERE risk_id = $4 AND status = 'pending'
    RETURNING acceptance_id AS "acceptanceId", decision, status
  `;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    const query = `SELECT acceptance_id, risk_id, requested_by, status FROM "${schema}".risk_acceptance_log WHERE risk_id = $1 AND status = 'pending' LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".risk_acceptance_log
      (risk_id, residual_score, appetite_threshold, breach_amount, reason, requested_by, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING acceptance_id AS "acceptanceId", status
  `;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    const query = `
      SELECT max_residual_score::int AS threshold FROM "${schema}".governance_risk_appetite WHERE category = $1
    `;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    const query = `SELECT risk_score, category FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    const query = `
        SELECT decision, status FROM "${schema}".risk_acceptance_log
        WHERE risk_id = $1 ORDER BY requested_at DESC LIMIT 1
      `;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    const query = `
    SELECT risk_id AS "riskId", title AS "riskTitle", category,
           risk_score AS "residualScore", owner
    FROM "${schema}".risks
    WHERE deleted_at IS NULL AND risk_score >= 8
    ORDER BY risk_score DESC
  `;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    const query = `
      SELECT category, max_residual_score::int AS threshold
      FROM "${schema}".governance_risk_appetite
    `;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    const query = `
        INSERT INTO "${schema}".governance_risk_appetite
          (category, max_residual_score, acceptance_requires_role, review_cadence_days, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (category) DO UPDATE SET
          max_residual_score = EXCLUDED.max_residual_score,
          acceptance_requires_role = EXCLUDED.acceptance_requires_role,
          review_cadence_days = EXCLUDED.review_cadence_days,
          updated_at = NOW()
      `;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    const query = `
      SELECT category, max_residual_score::int AS "maxResidualScore",
             acceptance_requires_role AS "acceptanceRequiresRole",
             review_cadence_days AS "reviewCadenceDays",
             updated_at AS "updatedAt"
      FROM "${schema}".governance_risk_appetite
      ORDER BY category
    `;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risk_treatments SET
      status = 'validated',
      validated_by = $1,
      validated_at = NOW(),
      validation_notes = $2,
      validation_evidence_id = $3,
      updated_at = NOW()
    WHERE treatment_id = $4
    RETURNING treatment_id AS "treatmentId", status, validated_by AS "validatedBy"
  `;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    const query = `SELECT owner, status FROM "${schema}".risk_treatments WHERE treatment_id = $1`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risk_treatments SET
      title = COALESCE($1, title),
      status = COALESCE($2, status),
      owner = COALESCE($3, owner),
      target_date = COALESCE($4, target_date),
      strategy = COALESCE($5, strategy),
      expected_reduction = COALESCE($6, expected_reduction),
      actual_reduction = COALESCE($7, actual_reduction),
      updated_at = NOW()
    WHERE treatment_id = $8
    RETURNING treatment_id AS "treatmentId", title, status, owner, strategy
  `;
    return safeQuery(query, args);
  }

  static async query204(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET treatment_status = 'in_treatment', updated_at = NOW() WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query205(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".risk_treatments
      (risk_id, title, description, strategy, owner, status, target_date,
       expected_reduction, target_residual_score)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING treatment_id AS "treatmentId", title, status, owner,
              strategy, target_date AS "targetDate", risk_id AS "linkedRiskId"
  `;
    return safeQuery(query, args);
  }

  static async query206(schema: string, args: unknown[]) {
    const query = `
        SELECT risk_id AS "riskId", title, category, status, risk_score AS "residualScore"
        FROM "${schema}".risks WHERE risk_id = $1
      `;
    return safeQuery(query, args);
  }

  static async query207(schema: string, args: unknown[]) {
    const query = `
      SELECT t.treatment_id AS "treatmentId", t.title, t.description, t.status,
             t.owner, t.strategy, t.target_date AS "targetDate",
             t.risk_id AS "linkedRiskId",
             t.expected_reduction AS "expectedReduction",
             t.actual_reduction AS "actualReduction",
             t.validated_by AS "validatedBy", t.validated_at AS "validatedAt",
             t.validation_notes AS "validationNotes",
             t.created_at AS "createdAt",
             CASE WHEN t.target_date < NOW() AND t.status NOT IN ('done','validated','completed')
                  THEN true ELSE false END AS overdue
      FROM "${schema}".risk_treatments t
      WHERE t.treatment_id = $1
    `;
    return safeQuery(query, args);
  }

  static async query208(schema: string, args: unknown[]) {
    const query = `
      SELECT t.treatment_id AS "treatmentId", t.title, t.status, t.owner,
             t.strategy, t.target_date AS "targetDate",
             t.risk_id AS "linkedRiskId", r.title AS "linkedRiskTitle",
             t.expected_reduction AS "expectedReduction",
             t.actual_reduction AS "actualReduction",
             t.target_residual_score AS "targetResidualScore",
             t.created_at AS "createdAt",
             CASE WHEN t.target_date < NOW() AND t.status NOT IN ('done','validated','completed')
                  THEN true ELSE false END AS overdue
      FROM "${schema}".risk_treatments t
      LEFT JOIN "${schema}".risks r ON r.risk_id = t.risk_id
      WHERE 1=1
      ORDER BY t.created_at DESC
      LIMIT 100 OFFSET 0
    `;
    return safeQuery(query, args);
  }

  static async query209(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".risk_treatments t`;
    return safeQuery(query, args);
  }

  static async query210(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risk_campaigns SET status = 'completed', updated_at = NOW()
    WHERE campaign_id = $1 AND deleted_at IS NULL RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query211(schema: string, args: unknown[]) {
    const query = `
    UPDATE "${schema}".risk_campaigns SET status = 'active', updated_at = NOW()
    WHERE campaign_id = $1 AND status = 'draft' AND deleted_at IS NULL RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query212(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".risk_campaigns (title, description, campaign_type, status, start_date, end_date, created_by)
    VALUES ($1, $2, $3, 'draft', $4, $5, $6) RETURNING *
  `;
    return safeQuery(query, args);
  }

  static async query213(schema: string, args: unknown[]) {
    const query = `
    SELECT c.*,
      (SELECT json_agg(ai.* ORDER BY ai.due_date ASC)
       FROM "${schema}".risk_assessment_items ai
       WHERE ai.campaign_id = c.campaign_id AND ai.deleted_at IS NULL) AS items,
      (SELECT COUNT(*) FROM "${schema}".risk_assessment_items ai WHERE ai.campaign_id = c.campaign_id AND ai.deleted_at IS NULL) AS total_items,
      (SELECT COUNT(*) FROM "${schema}".risk_assessment_items ai WHERE ai.campaign_id = c.campaign_id AND ai.status = 'approved' AND ai.deleted_at IS NULL) AS approved_items
    FROM "${schema}".risk_campaigns c
    WHERE c.campaign_id = $1 AND c.deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query214(schema: string, args: unknown[]) {
    const query = `
    SELECT c.*,
      (SELECT COUNT(*) FROM "${schema}".risk_assessment_items ai WHERE ai.campaign_id = c.campaign_id AND ai.deleted_at IS NULL) AS total_items,
      (SELECT COUNT(*) FROM "${schema}".risk_assessment_items ai WHERE ai.campaign_id = c.campaign_id AND ai.status IN ('submitted','reviewed','approved') AND ai.deleted_at IS NULL) AS completed_items
    FROM "${schema}".risk_campaigns c
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query215(schema: string, args: unknown[]) {
    const query = `
    SELECT k.name, k.owner, bl.breach_value, bl.threshold_breached, bl.threshold_value
    FROM "${schema}".kri_breach_log bl
    JOIN "${schema}".risk_kris k ON k.kri_id = bl.kri_id
    WHERE bl.breach_id = $1
  `;
    return safeQuery(query, args);
  }

  static async query216(schema: string, args: unknown[]) {
    const query = `
    SELECT tp.treatment_id, tp.risk_id, tp.owner, tp.end_date, r.title as risk_title
    FROM "${schema}".risk_treatments tp
    JOIN "${schema}".risks r ON r.risk_id = tp.risk_id
    WHERE tp.treatment_status NOT IN ('completed', 'closed')
      AND tp.end_date < NOW()
  `;
    return safeQuery(query, args);
  }

  static async query217(schema: string, args: unknown[]) {
    const query = `
    SELECT r.risk_id, r.title, r.owner, r.owner_user_id, r.next_review_date
    FROM "${schema}".risks r
    WHERE r.next_review_date IS NOT NULL
      AND r.next_review_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      AND r.status NOT IN ('closed', 'archived')
      AND r.deleted_at IS NULL
  `;
    return safeQuery(query, args);
  }

  static async query218(schema: string, args: unknown[]) {
    const query = `
    INSERT INTO "${schema}".notification_queue (
      recipient_id, notification_type, subject, body,
      entity_type, entity_id, priority, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING notification_id
  `;
    return safeQuery(query, args);
  }

  static async query219(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_pair_reviews ORDER BY created_at DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query220(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_pair_reviews WHERE review_id = $1`;
    return safeQuery(query, args);
  }

  static async query221(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET inherent_score = $1 WHERE risk_id = $2`;
    return safeQuery(query, args);
  }

  static async query222(schema: string, args: unknown[]) {
    const query = `SELECT risk_id FROM "${schema}".risk_pair_reviews WHERE review_id = $1`;
    return safeQuery(query, args);
  }

  static async query223(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risk_pair_reviews
     SET final_score = $1, final_method = $2, status = 'finalized', finalized_at = NOW()
     WHERE review_id = $3`;
    return safeQuery(query, args);
  }

  static async query224(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risk_pair_reviews SET dialogue_entries = $1 WHERE review_id = $2`;
    return safeQuery(query, args);
  }

  static async query225(schema: string, args: unknown[]) {
    const query = `SELECT dialogue_entries FROM "${schema}".risk_pair_reviews WHERE review_id = $1`;
    return safeQuery(query, args);
  }

  static async query226(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risk_pair_reviews
     SET human_score = $1, human_reasoning = $2, disagreement_flag = $3,
         status = $4, final_method = $5, final_score = $6,
         dialogue_entries = $7, finalized_at = $8
     WHERE review_id = $9`;
    return safeQuery(query, args);
  }

  static async query227(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".risk_pair_reviews WHERE review_id = $1`;
    return safeQuery(query, args);
  }

  static async query228(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risk_pair_reviews
       (risk_id, agent_id, human_analyst_id, agent_score, agent_reasoning)
     VALUES ($1, 'AGENT-A02', $2, $3, $4) RETURNING review_id, created_at`;
    return safeQuery(query, args);
  }

  static async query229(schema: string, args: unknown[]) {
    const query = `
      SELECT pt.task_id, pt.title, pt.description, pt.priority,
             pt.status, pt.assigned_to, pt.sla_deadline,
             pt.escalation_level, pt.entity_id AS linked_risk_id,
             pt.created_at,
             r.title AS risk_title
      FROM "${schema}".process_tasks pt
      LEFT JOIN "${schema}".risks r ON r.risk_id = pt.entity_id
      WHERE pt.entity_type = 'risk'
        AND pt.assigned_to = $1
        AND pt.status NOT IN ('completed', 'cancelled')
      ORDER BY pt.sla_deadline ASC NULLS LAST
      LIMIT 25
    `;
    return safeQuery(query, args);
  }

  static async query230(schema: string, args: unknown[]) {
    const query = `
      SELECT sh.history_id, sh.risk_id, sh.previous_status, sh.new_status,
             sh.previous_score, sh.new_score, sh.changed_by, sh.reason,
             sh.created_at,
             r.title AS risk_title, r.category
      FROM "${schema}".risk_status_history sh
      JOIN "${schema}".risks r ON r.risk_id = sh.risk_id
      WHERE sh.new_status = 'escalated'
        AND sh.created_at > NOW() - INTERVAL '30 days'
      ORDER BY sh.created_at DESC
      LIMIT 25
    `;
    return safeQuery(query, args);
  }

  static async query231(schema: string, args: unknown[]) {
    const query = `
      SELECT tp.treatment_id, tp.risk_id, tp.title, tp.treatment_strategy,
             tp.treatment_status, tp.owner, tp.end_date,
             tp.completion_percent,
             r.title AS risk_title, r.category,
             CASE WHEN tp.end_date < NOW() THEN true ELSE false END AS is_overdue
      FROM "${schema}".risk_treatments tp
      JOIN "${schema}".risks r ON r.risk_id = tp.risk_id
      WHERE tp.deleted_at IS NULL
        AND tp.owner = $1
        AND tp.treatment_status NOT IN ('completed', 'closed')
      ORDER BY tp.end_date ASC NULLS LAST
      LIMIT 25
    `;
    return safeQuery(query, args);
  }

  static async query232(schema: string, args: unknown[]) {
    const query = `
      SELECT bl.breach_id, bl.kri_id, bl.breach_value, bl.threshold_breached,
             bl.threshold_value, bl.status, bl.breached_at,
             k.name AS kri_name, k.owner, k.linked_risk_id,
             r.title AS risk_title
      FROM "${schema}".kri_breach_log bl
      JOIN "${schema}".risk_kris k ON k.kri_id = bl.kri_id
      LEFT JOIN "${schema}".risks r ON r.risk_id = k.linked_risk_id
      WHERE bl.status IN ('open', 'acknowledged')
      ORDER BY CASE bl.threshold_breached WHEN 'red' THEN 1 WHEN 'amber' THEN 2 ELSE 3 END,
               bl.breached_at DESC
      LIMIT 25
    `;
    return safeQuery(query, args);
  }

  static async query233(schema: string, args: unknown[]) {
    const query = `
      SELECT ai.item_id, ai.risk_id, ai.status, ai.due_date,
             r.title AS risk_title, r.category,
             c.title AS campaign_title, c.campaign_type AS methodology
      FROM "${schema}".risk_assessment_items ai
      JOIN "${schema}".risks r ON r.risk_id = ai.risk_id
      LEFT JOIN "${schema}".risk_campaigns c ON c.campaign_id = ai.campaign_id
      WHERE ai.deleted_at IS NULL
        AND ai.assigned_to = $1
        AND ai.status IN ('pending', 'in_progress')
      ORDER BY ai.due_date ASC NULLS LAST
      LIMIT 25
    `;
    return safeQuery(query, args);
  }

  static async query234(schema: string, args: unknown[]) {
    const query = `
      SELECT r.risk_id, r.risk_code, r.title, r.category, r.status,
             COALESCE(r.inherent_score, r.risk_score, r.likelihood * r.impact) AS risk_score,
             COALESCE(r.residual_score, r.risk_score) AS residual_score,
             r.trend_direction, r.appetite_status, r.next_review_date,
             r.updated_at, r.owner, r.owner_user_id
      FROM "${schema}".risks r
      WHERE r.deleted_at IS NULL
        AND r.status IN ('identified', 'draft', 'pending_review')
        AND (r.owner = $1 OR r.owner_user_id = $1)
      ORDER BY COALESCE(r.inherent_score, r.risk_score, r.likelihood * r.impact) DESC,
               r.updated_at DESC
      LIMIT 25
    `;
    return safeQuery(query, args);
  }

}
