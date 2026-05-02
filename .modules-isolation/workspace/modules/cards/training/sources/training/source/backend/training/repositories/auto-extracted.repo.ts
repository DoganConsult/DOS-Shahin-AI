// @ts-nocheck
// Auto-extracted Training repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class TrainingAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".anonymous_reports
     SET status = COALESCE($2, status),
         assigned_to = COALESCE($3, assigned_to),
         resolution_notes = COALESCE($4, resolution_notes),
         updated_at = now()
     WHERE report_id = $1::uuid RETURNING *`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT tracking_code, category, severity, status, created_at, resolution_notes
     FROM "${schema}".anonymous_reports WHERE tracking_code = $1`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".anonymous_reports
     (tracking_code, category, description, severity, evidence_description, status)
     VALUES ($1, $2, $3, $4, $5, 'submitted')
     RETURNING tracking_code, report_id, status, created_at`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".assessment_campaign_responses
     SET evidence_ids = $2::jsonb, updated_at = now()
     WHERE response_id = $1::uuid RETURNING *`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assessment_campaign_responses WHERE campaign_id = $1::uuid`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assessment_campaign_responses WHERE campaign_id = $1::uuid`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assessment_delegations
     WHERE campaign_id = $1::uuid ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".assessment_delegations
     (campaign_id, delegator, delegate, section_ids, status)
     VALUES ($1::uuid, $2, $3, $4::jsonb, 'pending') RETURNING *`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT respondent, status, submitted_at
     FROM "${schema}".assessment_campaign_responses WHERE campaign_id = $1::uuid`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".assessment_campaigns WHERE campaign_id = $1::uuid`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `
    SELECT ac.*,
      (SELECT COUNT(*)::int FROM "${schema}".assessment_campaign_responses acr
       WHERE acr.campaign_id = ac.campaign_id) AS response_count,
      jsonb_array_length(COALESCE(ac.target_respondents, '[]'::jsonb)) AS target_count
    FROM "${schema}".assessment_campaigns ac
    ORDER BY ac.created_at DESC
  `;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".assessment_campaigns
     (title, description, template_id, target_respondents, deadline, status, created_by)
     VALUES ($1, $2, $3::uuid, $4::jsonb, $5::date, 'active', $6) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".action_items
         (vendor_id, questionnaire_id, title, description, priority, status, due_date)
       VALUES ($1, $2, $3, $4, $5, 'open', $6)
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, title, questions FROM "${schema}".questionnaires
     WHERE questionnaire_id = $1`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".questionnaires
     SET evaluation = $1
     WHERE questionnaire_id = $2`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".questionnaires WHERE questionnaire_id = $1`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM "${schema}".external_user_scopes
     WHERE entity_type = 'vendor' AND entity_id = $1 AND role = 'vendor_contact'
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".questionnaires
     SET status = 'distributed', distributed_at = $1, due_date = $2
     WHERE questionnaire_id = $3`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".questionnaires WHERE questionnaire_id = $1`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".questionnaires
       (vendor_id, title, framework_refs, questions, status, created_by)
     VALUES ($1, $2, $3, $4, 'draft', $5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT title, status, evaluation, created_at
     FROM "${schema}".questionnaires
     WHERE vendor_id = $1
     ORDER BY created_at DESC LIMIT 3`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, category, risk_tier
     FROM "${schema}".vendors WHERE vendor_id = $1`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT i.instrument_id, i.name_en, i.name_ar, i.type, i.mandatory,
            i.sectors, i.tags, i.summary_en, i.summary_ar, i.status,
            r.regulator_id, r.name_en AS reg_name_en, r.name_ar AS reg_name_ar,
            r.acronym AS reg_acronym, r.category AS reg_category, r.sectors AS reg_sectors,
            COALESCE(ctrl.control_count, 0) AS control_count
     FROM instruments i
     JOIN regulators r ON r.regulator_id = i.regulator_id
     LEFT JOIN (
       SELECT instrument_id, COUNT(*)::int AS control_count
       FROM instrument_structure
       WHERE level >= 2
       GROUP BY instrument_id
     ) ctrl ON ctrl.instrument_id = i.instrument_id
     WHERE i.status = 'active'
     ORDER BY i.mandatory DESC, ctrl.control_count DESC`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT i.instrument_id, i.name_en, i.name_ar, i.type, i.mandatory, i.sectors,
            r.name_en AS reg_name, r.acronym AS reg_acronym, r.regulator_id,
            COALESCE(c.cnt, 0) AS control_count
     FROM instruments i
     JOIN regulators r ON r.regulator_id = i.regulator_id
     LEFT JOIN (SELECT instrument_id, COUNT(*)::int AS cnt FROM instrument_structure WHERE level >= 2 GROUP BY instrument_id) c
       ON c.instrument_id = i.instrument_id
     WHERE i.status = 'active'
     ORDER BY i.mandatory DESC, i.name_en`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT sector_id, name_en, name_ar, applicable_regulators, applicable_frameworks FROM sectors WHERE sector_id = $1`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT sector_id, applicable_regulators, applicable_frameworks FROM sectors`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".maturity_assessments
       SET overall_score = $1, domain_scores = $2, status = 'completed', completed_at = NOW()
       WHERE assessment_id = $3`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT r.question_id, r.answer, r.score,
            q.category, q.domain, q.weight, q.text_en, q.text_ar, q.tags
     FROM "${schema}".maturity_responses r
     JOIN maturity_questions q ON q.question_id = r.question_id
     WHERE r.assessment_id = $1
     ORDER BY q.sort_order`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `
      SELECT
        CASE
          WHEN 'nca' = ANY(tc.tags) THEN 'NCA'
          WHEN 'sama' = ANY(tc.tags) THEN 'SAMA'
          WHEN 'pdpl' = ANY(tc.tags) OR 'sdaia' = ANY(tc.tags) THEN 'SDAIA/PDPL'
          WHEN 'cma' = ANY(tc.tags) THEN 'CMA'
          WHEN 'cst' = ANY(tc.tags) OR 'citc' = ANY(tc.tags) THEN 'CST/CITC'
          WHEN 'zatca' = ANY(tc.tags) THEN 'ZATCA'
          WHEN 'moh' = ANY(tc.tags) THEN 'MOH'
          WHEN 'sfda' = ANY(tc.tags) THEN 'SFDA'
          WHEN 'hrsd' = ANY(tc.tags) THEN 'HRSD'
          WHEN 'gosi' = ANY(tc.tags) THEN 'GOSI'
          WHEN 'moc' = ANY(tc.tags) THEN 'MOC'
          WHEN 'gac' = ANY(tc.tags) THEN 'GAC'
          WHEN 'ndmo' = ANY(tc.tags) THEN 'NDMO'
          ELSE 'Other'
        END AS regulator,
        COUNT(DISTINCT tc.content_id) AS courses,
        SUM(tc.duration_minutes) AS total_minutes,
        COUNT(DISTINCT a.assignment_id) AS total_assigned,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed')) AS completed,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status = 'overdue') AS overdue,
        CASE WHEN COUNT(DISTINCT a.assignment_id) > 0
          THEN ROUND(COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed'))::numeric
            / COUNT(DISTINCT a.assignment_id) * 100)
          ELSE 0 END AS completion_pct
      FROM "${schema}".training_content tc
      LEFT JOIN "${schema}".training_assignments a ON a.content_id = tc.content_id
      WHERE tc.deleted_at IS NULL AND tc.is_active = TRUE AND tc.tags IS NOT NULL AND array_length(tc.tags, 1) > 0
      GROUP BY regulator
      HAVING COUNT(DISTINCT tc.content_id) > 0
      ORDER BY regulator
    `;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `
      SELECT
        ctm.framework_code,
        COUNT(DISTINCT ctm.control_code) AS controls_with_training,
        COUNT(DISTINCT ctm.content_id) AS training_courses,
        COUNT(DISTINCT a.assignment_id) AS total_assignments,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed')) AS completed,
        CASE WHEN COUNT(DISTINCT a.assignment_id) > 0
          THEN ROUND(COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed'))::numeric
            / COUNT(DISTINCT a.assignment_id) * 100)
          ELSE 0 END AS completion_pct,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status = 'overdue') AS overdue
      FROM "${schema}".control_training_mappings ctm
      LEFT JOIN "${schema}".training_assignments a ON a.content_id = ctm.content_id
      WHERE ctm.deleted_at IS NULL AND ctm.is_active = TRUE
      GROUP BY ctm.framework_code
      ORDER BY ctm.framework_code
    `;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `
    SELECT stp.path_order, stp.is_mandatory, stp.due_days, stp.role_scope,
           tc.content_id, tc.code, tc.title, tc.title_ar, tc.category, tc.content_type,
           tc.duration_minutes, tc.passing_score, tc.recertification_days, tc.description
    FROM "${schema}".sector_training_paths stp
    JOIN "${schema}".training_content tc ON tc.content_id = stp.content_id AND tc.is_active = TRUE AND tc.deleted_at IS NULL
    WHERE stp.sector_code = 'SEC-KSA-DEFAULT'
    ORDER BY stp.path_order ASC
  `;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `
    SELECT stp.path_order, stp.is_mandatory, stp.due_days, stp.role_scope,
           tc.content_id, tc.code, tc.title, tc.title_ar, tc.category, tc.content_type,
           tc.duration_minutes, tc.passing_score, tc.recertification_days, tc.description
    FROM "${schema}".sector_training_paths stp
    JOIN "${schema}".training_content tc ON tc.content_id = stp.content_id AND tc.is_active = TRUE AND tc.deleted_at IS NULL
    WHERE stp.sector_code = $1
    ORDER BY stp.path_order ASC
  `;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".training_content SET ${sets.join(', ')} WHERE content_id = $${idx} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".training_certifications
     SET revoked = TRUE, revoked_at = NOW(), revoked_reason = $1, updated_at = NOW()
     WHERE certificate_id = $2 AND revoked = FALSE
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".training_certifications
     WHERE revoked = FALSE AND valid_until IS NOT NULL
       AND valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
     ORDER BY valid_until ASC`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".training_assignments
     SET status = 'overdue', updated_at = NOW()
     WHERE status IN ('assigned','in_progress') AND due_date < CURRENT_DATE AND due_date IS NOT NULL
     RETURNING assignment_id, user_id`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".training_assignments a
     JOIN "${schema}".training_content c ON c.content_id = a.content_id
     WHERE c.is_mandatory = TRUE AND a.status NOT IN ('completed','passed','waived')`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status IN ('completed','passed')) AS completed,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE status IN ('assigned','in_progress')) AS pending
     FROM "${schema}".training_assignments`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".phishing_user_results SET remediation_assigned = TRUE WHERE result_id = $1`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT auto_assign_training, remediation_content_id FROM "${schema}".phishing_campaigns
         WHERE phishing_id = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".phishing_user_results (phishing_id, user_id, user_action${timeField ? `, ${timeField}` : ''})
     VALUES ($1,$2,$3${timeField ? `, NOW()` : ''}) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".phishing_campaigns SET status = 'active', launched_at = NOW(), updated_at = NOW() WHERE phishing_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".phishing_campaigns WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".phishing_campaigns
       (title, campaign_id, template_type, difficulty, email_subject, email_body, target_user_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".training_assignments
       (content_id, user_id, campaign_id, assigned_by, due_date, passing_score)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT DO NOTHING RETURNING *`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT passing_score FROM "${schema}".training_content WHERE content_id = $1`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".training_campaigns SET status = 'active', launched_at = NOW(), updated_at = NOW() WHERE campaign_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".training_campaigns
       (title, title_ar, campaign_type, mandatory, start_date, end_date, content_ids, owner_id, target_roles, target_departments)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".training_content
       (code, title, title_ar, content_type, category, duration_minutes, is_mandatory, passing_score, author_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".training_programs ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".training_programs ${where}`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".training_programs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".training_programs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".training_programs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (
             WHERE status != 'completed'
               AND due_date IS NOT NULL
               AND due_date < NOW()
           )::int AS overdue
         FROM "${schema}".training_assignments`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (
             WHERE status != 'completed'
               AND due_date IS NOT NULL
               AND due_date < NOW()
           )::int AS overdue,
           COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at)) / 86400)
               FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL AND assigned_at IS NOT NULL),
             NULL
           )::numeric AS avg_completion_days,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_assigned
         FROM "${schema}".training_assignments`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT EXISTS(SELECT 1 FROM "${schema}".risks WHERE is_training = TRUE) as has_data`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".${table} WHERE is_training = TRUE`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT role_code)::int AS total_roles,
              COUNT(DISTINCT role_code) FILTER (
                WHERE role_code IN (SELECT DISTINCT role_code FROM "${schema}".training_assignments WHERE status = 'completed')
              )::int AS covered_roles
       FROM "${schema}".user_roles`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT course_id, title, description, category FROM "${schema}".training_courses
       WHERE deleted_at IS NULL AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title, c.effectiveness_score
       FROM "${schema}".controls c
       WHERE c.deleted_at IS NULL AND c.effectiveness_score < 40
         AND c.status = 'active'
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.approved_at
       FROM "${schema}".policies p
       WHERE p.deleted_at IS NULL AND p.status = 'approved'
         AND p.approved_at > NOW() - INTERVAL '60 days'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".training_policy_links tpl WHERE tpl.policy_id = p.policy_id
         )`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT i.incident_id, i.title, i.category, i.severity, i.lessons_learned
       FROM "${schema}".incidents i
       WHERE i.deleted_at IS NULL AND i.lessons_learned IS NOT NULL
         AND i.lessons_learned != '' AND i.status IN ('resolved', 'closed')
         AND i.resolved_at > NOW() - INTERVAL '90 days'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".training_incident_links til WHERE til.incident_id = i.incident_id
         )`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_action_items
            (title_en, title_ar, description, priority, status, source_type, board_attention, created_at, updated_at)
           VALUES ($1, $2, $3, 'medium', 'open', 'training', FALSE, NOW(), NOW())
           RETURNING action_id`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".governance_action_items
            (title_en, title_ar, description, priority, status, source_type, board_attention, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'open', 'training', $5, NOW(), NOW())
           RETURNING action_id`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".risks SET residual_score = $1, updated_at = NOW() WHERE risk_id = $2`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, residual_score FROM "${schema}".risks
           WHERE category = 'competency' AND status != 'closed' AND deleted_at IS NULL
           LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".evidence_items
             (title, description, source_type, source_id, status, collected_by, collected_at)
           VALUES ($1, $2, 'training', $3, 'collected', $4, NOW())
           ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users
           WHERE tenant_id = $1 AND role = 'risk_manager' AND status = 'active' LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT content_id, title FROM "${schema}".training_content
             WHERE is_mandatory = TRUE AND is_active = TRUE AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `SELECT sectors FROM "${schema}".workspace_profile WHERE tenant_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users
             WHERE tenant_id = $1 AND department_id = $2 AND status = 'active' LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT assigned_to, department_id FROM "${schema}".incidents
           WHERE incident_id = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_reviews
           WHERE evidence_id = $1 AND outcome = 'rejected'`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT assigned_to FROM "${schema}".audit_findings WHERE finding_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT cause_type FROM "${schema}".finding_root_causes
           WHERE finding_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT owner FROM "${schema}".risks WHERE risk_id = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `
      SELECT COUNT(*)::int AS cnt FROM "${schema}".training_certifications
      WHERE revoked = FALSE AND valid_until IS NOT NULL
        AND valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 * INTERVAL '1 day'
    `;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `
      SELECT COUNT(*)::int AS cnt FROM "${schema}".training_assignments a
      JOIN "${schema}".training_content c ON c.content_id = a.content_id
      WHERE c.is_mandatory = TRUE AND a.status = 'overdue'
    `;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `
      SELECT f.framework_code, f.framework_name_en AS name,
        COUNT(DISTINCT a.assignment_id) AS total_assignments,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed')) AS completed,
        CASE WHEN COUNT(DISTINCT a.assignment_id) > 0
          THEN ROUND(COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed'))::numeric
            / COUNT(DISTINCT a.assignment_id) * 100)
          ELSE 0 END AS completion_pct
      FROM "${schema}".frameworks f
      LEFT JOIN "${schema}".controls c ON c.framework_id = f.framework_id AND c.deleted_at IS NULL
      LEFT JOIN "${schema}".training_content tc ON tc.category = 'compliance' AND tc.is_active = TRUE AND tc.deleted_at IS NULL
      LEFT JOIN "${schema}".training_assignments a ON a.content_id = tc.content_id
      WHERE f.deleted_at IS NULL
      GROUP BY f.framework_code, f.framework_name_en
      ORDER BY f.framework_code
    `;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT content_id, title FROM "${schema}".training_content
         WHERE category = 'general_awareness' AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY is_mandatory DESC, created_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT content_id, title FROM "${schema}".training_content
       WHERE category = $1 AND is_active = TRUE AND deleted_at IS NULL
       ORDER BY is_mandatory DESC, created_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT user_id FROM public.users
       WHERE tenant_id = $1 AND role = ANY($2::text[]) AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT responsible, accountable FROM "${schema}".raci_matrix WHERE domain = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".training_programs WHERE status = 'draft' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".training_programs WHERE status = 'overdue' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".training_programs WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'training' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'training','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

}
