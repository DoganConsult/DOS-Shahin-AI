// Auto-extracted Audit repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class AuditAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".audits a
           WHERE a.created_at::date = d.date::date
         ), 0) AS audits_started,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".audits a
           WHERE a.status = 'completed'
             AND a.updated_at::date = d.date::date
         ), 0) AS audits_completed,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".findings f
           WHERE f.created_at::date = d.date::date
         ), 0) AS findings_raised
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       ORDER BY d.date ASC`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS unresolved_critical
       FROM "${schema}".findings
       WHERE severity = 'critical'
         AND status NOT IN ('resolved', 'closed')`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS overdue_audits
       FROM "${schema}".audits
       WHERE status IN ('planned', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date < NOW()`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
         COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE severity = 'low')::int AS low
       FROM "${schema}".findings`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'planned')::int AS planned,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM "${schema}".audits`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_engagements
         (id, name, audit_type, start_date, end_date, lead_auditor, scope, objectives, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', NOW(), NOW())`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".audit_engagements WHERE status = 'overdue' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".audit_engagements WHERE status = 'open' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".audit_engagements WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'audit' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'audit','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT task_id, title, priority, status, due_date, assigned_to,
            linked_entity_id AS control_id, completed_at
     FROM "${schema}".remediation_tasks
     ORDER BY due_date`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title, category, likelihood, impact, risk_score,
            status, treatment_status, owner
     FROM "${schema}".risks
     ORDER BY risk_score DESC`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT assessment_id, title, score, status, framework_id, created_at
     FROM "${schema}".assessments
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, version, status, owner, frameworks, updated_at
     FROM "${schema}".policies
     WHERE status != 'draft'
     ORDER BY updated_at DESC`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, control_id, type, status, verified,
            expiry_date, created_at, file_path, hash
     FROM "${schema}".evidence
     WHERE 1=1 ${dateFilter}
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, status, test_status, last_tested_at, owner,
            frameworks, mapped_registry_nodes, evidence_required, category
     FROM "${schema}".controls
     WHERE 1=1 ${fwFilter}
     ORDER BY title`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT industry, sub_industry, entity_type, criticality_tier, country, company_size, name
     FROM "${schema}".tenant_config LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.control_id, e.title, e.artifact_type, e.source_type,
              e.collected_at, e.valid_until, e.content_hash, e.file_path,
              et.default_quality_tier
       FROM "${schema}".evidence e
       LEFT JOIN "${schema}".evidence_types et ON et.artifact_type = e.artifact_type
       WHERE e.evidence_id = ANY($1) AND e.deleted_at IS NULL
       ORDER BY e.collected_at DESC`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT tp.procedure_id AS test_id, tp.control_id, tp.test_type AS test_method,
            tp.steps AS procedure_steps, tp.expected_outcome AS expected_result,
            tp.sampling_method AS sampling_guidance,
            tr.outcome AS test_result, tr.tester_id::text AS tested_by,
            tr.test_date::text AS tested_at, tr.findings AS result_notes
     FROM "${schema}".control_test_procedures tp
     LEFT JOIN "${schema}".control_test_results tr ON tr.procedure_id = tp.procedure_id
       AND tr.review_status IN ('approved', 'in_review')
     WHERE tp.control_id = ANY($1) AND tp.is_active = TRUE
     ORDER BY tp.control_id, tp.procedure_id`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.control_code, c.title, c.domain, c.family,
            c.frameworks, c.test_status, c.evidence_ids,
            f.framework_code, f.framework_name_en
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".frameworks f ON f.framework_id = ANY(c.frameworks)
     WHERE c.deleted_at IS NULL
       AND (c.frameworks && $1::text[] OR $1::text[] = ARRAY[]::text[])
     ORDER BY c.domain, c.family, c.control_code`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT framework_id FROM "${schema}".frameworks
       WHERE deleted_at IS NULL AND (removed_by_admin IS NULL OR removed_by_admin = FALSE)`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT framework_id FROM "${schema}".assessments WHERE assessment_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT module FROM "${schema}".audit_trail ORDER BY module`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".audit_trail at ${where}`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT at.*, u.email AS user_email
     FROM "${schema}".audit_trail at
     LEFT JOIN public.users u ON u.user_id = at.user_id
     ${where}
     ORDER BY at.timestamp DESC
     LIMIT $${idx++} OFFSET $${idx++}`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT entry_id, timestamp, user_id, module, action, entity_type, entity_id, entry_hash, previous_hash
     FROM "${schema}".audit_trail
     WHERE ${conditions.join(' AND ')}
     ORDER BY timestamp ASC`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT rp.* FROM "${schema}".remediation_plans rp
     JOIN "${schema}".findings f ON f.finding_id = rp.finding_id
     WHERE f.source_type = 'audit' AND f.source_id = $1 AND rp.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence (control_id, title, description, file_path, content_hash, previous_hash, chain_position, submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT content_hash, chain_position FROM "${schema}".evidence ORDER BY chain_position DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".findings SET status = $1 WHERE finding_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".closure_reviews (finding_id, reviewer_id, outcome, evidence_ids, comments, verified_effective)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT cr.*, f.title AS finding_title, f.severity AS finding_severity, f.status AS finding_status
     FROM "${schema}".closure_reviews cr
     LEFT JOIN "${schema}".findings f ON f.finding_id = cr.finding_id
     WHERE cr.deleted_at IS NULL
     ORDER BY cr.review_date DESC`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT treatment_id, title, status, risk_id FROM "${schema}".risk_treatments
       WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_plans SET risk_treatment_id = $2, updated_at = NOW()
     WHERE plan_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risk_treatments SET status = 'completed', updated_at = NOW()
           WHERE treatment_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET residual_likelihood = $2, residual_impact = $3, risk_level = $4, updated_at = NOW()
             WHERE risk_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, likelihood, impact FROM "${schema}".risks
           WHERE source_id = $1 AND risk_source = 'audit_finding' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_plans SET ${sets.join(', ')}, updated_at = NOW() WHERE plan_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_plans (finding_id, title, description, owner_id, target_date, priority, approach, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'open') RETURNING *`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT rp.*, f.title AS finding_title, f.severity AS finding_severity, f.status AS finding_status
     FROM "${schema}".remediation_plans rp
     LEFT JOIN "${schema}".findings f ON f.finding_id = rp.finding_id
     WHERE rp.plan_id = $1 AND rp.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT rp.*, f.title AS finding_title, f.severity AS finding_severity
     FROM "${schema}".remediation_plans rp
     LEFT JOIN "${schema}".findings f ON f.finding_id = rp.finding_id
     WHERE rp.deleted_at IS NULL
     ORDER BY rp.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".finding_impacts (finding_id, impact_type, severity, affected_area, financial_impact, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".finding_impacts WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".finding_root_causes (finding_id, cause_type, description, analysis_method, contributing_factors)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".finding_root_causes WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".findings SET deleted_at = NOW() WHERE finding_id = $1 AND deleted_at IS NULL RETURNING finding_id`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".findings SET ${sets.join(', ')} WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".findings (title, description, severity, source_type, source_id, status, finding_type, workspace_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".closure_reviews WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY review_date DESC`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_plans WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".finding_impacts WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".finding_root_causes WHERE finding_id = $1 AND deleted_at IS NULL ORDER BY created_at`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".findings WHERE finding_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".findings WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".findings WHERE source_type = 'audit' AND source_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audits WHERE audit_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audits WHERE deleted_at IS NULL ORDER BY planned_start ASC NULLS LAST, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audits SET deleted_at = NOW(), updated_at = NOW() WHERE audit_id = $1 AND deleted_at IS NULL RETURNING audit_id`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audits SET status = $1${extras.join('')}, updated_at = NOW() WHERE audit_id = $2 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audits SET ${sets.join(', ')}, updated_at = NOW() WHERE audit_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audits (title, description, audit_type, scope, lead_auditor_id, planned_start, planned_end, methodology)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".findings WHERE source_type = 'audit' AND source_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_scopes WHERE audit_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audits WHERE audit_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT a.*,
       (SELECT COUNT(*)::int FROM "${schema}".findings f WHERE f.source_type = 'audit' AND f.source_id = a.audit_id::text AND f.deleted_at IS NULL) AS finding_count
     FROM "${schema}".audits a
     WHERE a.deleted_at IS NULL
     ORDER BY a.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT a.*,
         (SELECT COUNT(*)::int FROM "${schema}".findings f WHERE f.source_type = 'audit' AND f.source_id = a.audit_id::text AND f.deleted_at IS NULL) AS finding_count
       FROM "${schema}".audits a
       WHERE a.deleted_at IS NULL AND (a.created_by = $1 OR a.lead_auditor = $1)
       ORDER BY a.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".findings
       WHERE status != 'closed' AND deleted_at IS NULL
         AND created_at < NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_controls,
         COUNT(DISTINCT e.control_id)::int AS ready_controls
       FROM "${schema}".controls c
       LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id AND e.deleted_at IS NULL
       WHERE c.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".findings WHERE linked_violation_id IS NOT NULL AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c FROM "${schema}".risks WHERE risk_source = 'audit_finding' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT outcome, COUNT(*)::int AS c FROM "${schema}".closure_reviews WHERE deleted_at IS NULL GROUP BY outcome`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS c FROM "${schema}".remediation_plans WHERE deleted_at IS NULL GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `SELECT status, severity, COUNT(*)::int AS c FROM "${schema}".findings WHERE deleted_at IS NULL GROUP BY status, severity`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS c FROM "${schema}".audits WHERE deleted_at IS NULL GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_versions
     WHERE evidence_id = $1
     ORDER BY version_number DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_versions
     WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".evidence_versions
     WHERE evidence_id = $1
     ORDER BY version_number DESC`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(DISTINCT control_id)::int AS tested_controls,
       COUNT(*)::int AS total_test_plans,
       COUNT(*) FILTER (WHERE status = 'passed')::int AS passed,
       COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       (SELECT COUNT(*)::int FROM "${schema}".controls WHERE deleted_at IS NULL) AS total_controls
     FROM "${schema}".audit_test_plans
     WHERE audit_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_test_plans
     SET status = $2, result_notes = $3, tested_by = $4,
         tested_at = NOW(), updated_at = NOW()
     WHERE plan_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_test_plans
       (plan_id, audit_id, control_id, test_description, test_type,
        sample_size, assigned_to, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW()) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_test_plans
       WHERE audit_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `SELECT tp.*,
         c.control_title_en AS control_name,
         c.framework_code,
         c.implementation_status AS control_status,
         c.control_description_en AS control_description
       FROM "${schema}".audit_test_plans tp
       LEFT JOIN "${schema}".controls c ON c.control_id = tp.control_id AND c.deleted_at IS NULL
       WHERE tp.audit_id = $1 AND tp.deleted_at IS NULL
       ORDER BY tp.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT
       user_id,
       COUNT(*)::int AS entry_count,
       SUM(hours)::numeric AS total_hours,
       COUNT(DISTINCT audit_id)::int AS audits_worked,
       ROUND(AVG(hours), 2) AS avg_hours_per_entry,
       jsonb_object_agg(
         COALESCE(activity_type, 'other'),
         activity_hours
       ) AS hours_by_activity
     FROM (
       SELECT user_id, audit_id, activity_type, hours,
         SUM(hours) OVER (PARTITION BY user_id, activity_type) AS activity_hours
       FROM "${schema}".audit_time_entries
       WHERE deleted_at IS NULL
     ) sub
     GROUP BY user_id
     ORDER BY total_hours DESC`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(DISTINCT audit_id)::int AS audits_tracked,
       SUM(hours)::numeric AS total_hours,
       ROUND(AVG(audit_total), 1) AS avg_hours_per_audit,
       MAX(audit_total) AS max_hours_audit,
       MIN(audit_total) AS min_hours_audit
     FROM (
       SELECT audit_id, SUM(hours) AS audit_total
       FROM "${schema}".audit_time_entries
       WHERE deleted_at IS NULL
       GROUP BY audit_id
     ) sub`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_time_entries
       (entry_id, audit_id, user_id, activity_type, hours, description, entry_date, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW()) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_time_entries
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY entry_date DESC, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_working_papers
     SET status = 'approved', approved_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_working_papers
     SET status = 'in_review', reviewer_id = $2, submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_working_papers
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_working_papers
       (id, audit_id, title, description, paper_type, reference_code,
        prepared_by, file_path, content, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_working_papers
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role IN ('admin', 'owner') LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_anomalies
         (anomaly_type, severity, user_id, details, detected_at)
         VALUES ($1, $2, $3, $4::jsonb, $5)`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'audit_anomalies'`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT user_id, entity_type, action, COUNT(*) as n
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND entity_type IN ('role', 'permission', 'feature_flag', 'security_policy', 'tenant_config', 'rls_policy')
       GROUP BY user_id, entity_type, action
       HAVING COUNT(*) >= 2`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `WITH user_ips AS (
        SELECT user_id, ip_address, timestamp,
          LAG(ip_address) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_ip,
          LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_ts
        FROM "${schema}".audit_trail
        WHERE timestamp >= $1
          AND action IN ('login', 'create')
          AND ip_address IS NOT NULL
          AND user_id IS NOT NULL
      )
      SELECT user_id, ip_address, prev_ip,
             timestamp AS current_ts, prev_ts,
             EXTRACT(EPOCH FROM (timestamp - prev_ts)) AS gap_seconds
      FROM user_ips
      WHERE prev_ip IS NOT NULL
        AND ip_address::text != prev_ip::text
        AND timestamp - prev_ts < INTERVAL '30 minutes'
      LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `SELECT user_id, COUNT(*) as export_count
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND action IN ('audit_log_export', 'export', 'bulk_export')
         AND user_id IS NOT NULL
       GROUP BY user_id
       HAVING COUNT(*) >= 5`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `SELECT user_id, COUNT(*) as attempts
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND action = 'security_violation'
       GROUP BY user_id
       HAVING COUNT(*) >= 1`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, entity_type, COUNT(*) as n
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND (action IN ('role_changed', 'permission_granted', 'admin_access')
              OR entity_type IN ('role', 'permission', 'security_policy'))
       GROUP BY user_id, action, entity_type
       HAVING COUNT(*) >= 3`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `SELECT user_id,
              date_trunc('hour', timestamp) + INTERVAL '5 min' * FLOOR(EXTRACT(MINUTE FROM timestamp) / 5) AS window_start,
              COUNT(*) as delete_count
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND action IN ('delete', 'deleted', 'bulk_delete', 'remove')
       GROUP BY user_id, window_start
       HAVING COUNT(*) > 10
       ORDER BY delete_count DESC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `SELECT user_id, COUNT(*) as off_hours_count
       FROM "${schema}".audit_trail
       WHERE timestamp >= $1
         AND EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22
         AND user_id IS NOT NULL
       GROUP BY user_id
       HAVING COUNT(*) >= 5`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `WITH user_counts AS (
        SELECT user_id, COUNT(*) as entry_count
        FROM "${schema}".audit_trail
        WHERE timestamp >= $1 AND user_id IS NOT NULL
        GROUP BY user_id
      ),
      avg_count AS (
        SELECT AVG(entry_count) as avg_entries FROM user_counts
      )
      SELECT uc.user_id, uc.entry_count, ac.avg_entries
      FROM user_counts uc, avg_count ac
      WHERE uc.entry_count > ac.avg_entries * 3 AND ac.avg_entries > 5`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'audit_trail'`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `WITH finding_sla AS (
       SELECT f.finding_id, f.severity, f.status, f.created_at,
         sla.resolution_days,
         CASE
           WHEN f.status = 'closed' THEN
             CASE WHEN f.updated_at <= f.created_at + (sla.resolution_days || ' days')::interval
               THEN true ELSE false END
           WHEN f.status = 'open' THEN
             CASE WHEN NOW() <= f.created_at + (sla.resolution_days || ' days')::interval
               THEN true ELSE false END
           ELSE true
         END AS within_sla
       FROM "${schema}".findings f
       JOIN "${schema}".audit_finding_slas sla ON sla.severity = f.severity
       WHERE f.deleted_at IS NULL
     )
     SELECT
       COUNT(*)::int AS total_findings,
       COUNT(*) FILTER (WHERE within_sla)::int AS within_sla_count,
       COUNT(*) FILTER (WHERE NOT within_sla)::int AS breached_count,
       CASE WHEN COUNT(*) > 0
         THEN ROUND(COUNT(*) FILTER (WHERE within_sla)::numeric / COUNT(*)::numeric * 100, 1)
         ELSE 100
       END AS compliance_pct
     FROM finding_sla`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT f.*, sla.resolution_days, sla.escalation_to,
       EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_open,
       EXTRACT(DAY FROM NOW() - f.created_at)::int - sla.resolution_days AS days_overdue
     FROM "${schema}".findings f
     JOIN "${schema}".audit_finding_slas sla ON sla.severity = f.severity
     WHERE f.status = 'open'
       AND f.deleted_at IS NULL
       AND f.created_at + (sla.resolution_days || ' days')::interval < NOW()
     ORDER BY days_overdue DESC`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_finding_slas
       (sla_id, severity, resolution_days, warning_pct, escalation_to, created_at)
     VALUES ($1,$2,$3,$4,$5, NOW())
     ON CONFLICT (severity) DO UPDATE SET
       resolution_days = EXCLUDED.resolution_days,
       warning_pct = EXCLUDED.warning_pct,
       escalation_to = EXCLUDED.escalation_to,
       updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_finding_slas
     ORDER BY severity ASC`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT
       f.finding_id,
       f.title,
       f.severity,
       f.status,
       COUNT(rf.id)::int AS repeat_count
     FROM "${schema}".findings f
     INNER JOIN "${schema}".repeat_findings rf ON rf.original_finding_id = f.finding_id
     WHERE f.deleted_at IS NULL
     GROUP BY f.finding_id, f.title, f.severity, f.status
     ORDER BY repeat_count DESC
     LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT
       severity,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE status = 'open')::int AS open,
       COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
       COUNT(*) FILTER (WHERE status = 'in_remediation')::int AS in_remediation
     FROM "${schema}".findings
     WHERE deleted_at IS NULL
     GROUP BY severity
     ORDER BY
       CASE severity
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT
       CASE
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 30 THEN '0-30'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 60 THEN '31-60'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 90 THEN '61-90'
         ELSE '90+'
       END AS age_bucket,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high
     FROM "${schema}".findings
     WHERE deleted_at IS NULL AND status != 'closed'
     GROUP BY age_bucket
     ORDER BY
       CASE age_bucket
         WHEN '0-30' THEN 1
         WHEN '31-60' THEN 2
         WHEN '61-90' THEN 3
         ELSE 4
       END`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT
       TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
       COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
       COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
       COUNT(*) FILTER (WHERE severity = 'low')::int AS low
     FROM "${schema}".findings
     WHERE deleted_at IS NULL
       AND created_at >= $1::date
       AND created_at <= $2::date
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month ASC`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT rf.*,
       f.title AS linked_finding_title,
       f.severity AS linked_finding_severity,
       f.status AS linked_finding_status,
       f.created_at AS linked_finding_created_at
     FROM "${schema}".repeat_findings rf
     LEFT JOIN "${schema}".findings f ON f.finding_id = rf.finding_id
     WHERE rf.finding_id = $1 OR rf.original_finding_id = $1
     ORDER BY rf.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".repeat_findings
       (id, finding_id, original_finding_id, notes)
     VALUES ($1,$2,$3,$4)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT rf.*,
       f.title AS finding_title,
       f.severity AS finding_severity,
       f.status AS finding_status,
       of.title AS original_finding_title,
       of.severity AS original_finding_severity
     FROM "${schema}".repeat_findings rf
     LEFT JOIN "${schema}".findings f ON f.finding_id = rf.finding_id
     LEFT JOIN "${schema}".findings of ON of.finding_id = rf.original_finding_id
     ORDER BY rf.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".external_audit_requests
     SET
       shared_findings = (
         SELECT jsonb_agg(DISTINCT val)
         FROM jsonb_array_elements(
           COALESCE(shared_findings, '[]'::jsonb) || $2::jsonb
         ) AS val
       ),
       shared_evidence = (
         SELECT jsonb_agg(DISTINCT val)
         FROM jsonb_array_elements(
           COALESCE(shared_evidence, '[]'::jsonb) || $3::jsonb
         ) AS val
       ),
       updated_at = NOW()
     WHERE request_id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".external_audit_requests
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".external_audit_requests
       (title, external_firm, audit_type, contact_email, notes,
        created_by, access_token, access_expires_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `SELECT qr.*, a.title AS engagement_title
     FROM "${schema}".audit_qa_reviews qr
     LEFT JOIN "${schema}".audits a ON a.audit_id = qr.engagement_id
     ORDER BY qr.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT qr.*, a.title AS engagement_title
       FROM "${schema}".audit_qa_reviews qr
       LEFT JOIN "${schema}".audits a ON a.audit_id = qr.engagement_id
       WHERE qr.engagement_id = $1
       ORDER BY qr.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_qa_reviews
       (engagement_id, reviewer, checklist_items, overall_rating, comments, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `SELECT
       finding_id,
       title,
       severity,
       status,
       created_at,
       EXTRACT(DAY FROM NOW() - created_at)::int AS days_open
     FROM "${schema}".findings
     WHERE deleted_at IS NULL
       AND status NOT IN ('closed', 'deferred')
     ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE last_audit_date IS NOT NULL)::int AS audited
     FROM "${schema}".audit_universe`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE outcome = 'closed')::int AS closed
       FROM "${schema}".closure_reviews
       WHERE deleted_at IS NULL ${dateFilter}`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `SELECT finding_id, title, severity, status, created_at
       FROM "${schema}".findings
       WHERE deleted_at IS NULL
         AND severity IN ('critical', 'high')
         AND status = 'open'
       ORDER BY
         CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 END,
         created_at ASC
       LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT audit_id, title, planned_start, planned_end, audit_type
       FROM "${schema}".audits
       WHERE deleted_at IS NULL
         AND status = 'planned'
         AND planned_start IS NOT NULL
         AND planned_start <= NOW() + INTERVAL '90 days'
       ORDER BY planned_start ASC
       LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS c
       FROM "${schema}".remediation_plans rp
       WHERE rp.deleted_at IS NULL
         AND rp.target_date < NOW()
         AND rp.status NOT IN ('completed', 'closed')
         ${dateFilterPlans}`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `SELECT severity, COUNT(*)::int AS c
       FROM "${schema}".findings
       WHERE deleted_at IS NULL ${dateFilter}
       GROUP BY severity`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS c
       FROM "${schema}".audits
       WHERE deleted_at IS NULL ${dateFilter}
       GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".auditor_assignments
       (engagement_id, auditor_id, role, status, assigned_at)
     VALUES ($1, $2, $3, 'active', NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `SELECT
       aa.auditor_id,
       COALESCE(tm.full_name, tm.email, aa.auditor_id) AS auditor_name,
       COUNT(DISTINCT aa.engagement_id) FILTER (WHERE aa.status = 'active')::int AS active_engagements,
       COALESCE(SUM(aa.hours_allocated) FILTER (WHERE aa.status = 'active'), 0)::numeric AS total_hours_allocated,
       (${MAX_AUDITOR_HOURS} - COALESCE(SUM(aa.hours_allocated) FILTER (WHERE aa.status = 'active'), 0))::numeric AS available_capacity
     FROM "${schema}".auditor_assignments aa
     LEFT JOIN "${schema}".team_members tm ON tm.user_id = aa.auditor_id
     GROUP BY aa.auditor_id, tm.full_name, tm.email
     ORDER BY available_capacity DESC`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT
       entity_id,
       entity_name,
       entity_type,
       department,
       risk_score,
       last_audit_date,
       audit_frequency,
       notes,
       CASE
         WHEN last_audit_date IS NOT NULL
           THEN EXTRACT(DAY FROM NOW() - last_audit_date)::int
         ELSE NULL
       END AS days_since_audit,
       CASE
         WHEN last_audit_date IS NOT NULL
           THEN ROUND(risk_score * (1 + EXTRACT(DAY FROM NOW() - last_audit_date) / 365.0), 2)
         ELSE ROUND(risk_score * 2, 2)
       END AS composite_score
     FROM "${schema}".audit_universe
     ORDER BY
       CASE
         WHEN last_audit_date IS NOT NULL
           THEN risk_score * (1 + EXTRACT(DAY FROM NOW() - last_audit_date) / 365.0)
         ELSE risk_score * 2
       END DESC`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) AS cnt FROM "${schema}".audit_findings GROUP BY status ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT severity, COUNT(*) AS cnt FROM "${schema}".audit_findings GROUP BY severity ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total_audits, COUNT(*) FILTER (WHERE status='completed') AS completed FROM "${schema}".audits`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".audit_findings WHERE owner IS NULL AND status='open'`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".audits WHERE status='in_progress' AND end_date < NOW()`;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".audit_findings WHERE severity='critical' AND status='open'`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `SELECT a.status, COUNT(af.id) FILTER (WHERE af.severity='critical' AND af.status='open') AS open_critical
     FROM "${schema}".audits a
     LEFT JOIN "${schema}".audit_findings af ON af.audit_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.status`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `SELECT a.status,
            COUNT(af.id) AS total_findings,
            COUNT(af.id) FILTER (WHERE af.severity = 'critical') AS critical,
            COUNT(af.id) FILTER (WHERE af.severity = 'high') AS high,
            COUNT(af.id) FILTER (WHERE af.status = 'open') AS open_findings
     FROM "${schema}".audits a
     LEFT JOIN "${schema}".audit_findings af ON af.audit_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.status`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `SELECT audit_type, status FROM "${schema}".audits WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE severity='critical') AS critical, COUNT(*) FILTER (WHERE severity='high') AS high, COUNT(*) FILTER (WHERE status='open') AS open FROM "${schema}".audit_findings WHERE audit_id = $1`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `SELECT title, audit_type, status, auditor, start_date, end_date, scope FROM "${schema}".audits WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
       FROM "${schema}".findings
       WHERE linked_violation_id IS NOT NULL AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
       FROM "${schema}".risks
       WHERE risk_source = 'audit_finding' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
       FROM "${schema}".findings WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".findings
     SET linked_violation_id = $2, updated_at = NOW()
     WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    const query = `SELECT violation_id FROM "${schema}".compliance_violations
       WHERE violation_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    const query = `SELECT finding_id FROM "${schema}".findings
       WHERE finding_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".risks
       (risk_id, risk_title, risk_description, risk_source, source_id,
        likelihood, impact, risk_level, status, created_at)
     VALUES ($1, $2, $3, 'audit_finding', $4,
        CASE WHEN $5 = 'critical' THEN 5 ELSE 4 END,
        CASE WHEN $5 = 'critical' THEN 5 ELSE 4 END,
        CASE WHEN $5 = 'critical' THEN 'critical' ELSE 'high' END,
        'open', NOW())
     ON CONFLICT (source_id) DO UPDATE SET
       risk_title = EXCLUDED.risk_title,
       risk_description = EXCLUDED.risk_description,
       likelihood = EXCLUDED.likelihood,
       impact = EXCLUDED.impact,
       risk_level = EXCLUDED.risk_level,
       updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".findings
     WHERE finding_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".external_audit_coordination
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE coordination_id = $1 AND deleted_at IS NULL RETURNING coordination_id`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".external_audit_coordination
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".external_audit_coordination
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE coordination_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".external_audit_coordination
       (coordination_id, audit_id, firm_name, contact_name, contact_email,
        engagement_type, scope_description, start_date, end_date, status, notes, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW()) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".external_audit_coordination
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".regulatory_audit_requirements
     SET linked_audit_id = $2, updated_at = NOW()
     WHERE requirement_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".regulatory_audit_requirements
     WHERE status != 'completed'
       AND next_due_at < NOW()
       AND deleted_at IS NULL
     ORDER BY next_due_at ASC`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".regulatory_audit_requirements
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE requirement_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".regulatory_audit_requirements
       (requirement_id, requirement_name, regulatory_body, description,
        frequency, next_due_at, status, linked_audit_id, notes, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".regulatory_audit_requirements
     WHERE deleted_at IS NULL
     ORDER BY next_due_at ASC NULLS LAST, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (notification_id, recipient_id, notification_type, subject, body, created_at)
       VALUES ($1,$2,$3,$4,$5, NOW())`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    const query = `SELECT f.finding_id, f.title, f.severity, f.created_at,
       a.lead_auditor_id AS recipient
     FROM "${schema}".findings f
     LEFT JOIN "${schema}".audits a ON a.audit_id::text = f.source_id
     LEFT JOIN "${schema}".remediation_plans rp ON rp.finding_id = f.finding_id AND rp.deleted_at IS NULL
     WHERE f.deleted_at IS NULL
       AND f.status = 'open'
       AND f.created_at < NOW() - INTERVAL '30 days'
       AND rp.plan_id IS NULL
       AND a.lead_auditor_id IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (notification_id, recipient_id, notification_type, subject, body, created_at)
       VALUES ($1,$2,$3,$4,$5, NOW())`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    const query = `SELECT rp.plan_id, rp.title, rp.target_date, rp.owner_id,
       f.title AS finding_title
     FROM "${schema}".remediation_plans rp
     LEFT JOIN "${schema}".findings f ON f.finding_id = rp.finding_id
     WHERE rp.deleted_at IS NULL
       AND rp.status NOT IN ('completed','closed')
       AND rp.target_date IS NOT NULL
       AND rp.target_date < NOW()
       AND rp.owner_id IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (notification_id, recipient_id, notification_type, subject, body, created_at)
       VALUES ($1,$2,$3,$4,$5, NOW())`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    const query = `SELECT audit_id, title, planned_end, lead_auditor_id
     FROM "${schema}".audits
     WHERE deleted_at IS NULL
       AND status IN ('planned','in_progress')
       AND planned_end IS NOT NULL
       AND planned_end < NOW()
       AND lead_auditor_id IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    const query = `SELECT rp.plan_id, rp.title, rp.target_date, rp.status, rp.owner_id,
         'capa_target' AS deadline_type,
         f.title AS finding_title
       FROM "${schema}".remediation_plans rp
       LEFT JOIN "${schema}".findings f ON f.finding_id = rp.finding_id
       WHERE rp.deleted_at IS NULL
         AND rp.status NOT IN ('completed','closed')
         AND rp.target_date IS NOT NULL
         AND rp.target_date <= NOW() + ($1 || ' days')::interval
       ORDER BY rp.target_date ASC`;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    const query = `SELECT f.finding_id, f.title, f.severity, f.created_at, f.status,
         'finding_sla' AS deadline_type,
         EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_open
       FROM "${schema}".findings f
       WHERE f.deleted_at IS NULL
         AND f.status = 'open'
         AND f.created_at <= NOW() - INTERVAL '21 days'
       ORDER BY f.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    const query = `SELECT audit_id, title, planned_end, status, 'audit_ending' AS deadline_type
       FROM "${schema}".audits
       WHERE deleted_at IS NULL
         AND status IN ('planned','in_progress')
         AND planned_end IS NOT NULL
         AND planned_end <= NOW() + ($1 || ' days')::interval
       ORDER BY planned_end ASC`;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    const query = `SELECT
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
     FROM "${schema}".audit_universe au
     LEFT JOIN "${schema}".audit_risk_scores ars ON ars.universe_id = au.id
     WHERE au.deleted_at IS NULL
     GROUP BY au.id, au.name, au.entity_type, au.department, au.risk_rating
     ORDER BY weighted_score DESC`;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    const query = `
      SELECT
        u.id, u.entity_name, u.entity_type, u.risk_rating,
        u.last_audited_at, u.audit_frequency_months,
        COALESCE(rs.weighted_score, 0)            AS weighted_score,
        COALESCE(rs.inherent_risk, 0)              AS inherent_risk,
        COALESCE(rs.control_effectiveness, 0)      AS control_effectiveness,
        COALESCE(rs.materiality, 0)                AS materiality,
        (SELECT COUNT(*)::int FROM "${schema}".risks r
         WHERE r.deleted_at IS NULL
           AND r.status = 'open')                  AS open_risks_count,
        (SELECT AVG(r.likelihood * r.impact)::numeric(5,2)
         FROM "${schema}".risks r
         WHERE r.deleted_at IS NULL)               AS avg_risk_score
      FROM "${schema}".audit_universe u
      LEFT JOIN (
        SELECT universe_id,
          AVG(score * weight)::numeric(5,2)                                      AS weighted_score,
          MAX(CASE WHEN risk_factor = 'inherent_risk'          THEN score END)   AS inherent_risk,
          MAX(CASE WHEN risk_factor = 'control_effectiveness'  THEN score END)   AS control_effectiveness,
          MAX(CASE WHEN risk_factor = 'materiality'            THEN score END)   AS materiality
        FROM "${schema}".audit_risk_scores
        GROUP BY universe_id
      ) rs ON rs.universe_id = u.id
      WHERE u.deleted_at IS NULL
      ORDER BY COALESCE(rs.weighted_score, 0) DESC
    `;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    const query = `SELECT
       CASE WHEN SUM(weight) > 0
            THEN ROUND((SUM(score * weight) / SUM(weight))::numeric, 2)
            ELSE 0
       END AS weighted_score,
       COUNT(*)::int AS factor_count,
       SUM(weight)::numeric AS total_weight
     FROM "${schema}".audit_risk_scores
     WHERE universe_id = $1`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_risk_scores
       (id, universe_id, risk_factor, score, weight, assessed_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (universe_id, risk_factor)
     DO UPDATE SET score = $4, weight = $5, assessed_by = $6, updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_risk_scores
     WHERE universe_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail WHERE timestamp < $1`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_prep_checklists WHERE checklist_id = $1`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_prep_checklists ORDER BY updated_at DESC LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_prep_checklists WHERE checklist_id = $1`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_prep_checklists SET status = $1, updated_at = NOW() WHERE checklist_id = $2`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_prep_checklists
     SET items = $1, ready_count = $2, gap_count = $3, updated_at = NOW()
     WHERE checklist_id = $4`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_prep_checklists SET items = $1, gap_count = $2, updated_at = NOW() WHERE checklist_id = $3`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_prep_checklists
       (framework_id, audit_team_lead_id, items, gap_count, ready_count)
     VALUES ($1, $2, $3, $4, $5) RETURNING checklist_id, created_at, updated_at`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    const query = `SELECT result FROM "${schema}".control_tests
       WHERE control_id = $1 ORDER BY tested_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'approved') AS approved,
              MAX(updated_at) AS last_updated
       FROM "${schema}".evidence WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, control_ref FROM "${schema}".controls
     WHERE framework_id = $1 ORDER BY control_ref`;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_requests
           (request_id, control_id, title, status, requested_by, due_date, created_at)
         VALUES ($1, $2, $3, 'pending', 'system',
           NOW() + INTERVAL '14 days', NOW())
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    const query = `SELECT control_id, control_title_en FROM "${schema}".controls
       WHERE deleted_at IS NULL LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_schedules WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_schedules
     WHERE enabled = true AND next_run_at <= NOW()
     ORDER BY next_run_at ASC`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_schedules
     SET enabled = NOT enabled, updated_at = NOW()
     WHERE id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".audit_schedules WHERE id = $1 RETURNING id`;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_schedules
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_schedules
       (id, title, description, audit_type, universe_id, frequency,
        cron_expression, next_run_at, enabled, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_schedules
     ORDER BY next_run_at ASC NULLS LAST, created_at DESC`;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    const query = `SELECT
       user_id,
       COUNT(*)::int AS assignment_count,
       COALESCE(SUM(hours_planned), 0)::numeric AS total_hours_planned,
       COALESCE(SUM(hours_actual), 0)::numeric AS total_hours_actual
     FROM "${schema}".audit_team_members
     WHERE deleted_at IS NULL
     GROUP BY user_id
     ORDER BY total_hours_actual DESC`;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_team_members
     SET hours_actual = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_team_members
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_team_members
       (id, audit_id, user_id, role, hours_planned, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_team_members
     WHERE audit_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audits
     SET audit_type = COALESCE($2, audit_type),
         scope = COALESCE($3, scope),
         methodology = COALESCE($4, methodology),
         description = COALESCE($5, description)
         ${durationClause},
         updated_at = NOW()
     WHERE audit_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query204(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_templates
     WHERE template_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query205(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_templates
     WHERE template_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query206(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_templates
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE template_id = $1 AND deleted_at IS NULL RETURNING template_id`;
    return safeQuery(query, args);
  }

  static async query207(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_templates
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE template_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query208(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_templates
       (template_id, template_name, audit_type, description, scope_template,
        methodology, checklist, default_duration_days, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW()) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query209(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_templates
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query210(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_universe
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`;
    return safeQuery(query, args);
  }

  static async query211(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_universe
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query212(schema: string, args: unknown[]) {
    const query = q;
    return safeQuery(query, args);
  }

  static async query213(schema: string, args: unknown[]) {
    const query = `SELECT u.*,
         bu.name AS business_unit_name,
         dept.name AS department_name,
         loc.name AS location_name
       FROM "${schema}".audit_universe u
       LEFT JOIN "${schema}".business_units bu ON bu.id::text = u.business_unit_id AND bu.deleted_at IS NULL
       LEFT JOIN "${schema}".departments dept ON dept.id::text = u.department_id AND dept.deleted_at IS NULL
       LEFT JOIN "${schema}".locations loc ON loc.id::text = u.location_id AND loc.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query214(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_universe
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query215(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_universe
       (id, name, entity_type, description, owner_id, risk_rating,
        last_audited_at, audit_frequency_months, department, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query216(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_universe
     WHERE id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query217(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_universe
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query218(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total_tests,
       COUNT(*) FILTER (WHERE result = 'effective')::int AS effective_count,
       COUNT(*) FILTER (WHERE result = 'ineffective')::int AS ineffective_count,
       COUNT(*) FILTER (WHERE result = 'partially_effective')::int AS partial_count,
       CASE WHEN COUNT(*) > 0
         THEN ROUND(COUNT(*) FILTER (WHERE result = 'effective')::numeric / COUNT(*)::numeric * 100, 1)
         ELSE 0
       END AS effectiveness_pct
     FROM "${schema}".capa_effectiveness_tests`;
    return safeQuery(query, args);
  }

  static async query219(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".findings SET status = 'open', updated_at = NOW()
       WHERE finding_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query220(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".capa_effectiveness_tests
       (test_id, capa_id, finding_id, tester_id, result, evidence_notes, reopen_finding, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW()) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query221(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".capa_effectiveness_tests
     WHERE capa_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query222(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
       FROM "${schema}".closure_reviews
       WHERE outcome = 'closed' AND review_date >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query223(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_audits,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_audits,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS active_audits
       FROM "${schema}".audits WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query224(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
       FROM "${schema}".remediation_plans
       WHERE target_date < NOW() AND status NOT IN ('completed','closed') AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query225(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
       FROM "${schema}".findings
       WHERE severity IN ('critical','high') AND status = 'open' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query226(schema: string, args: unknown[]) {
    const query = q;
    return safeQuery(query, args);
  }

  static async query227(schema: string, args: unknown[]) {
    const query = `SELECT
         DATE_TRUNC('quarter', created_at) AS quarter,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'overdue' OR (target_date < NOW() AND status != 'completed'))::int AS overdue
       FROM "${schema}".remediation_plans WHERE deleted_at IS NULL
       GROUP BY quarter ORDER BY quarter DESC LIMIT 8`;
    return safeQuery(query, args);
  }

  static async query228(schema: string, args: unknown[]) {
    const query = `SELECT
         DATE_TRUNC('quarter', created_at) AS quarter,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE severity IN ('critical','high'))::int AS critical_high,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM "${schema}".findings WHERE deleted_at IS NULL
       GROUP BY quarter ORDER BY quarter DESC LIMIT 8`;
    return safeQuery(query, args);
  }

  static async query229(schema: string, args: unknown[]) {
    const query = `SELECT
         DATE_TRUNC('quarter', created_at) AS quarter,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM "${schema}".audits WHERE deleted_at IS NULL
       GROUP BY quarter ORDER BY quarter DESC LIMIT 8`;
    return safeQuery(query, args);
  }

  static async query230(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_closed,
         COUNT(*) FILTER (WHERE cr.review_date <= f.created_at + INTERVAL '90 days')::int AS within_sla
       FROM "${schema}".closure_reviews cr
       JOIN "${schema}".findings f ON f.finding_id = cr.finding_id
       WHERE cr.deleted_at IS NULL AND cr.outcome = 'closed'`;
    return safeQuery(query, args);
  }

  static async query231(schema: string, args: unknown[]) {
    const query = `SELECT outcome, COUNT(*)::int AS c
       FROM "${schema}".closure_reviews WHERE deleted_at IS NULL GROUP BY outcome`;
    return safeQuery(query, args);
  }

  static async query232(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS c
       FROM "${schema}".remediation_plans WHERE deleted_at IS NULL GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query233(schema: string, args: unknown[]) {
    const query = `SELECT status, severity, COUNT(*)::int AS c
       FROM "${schema}".findings WHERE deleted_at IS NULL GROUP BY status, severity`;
    return safeQuery(query, args);
  }

  static async query234(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS c
       FROM "${schema}".audits WHERE deleted_at IS NULL GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query235(schema: string, args: unknown[]) {
    const query = `SELECT content FROM "${schema}".policies WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query236(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, version, status, frameworks, owner, created_at
     FROM "${schema}".policies
     WHERE status != 'draft'
     ${policyDateFilter}
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query237(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, frameworks, test_status, last_tested_at
     FROM "${schema}".controls
     WHERE deleted_at IS NULL AND test_status IS NOT NULL AND test_status != 'not_tested'${controlsClearanceFilter}
     ORDER BY last_tested_at DESC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query238(schema: string, args: unknown[]) {
    const query = `SELECT e.evidence_id, e.title, e.file_path, e.control_id, e.submitted_at,
            c.title AS control_title, c.frameworks
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".controls c ON e.control_id = c.control_id
     WHERE e.deleted_at IS NULL ${dateFilter}${evidenceClearanceFilter}
     ORDER BY e.submitted_at DESC`;
    return safeQuery(query, args);
  }

  static async query239(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks
     WHERE linked_entity_type = 'assessment_item'
       AND linked_entity_id IN (
         SELECT item_id::text FROM "${schema}".assessment_items WHERE assessment_id = $1
       )
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query240(schema: string, args: unknown[]) {
    const query = evidenceSql;
    return safeQuery(query, args);
  }

  static async query241(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assessment_items WHERE assessment_id = $1 ORDER BY control_node_id`;
    return safeQuery(query, args);
  }

  static async query242(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assessments WHERE assessment_id = $1`;
    return safeQuery(query, args);
  }

  static async query243(schema: string, args: unknown[]) {
    const query = `SELECT qr.*, a.title AS audit_title
     FROM "${schema}".audit_qa_reviews qr
     LEFT JOIN "${schema}".audits a ON a.audit_id = qr.audit_id
     WHERE qr.status = 'pending'
     ORDER BY qr.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query244(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_qa_reviews
     SET status = 'rejected', comments = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query245(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".audit_qa_reviews
     SET status = 'approved', reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query246(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_qa_reviews
       (id, audit_id, reviewer_id, review_type, scope, checklist, comments, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query247(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_qa_reviews
     WHERE audit_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query248(schema: string, args: unknown[]) {
    const query = `SELECT
       overall_rating,
       COUNT(*)::int AS count
     FROM "${schema}".audit_ratings
     GROUP BY overall_rating
     ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query249(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_ratings
       (id, audit_id, overall_rating, effectiveness_score, compliance_score,
        risk_score, comments, rated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (audit_id)
     DO UPDATE SET
       overall_rating = $3,
       effectiveness_score = $4,
       compliance_score = $5,
       risk_score = $6,
       comments = $7,
       rated_by = $8,
       updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query250(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".audit_ratings
     WHERE audit_id = $1`;
    return safeQuery(query, args);
  }

}
