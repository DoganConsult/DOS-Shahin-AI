// @ts-nocheck
// Auto-extracted Controls repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class ControlsAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_test_templates
         (name, description, control_type, test_steps, expected_evidence, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT id, name, description, control_type, test_steps,
              expected_evidence, created_at
         FROM "${schema}".control_test_templates
        ORDER BY name`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_categories
          SET ${setClauses.join(", ")}
        WHERE id = $${paramIdx}`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_categories (code, name_en, parent_category_id)
       VALUES ($1, $2, $3)
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT id, code, title_en, category_id
           FROM "${schema}".control_objectives
          ORDER BY code`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT id, code, name_en, parent_category_id
           FROM "${schema}".control_categories
          ORDER BY code`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".tenant_preferences (preference_key, preference_value)
       VALUES ('control_admin_settings', $1::jsonb)
       ON CONFLICT (preference_key)
       DO UPDATE SET preference_value = $1::jsonb, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT preference_value
         FROM "${schema}".tenant_preferences
        WHERE preference_key = 'control_admin_settings'
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT a.health_status, COUNT(*)::int AS cnt
           FROM "${schema}".control_automation_state a
           JOIN "${schema}".controls c ON c.control_id = a.control_id
          WHERE c.deleted_at IS NULL AND c.status = 'active'
          GROUP BY a.health_status`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT c.automation_level, COUNT(*)::int AS cnt
           FROM "${schema}".controls c
          WHERE c.deleted_at IS NULL AND c.status = 'active'
          GROUP BY c.automation_level`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".controls WHERE deleted_at IS NULL AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title, a.health_status, a.last_run_at
         FROM "${schema}".controls c
         JOIN "${schema}".control_automation_state a ON a.control_id = c.control_id
        WHERE c.deleted_at IS NULL
          AND a.health_status IN ('failing', 'degraded')
        ORDER BY a.last_run_at ASC NULLS FIRST`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_automation_state
          SET last_run_at = $1, last_run_result = $2, health_status = $3, updated_at = NOW()
        WHERE control_id = $4`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".controls
          SET automation_level = $1, updated_at = NOW()
        WHERE control_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_automation_state
         (control_id, automation_level, tool_name, tool_integration_id,
          next_run_at, alert_on_failure, health_status)
       VALUES ($1,$2,$3,$4,$5,$6,'unknown')
       ON CONFLICT (control_id) DO UPDATE SET
         automation_level     = EXCLUDED.automation_level,
         tool_name            = COALESCE(EXCLUDED.tool_name, control_automation_state.tool_name),
         tool_integration_id  = COALESCE(EXCLUDED.tool_integration_id, control_automation_state.tool_integration_id),
         next_run_at          = COALESCE(EXCLUDED.next_run_at, control_automation_state.next_run_at),
         alert_on_failure     = EXCLUDED.alert_on_failure,
         updated_at           = NOW()
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, automation_level, tool_name, tool_integration_id,
              last_run_at, last_run_result, next_run_at, health_status,
              alert_on_failure, updated_at
         FROM "${schema}".control_automation_state
        WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT
         cr.id AS request_id,
         cr.campaign_id,
         cc.name AS campaign_name,
         cr.control_id,
         c.title AS control_title,
         cr.assigned_to,
         cc.due_date,
         EXTRACT(DAY FROM NOW() - cc.due_date)::int AS days_overdue
       FROM "${schema}".control_certification_requests cr
       JOIN "${schema}".control_certification_campaigns cc ON cc.id = cr.campaign_id
       LEFT JOIN "${schema}".controls c ON c.control_id = cr.control_id
       WHERE cr.status = 'pending'
         AND cc.due_date < NOW()
       ORDER BY days_overdue DESC`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_certification_campaigns
          SET status = 'signed_off',
              signed_off_by = $1,
              signed_off_at = NOW()
        WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_certification_requests
          SET response = $1,
              comments = $2,
              assigned_to = $3,
              status = 'completed',
              responded_at = NOW()
        WHERE id = $4`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT cr.id, cr.campaign_id, cr.control_id, c.title AS control_title,
                cr.assigned_to, cr.status, cr.response, cr.responded_at
           FROM "${schema}".control_certification_requests cr
           LEFT JOIN "${schema}".controls c ON c.control_id = cr.control_id
          WHERE cr.campaign_id = $1
          ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT id, name, description, status, due_date, created_by, created_at,
                0::int AS total_requests, 0::int AS completed_requests
           FROM "${schema}".control_certification_campaigns
          WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_certification_requests
           (campaign_id, control_id, assigned_to, status)
         SELECT v.campaign_id, v.control_id, c.owner_user_id, 'pending'
         FROM (VALUES ${valueClauses.join(", ")}) AS v(campaign_id, control_id)
         LEFT JOIN "${schema}".controls c ON c.control_id = v.control_id`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_certification_campaigns
         (name, description, status, due_date, created_by)
       VALUES ($1, $2, 'open', $3, $4)
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT
         cc.id, cc.name, cc.description, cc.status, cc.due_date,
         cc.created_by, cc.created_at,
         COUNT(cr.id)::int AS total_requests,
         COUNT(cr.id) FILTER (WHERE cr.status = 'completed')::int AS completed_requests
       FROM "${schema}".control_certification_campaigns cc
       LEFT JOIN "${schema}".control_certification_requests cr ON cr.campaign_id = cc.id
       GROUP BY cc.id
       ORDER BY cc.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_issues
          SET status = 'retest_requested',
              updated_at = NOW()
        WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_closure_reviews
         (deficiency_id, control_id, reviewer_id, decision, comments, reviewed_at)
       VALUES ($1, $2, $3, 'approved', $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_issues
          SET status = 'closed',
              resolution_note = $1,
              closed_by = $2,
              closed_at = NOW()
        WHERE id = $3`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT id FROM "${schema}".control_retests
        WHERE control_id = $1
          AND result = 'pass'
        ORDER BY tested_at DESC
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT control_id FROM "${schema}".control_issues WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_actions
         (control_id, title, status, priority, assigned_to, due_date)
       VALUES ($1, $2, 'open', $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT control_id FROM "${schema}".control_issues WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT cf.failure_id, cf.control_id, cf.failure_type, cf.severity,
                cf.detected_at, cf.resolved_at, cf.resolution_note
           FROM "${schema}".control_failures cf
           JOIN "${schema}".control_issues ci ON ci.control_id = cf.control_id
          WHERE ci.id = $1
          ORDER BY cf.detected_at DESC
          LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT ca.action_id, ca.control_id, ca.title, ca.status,
                ca.priority, ca.assigned_to, ca.due_date, ca.created_at
           FROM "${schema}".control_actions ca
           JOIN "${schema}".control_issues ci ON ci.control_id = ca.control_id
          WHERE ci.id = $1
          ORDER BY ca.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT ci.id, ci.control_id, c.title AS control_title,
                ci.severity, ci.status, ci.assigned_to, ci.due_date,
                ci.description, ci.created_at
           FROM "${schema}".control_issues ci
           LEFT JOIN "${schema}".controls c ON c.control_id = ci.control_id
          WHERE ci.id = $1`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_issues
         (control_id, severity, status, description, assigned_to, due_date, created_by)
       VALUES ($1, $2, 'open', $3, $4, $5, $6)
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT ci.id, ci.control_id, c.title AS control_title,
              ci.severity, ci.status, ci.assigned_to, ci.due_date,
              ci.description, ci.created_at
         FROM "${schema}".control_issues ci
         LEFT JOIN "${schema}".controls c ON c.control_id = ci.control_id
        WHERE 1=1 ${whereClause}
        ORDER BY
          CASE ci.severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          ci.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title,
              dm.design_rationale, dm.implementation_guidance,
              dm.test_approach, dm.expected_outcome,
              dm.pass_criteria, dm.fail_criteria
         FROM "${schema}".controls c
         LEFT JOIN "${schema}".control_design_metadata dm ON dm.control_id = c.control_id
        WHERE c.deleted_at IS NULL
          AND c.status IN ('active', 'under_review')
        ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title
         FROM "${schema}".controls c
        WHERE c.deleted_at IS NULL
          AND c.status IN ('active', 'under_review')
          AND NOT EXISTS (
            SELECT 1 FROM "${schema}".control_design_metadata dm WHERE dm.control_id = c.control_id
          )
        ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_design_metadata
         (control_id, design_rationale, implementation_guidance, test_approach,
          expected_outcome, pass_criteria, fail_criteria, automation_notes, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (control_id) DO UPDATE SET
         design_rationale       = COALESCE(EXCLUDED.design_rationale, control_design_metadata.design_rationale),
         implementation_guidance = COALESCE(EXCLUDED.implementation_guidance, control_design_metadata.implementation_guidance),
         test_approach          = COALESCE(EXCLUDED.test_approach, control_design_metadata.test_approach),
         expected_outcome       = COALESCE(EXCLUDED.expected_outcome, control_design_metadata.expected_outcome),
         pass_criteria          = COALESCE(EXCLUDED.pass_criteria, control_design_metadata.pass_criteria),
         fail_criteria          = COALESCE(EXCLUDED.fail_criteria, control_design_metadata.fail_criteria),
         automation_notes       = COALESCE(EXCLUDED.automation_notes, control_design_metadata.automation_notes),
         updated_by             = EXCLUDED.updated_by,
         updated_at             = NOW()
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT control_id, design_rationale, implementation_guidance, test_approach,
              expected_outcome, pass_criteria, fail_criteria, automation_notes,
              updated_at, updated_by
         FROM "${schema}".control_design_metadata
        WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".control_evidence_requirements
          WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT id, previous_status, new_status, changed_by, reason, created_at
           FROM "${schema}".control_status_history
          WHERE control_id = $1
          ORDER BY created_at DESC
          LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT id, design_score, operating_score, overall_score
           FROM "${schema}".control_effectiveness_scores
          WHERE control_id = $1
          ORDER BY created_at DESC
          LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".control_issues
          WHERE control_id = $1
            AND status NOT IN ('closed', 'resolved')`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT test_id, control_id, test_result, tester, notes,
                evidence_ref, tested_at
           FROM "${schema}".control_tests
          WHERE control_id = $1
          ORDER BY tested_at DESC
          LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".control_policy_links
          WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".control_obligation_mappings
          WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".control_risk_links
          WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT id, user_id, ownership_type, is_primary
           FROM "${schema}".control_owners
          WHERE control_id = $1
          ORDER BY is_primary DESC, ownership_type`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, description, status, control_type,
                owner, owner_team_id, test_status, last_tested_at,
                effectiveness_rating, is_sox, frequency, created_at, updated_at
           FROM "${schema}".controls
          WHERE control_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, last_tested_at,
              EXTRACT(DAY FROM NOW() - COALESCE(last_tested_at, created_at))::int AS days_overdue
         FROM "${schema}".controls
        WHERE deleted_at IS NULL
          AND status = 'active'
          AND (
            last_tested_at IS NULL AND created_at < NOW() - ($1 || ' days')::interval
            OR last_tested_at < NOW() - ($1 || ' days')::interval
          )
        ORDER BY days_overdue DESC`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title,
              es.design_score   AS latest_design_score,
              es.operating_score AS latest_operating_score,
              es.overall_score  AS latest_overall_score,
              es.rating         AS latest_rating,
              es.created_at     AS scored_at
         FROM "${schema}".controls c
         LEFT JOIN LATERAL (
           SELECT design_score, operating_score, overall_score, rating, created_at
             FROM "${schema}".control_effectiveness_scores
            WHERE control_id = c.control_id
            ORDER BY created_at DESC
            LIMIT 1
         ) es ON true
        WHERE c.deleted_at IS NULL
        ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT
         DATE_TRUNC('week', created_at)::text AS period,
         ROUND(AVG(design_score)::numeric, 2)::float   AS design_score,
         ROUND(AVG(operating_score)::numeric, 2)::float AS operating_score,
         ROUND(AVG(overall_score)::numeric, 2)::float  AS overall_score,
         MODE() WITHIN GROUP (ORDER BY rating)         AS rating
       FROM "${schema}".control_effectiveness_scores
      WHERE control_id = $1
        AND created_at > NOW() - ($2 || ' weeks')::interval
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY period ASC`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, design_score, operating_score, overall_score,
              rating, scored_by, scoring_period, notes, created_at
         FROM "${schema}".control_effectiveness_scores
        WHERE control_id = $1
        ORDER BY created_at DESC
        LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, design_score, operating_score, overall_score,
              rating, scored_by, scoring_period, notes, created_at
         FROM "${schema}".control_effectiveness_scores
        WHERE control_id = $1
        ORDER BY created_at DESC
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".controls
          SET effectiveness_rating = $1, updated_at = NOW()
        WHERE control_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_effectiveness_scores
         (control_id, design_score, operating_score, overall_score, rating,
          scored_by, scoring_period, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT control_id, snapshot_date, effectiveness_score,
              test_pass_rate, evidence_freshness_pct, created_at
         FROM "${schema}".control_health_snapshots
        WHERE control_id = $1
          AND snapshot_date >= CURRENT_DATE - ($2 || ' days')::interval
        ORDER BY snapshot_date DESC`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `WITH active_controls AS (
         SELECT control_id
           FROM "${schema}".controls
          WHERE deleted_at IS NULL
       ),
       effectiveness AS (
         SELECT DISTINCT ON (es.control_id)
                es.control_id,
                es.overall_score
           FROM "${schema}".control_effectiveness_scores es
           JOIN active_controls ac ON ac.control_id = es.control_id
          ORDER BY es.control_id, es.scored_at DESC
       ),
       test_rates AS (
         SELECT ct.control_id,
                CASE WHEN COUNT(*)::int = 0 THEN NULL
                     ELSE (COUNT(*) FILTER (WHERE ct.result = 'pass')::numeric
                           / COUNT(*)::numeric * 100)
                END AS pass_rate
           FROM "${schema}".control_tests ct
           JOIN active_controls ac ON ac.control_id = ct.control_id
          WHERE ct.tested_at >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY ct.control_id
       ),
       evidence_freshness AS (
         SELECT et.control_id,
                CASE WHEN COUNT(*)::int = 0 THEN NULL
                     ELSE (COUNT(*) FILTER (WHERE et.status = 'completed')::numeric
                           / COUNT(*)::numeric * 100)
                END AS freshness_pct
           FROM "${schema}".evidence_tasks et
           JOIN active_controls ac ON ac.control_id = et.control_id
          GROUP BY et.control_id
       )
       INSERT INTO "${schema}".control_health_snapshots
         (tenant_id, control_id, snapshot_date, effectiveness_score, test_pass_rate, evidence_freshness_pct, created_at)
       SELECT
         $1,
         ac.control_id,
         CURRENT_DATE,
         ROUND(e.overall_score::numeric, 2),
         ROUND(tr.pass_rate::numeric, 2),
         ROUND(ef.freshness_pct::numeric, 2),
         NOW()
       FROM active_controls ac
       LEFT JOIN effectiveness e ON e.control_id = ac.control_id
       LEFT JOIN test_rates tr ON tr.control_id = ac.control_id
       LEFT JOIN evidence_freshness ef ON ef.control_id = ac.control_id
       ON CONFLICT (tenant_id, control_id, snapshot_date)
       DO UPDATE SET
         effectiveness_score = EXCLUDED.effectiveness_score,
         test_pass_rate = EXCLUDED.test_pass_rate,
         evidence_freshness_pct = EXCLUDED.evidence_freshness_pct,
         created_at = EXCLUDED.created_at
       RETURNING control_id`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT
           DATE_TRUNC('week', created_at)::text AS week_start,
           ROUND(AVG(overall_score)::numeric, 2)::float AS avg_effectiveness
         FROM "${schema}".control_effectiveness_scores
         WHERE created_at > NOW() - INTERVAL '12 weeks'
         GROUP BY DATE_TRUNC('week', created_at)
         ORDER BY week_start ASC`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT
           COALESCE(control_type, 'manual') AS control_type,
           COUNT(*)::int AS count
         FROM "${schema}".controls
         WHERE deleted_at IS NULL
         GROUP BY COALESCE(control_type, 'manual')`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".control_issues
          WHERE status NOT IN ('closed', 'resolved')`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".controls
          WHERE deleted_at IS NULL
            AND (
              last_tested_at IS NULL AND created_at < NOW() - INTERVAL '90 days'
            )`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".control_failures
          WHERE detected_at > NOW() - INTERVAL '30 days'`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".controls
          WHERE deleted_at IS NULL
            AND (is_sox = true)`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".controls
          WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_status_history
         (control_id, previous_status, new_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".controls
          SET status = $1, updated_at = NOW(), updated_by = $2
        WHERE control_id = $3 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".controls
          SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
        WHERE control_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".controls
          SET ${setClauses.join(', ')}
        WHERE control_id = $${idx} AND deleted_at IS NULL
        RETURNING *`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".controls
         (title, description, objective, statement, control_type, automation_level,
          is_sox, key_control, frequency, owner, owner_team_id, operator_user_id,
          reviewer_user_id, framework_id, family_id, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft',$16)
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT control_id, tenant_id, title, description, objective, statement,
              status, control_type, automation_level, is_sox, key_control, frequency,
              owner, owner_team_id, operator_user_id, reviewer_user_id,
              test_status, last_tested_at, effectiveness_rating,
              framework_id, family_id, created_at, updated_at, created_by, updated_by, deleted_at
         FROM "${schema}".controls
        WHERE control_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".controls WHERE ${where}`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT control_id, tenant_id, title, description, objective, statement,
                status, control_type, automation_level, is_sox, key_control, frequency,
                owner, owner_team_id, operator_user_id, reviewer_user_id,
                test_status, last_tested_at, effectiveness_rating,
                framework_id, family_id, created_at, updated_at, created_by, updated_by, deleted_at
           FROM "${schema}".controls
          WHERE ${where}
          ORDER BY ${sortBy} ${sortDir}
          LIMIT $${idx} OFFSET $${idx + 1}`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".control_policy_links
          WHERE control_id = $1 AND policy_id = $2`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".control_obligation_mappings
          WHERE control_id = $1 AND obligation_id = $2`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".control_risk_links
          WHERE control_id = $1 AND risk_id = $2`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_policy_links (control_id, policy_id, link_type)
       VALUES ($1, $2, 'implements')
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_obligation_mappings (control_id, obligation_id, coverage_percent)
       VALUES ($1, $2, 100)
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_risk_links (control_id, risk_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT om.obligation_id,
                o.title AS obligation_title,
                ARRAY_AGG(om.control_id ORDER BY om.control_id) AS control_ids,
                COUNT(*)::int AS count
           FROM "${schema}".control_obligation_mappings om
           LEFT JOIN "${schema}".obligations o ON o.obligation_id = om.obligation_id
          GROUP BY om.obligation_id, o.title
         HAVING COUNT(*) > 1
          ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT LOWER(c.title) AS title,
                ARRAY_AGG(c.control_id ORDER BY c.control_id) AS control_ids,
                COUNT(*)::int AS count
           FROM "${schema}".controls c
          WHERE c.deleted_at IS NULL
          GROUP BY LOWER(c.title)
         HAVING COUNT(*) > 1
          ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT o.obligation_id, o.title
           FROM "${schema}".obligations o
          WHERE NOT EXISTS (
              SELECT 1 FROM "${schema}".control_obligation_mappings om
               WHERE om.obligation_id = o.obligation_id
            )
          ORDER BY o.title`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title
           FROM "${schema}".controls c
          WHERE c.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM "${schema}".control_risk_links rl
               WHERE rl.control_id = c.control_id
            )
          ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
         FROM "${schema}".controls c
        WHERE c.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM "${schema}".control_risk_links rl WHERE rl.control_id = c.control_id)
          AND NOT EXISTS (SELECT 1 FROM "${schema}".control_obligation_mappings om WHERE om.control_id = c.control_id)
          AND NOT EXISTS (SELECT 1 FROM "${schema}".control_policy_links pl WHERE pl.control_id = c.control_id)`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT control_id, policy_id, link_type
           FROM "${schema}".control_policy_links
          ORDER BY control_id`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT control_id, obligation_id, coverage_percent
           FROM "${schema}".control_obligation_mappings
          ORDER BY control_id`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT control_id, risk_id
           FROM "${schema}".control_risk_links
          ORDER BY control_id`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id)::int AS count
           FROM "${schema}".control_policy_links`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id)::int AS count
           FROM "${schema}".control_obligation_mappings`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT control_id)::int AS count
           FROM "${schema}".control_risk_links`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
           FROM "${schema}".controls
          WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_monitoring_alerts
          SET status = 'acknowledged',
              acknowledged_by = $1,
              acknowledged_at = NOW()
        WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, rule_id, alert_type, severity,
              message, status, acknowledged_by, acknowledged_at, created_at
         FROM "${schema}".control_monitoring_alerts
        ORDER BY created_at DESC
        LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_monitoring_rules
          SET enabled = false,
              deleted_at = NOW()
        WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_monitoring_rules
          SET ${setClauses.join(", ")}
        WHERE id = $${paramIdx}`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_monitoring_rules
         (control_id, name, description, rule_type, condition,
          threshold, severity, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       RETURNING id`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, name, description, rule_type,
              condition, threshold, severity, enabled, created_at, updated_at
         FROM "${schema}".control_monitoring_rules
        ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'sla_warning', $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'deficiency_created', $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'monitoring_breach', $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT owner_user_id FROM "${schema}".controls WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'certification_due', $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'control_test_failed', $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
         (recipient_id, notification_type, subject, body, metadata, created_at)
       VALUES ($1, 'control_test_due', $2, $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title, o.ownership_type
         FROM "${schema}".controls c
         JOIN "${schema}".control_owners o ON o.control_id = c.control_id
        WHERE c.deleted_at IS NULL AND o.user_id = $1
        ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title,
              ARRAY_AGG(o.ownership_type) FILTER (WHERE o.ownership_type IS NOT NULL) AS assigned_types
         FROM "${schema}".controls c
         LEFT JOIN "${schema}".control_owners o ON o.control_id = c.control_id
        WHERE c.deleted_at IS NULL AND c.status IN ('active', 'under_review')
        GROUP BY c.control_id, c.title
        ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, user_id, ownership_type, is_primary, assigned_at, assigned_by
         FROM "${schema}".control_owners
        WHERE control_id = $1 AND is_primary = true
        LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".control_owners WHERE id = $1 AND control_id = $2`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".control_owners (control_id, user_id, ownership_type, is_primary, assigned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (control_id, user_id, ownership_type) DO UPDATE
         SET is_primary = EXCLUDED.is_primary,
             assigned_by = EXCLUDED.assigned_by,
             assigned_at = NOW()
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".control_owners SET is_primary = false WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, user_id, ownership_type, is_primary, assigned_at, assigned_by
         FROM "${schema}".control_owners
        WHERE control_id = $1
        ORDER BY is_primary DESC, ownership_type`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title, c.status, c.owner,
              EXISTS(SELECT 1 FROM "${schema}".control_risk_links rl WHERE rl.control_id = c.control_id) AS has_risk_link,
              EXISTS(SELECT 1 FROM "${schema}".control_obligation_mappings om WHERE om.control_id = c.control_id) AS has_obligation_link,
              EXISTS(SELECT 1 FROM "${schema}".control_policy_links pl WHERE pl.control_id = c.control_id) AS has_policy_link
         FROM "${schema}".controls c
        WHERE c.deleted_at IS NULL
          AND (
            NOT EXISTS(SELECT 1 FROM "${schema}".control_risk_links rl WHERE rl.control_id = c.control_id)
            OR NOT EXISTS(SELECT 1 FROM "${schema}".control_obligation_mappings om WHERE om.control_id = c.control_id)
            OR NOT EXISTS(SELECT 1 FROM "${schema}".control_policy_links pl WHERE pl.control_id = c.control_id)
          )
        ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title, c.status, c.test_status,
              c.last_tested_at, c.effectiveness_rating,
              COUNT(ci.id) FILTER (WHERE ci.status NOT IN ('closed', 'resolved'))::int AS open_deficiencies
         FROM "${schema}".controls c
         LEFT JOIN "${schema}".control_issues ci ON ci.control_id = c.control_id
        WHERE c.is_sox = true AND c.deleted_at IS NULL
        GROUP BY c.control_id
        ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT ct.test_id, ct.control_id, c.title AS control_title,
              ct.test_result, ct.tester, ct.notes, ct.tested_at
         FROM "${schema}".control_tests ct
         JOIN "${schema}".controls c ON c.control_id = ct.control_id
        ${whereClause}
        ORDER BY ct.tested_at DESC`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT ci.id, ci.control_id, c.title AS control_title,
              ci.severity, ci.status, ci.assigned_to, ci.due_date,
              ci.description, ci.created_at
         FROM "${schema}".control_issues ci
         LEFT JOIN "${schema}".controls c ON c.control_id = ci.control_id
        ${whereClause}
        ORDER BY ci.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title, ces.design_score, ces.operating_score,
              ces.overall_score, ces.created_at AS scored_at
         FROM "${schema}".control_effectiveness_scores ces
         JOIN "${schema}".controls c ON c.control_id = ces.control_id
        ${whereClause}
        ORDER BY ces.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, status, control_type, owner,
              is_sox, frequency, last_tested_at, effectiveness_rating,
              created_at, updated_at
         FROM "${schema}".controls
        ${whereClause}
        ORDER BY title`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `SELECT
           ROUND(AVG(overall_score)::numeric, 2)::float AS avg_overall,
           ROUND(AVG(design_score)::numeric, 2)::float AS avg_design,
           ROUND(AVG(operating_score)::numeric, 2)::float AS avg_operating
         FROM "${schema}".control_effectiveness_scores
         WHERE created_at > NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total_open,
           COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
           COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
           COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
           COUNT(*) FILTER (WHERE severity = 'low')::int AS low
         FROM "${schema}".control_issues
         WHERE status NOT IN ('closed', 'resolved')`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total_controls,
           COUNT(*) FILTER (WHERE is_sox = true)::int AS sox_controls,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active_controls,
           COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated_controls
         FROM "${schema}".controls
         WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, rule_id, alert_type, severity, message,
                status, created_at
           FROM "${schema}".control_monitoring_alerts
          WHERE status = 'new'
          ORDER BY created_at DESC
          LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `SELECT id, control_id, severity, status, assigned_to, due_date, created_at
           FROM "${schema}".control_issues
          WHERE assigned_to = $1
            AND status NOT IN ('closed', 'resolved')
          ORDER BY severity ASC, due_date ASC NULLS LAST
          LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `SELECT task_id, control_id, requirement_description_en AS description,
                assigned_to, due_date, status
           FROM "${schema}".evidence_tasks
          WHERE assigned_to = $1
            AND status = 'pending'
          ORDER BY due_date ASC NULLS LAST
          LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, status, owner, updated_at
           FROM "${schema}".controls
          WHERE owner = $1
            AND status = 'pending_review'
            AND deleted_at IS NULL
          ORDER BY updated_at DESC
          LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `SELECT ct.test_id, ct.control_id, c.title AS control_title,
                ct.tester, ct.tested_at AS created_at
           FROM "${schema}".control_tests ct
           JOIN "${schema}".controls c ON c.control_id = ct.control_id
          WHERE ct.tester = $1
            AND ct.test_result = 'pending'
          ORDER BY ct.tested_at DESC
          LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `SELECT c.*, (SELECT COUNT(*)::int FROM "${schema}".control_test_results t WHERE t.control_id = c.control_id) AS test_count FROM "${schema}".controls c WHERE c.control_id = $1`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".controls WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".controls WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".controls c
           WHERE c.last_tested_at::date = d.date::date
         ), 0) AS tests_conducted,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".controls c
           WHERE c.created_at::date = d.date::date
         ), 0) AS controls_created
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       ORDER BY d.date ASC`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE effectiveness = 'ineffective' AND status = 'active')::int AS ineffective_controls,
         COUNT(*) FILTER (
           WHERE (effectiveness IS NULL OR effectiveness = 'not_tested')
             AND status = 'active'
         )::int AS untested_controls
       FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
         COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled,
         COUNT(*) FILTER (WHERE effectiveness = 'effective')::int AS effective,
         COUNT(*) FILTER (WHERE effectiveness = 'partially_effective')::int AS partially_effective,
         COUNT(*) FILTER (WHERE effectiveness = 'ineffective')::int AS ineffective,
         COUNT(*) FILTER (WHERE effectiveness IS NULL OR effectiveness = 'not_tested')::int AS not_tested
       FROM "${schema}".controls`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `
              INSERT INTO "${schema}".control_issues
                (tenant_id, control_id, severity, status, source, description, created_at)
              VALUES ($1, $2, $3, 'open', 'monitoring_rule',
                'Auto-created from monitoring rule breach (rule: ' || $4 || ')', NOW())
            `;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `
            INSERT INTO "${schema}".control_monitoring_alerts
              (tenant_id, control_id, severity, status, detected_at)
            VALUES ($1, $2, $3, 'new', NOW())
          `;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `
          SELECT DISTINCT r.rule_id, r.control_id, r.severity, r.auto_create_issue
          FROM "${schema}".control_monitoring_rules r
          JOIN "${schema}".control_monitoring_signals s ON s.rule_id = r.rule_id
          WHERE r.active = true AND r.deleted_at IS NULL
            AND s.breach = true
            AND s.captured_at > NOW() - INTERVAL '15 minutes'
            AND NOT EXISTS (
              SELECT 1 FROM "${schema}".control_monitoring_alerts a
              WHERE a.control_id = r.control_id
                AND a.status IN ('new', 'acknowledged')
                AND a.detected_at > NOW() - INTERVAL '1 hour'
            )
        `;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM public.tenants WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `
          SELECT cr.request_id, cr.owner_id, cc.end_date::text AS deadline
          FROM "${schema}".control_certification_requests cr
          JOIN "${schema}".control_certification_campaigns cc ON cc.campaign_id = cr.campaign_id
          WHERE cr.status = 'pending'
            AND cc.status = 'active'
            AND cc.end_date <= NOW() + INTERVAL '7 days'
        `;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM public.tenants WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `
          SELECT control_id, owner_user_id, next_test_due_at::text AS due_date
          FROM "${schema}".controls
          WHERE deleted_at IS NULL
            AND next_test_due_at IS NOT NULL
            AND next_test_due_at < NOW()
            AND owner_user_id IS NOT NULL
        `;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM public.tenants WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM public.tenants WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".control_tests WHERE status = 'overdue' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".controls WHERE status = 'ineffective' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".controls WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'controls' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'controls','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

}
