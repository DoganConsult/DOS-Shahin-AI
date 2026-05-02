// @ts-nocheck
// Auto-extracted Policy repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class PolicyAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT to_status, sod_check, required_permission_code
     FROM "${schema}".module_lifecycle_transitions
     WHERE module_code = $1 AND from_status = $2
     ORDER BY to_status`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, status, next_review_date, review_frequency,
            TRUE AS is_overdue,
            EXTRACT(DAY FROM NOW() - next_review_date)::int AS overdue_days
     FROM "${schema}".policies
     WHERE deleted_at IS NULL AND next_review_date < NOW()
     ORDER BY overdue_days DESC`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, status, next_review_date, review_frequency,
            CASE WHEN next_review_date < NOW() THEN TRUE ELSE FALSE END AS is_overdue,
            GREATEST(0, EXTRACT(DAY FROM NOW() - next_review_date)::int) AS overdue_days
     FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_regulation_map
         (policy_id, regulation_id, mapped_by)
       VALUES ($1, $2, $3)
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_distribution
     SET read_at = NOW(),
         status = 'read'
     WHERE policy_id = $1 AND user_id = $2 AND read_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_distribution
     WHERE policy_id = $1
     ORDER BY distributed_at ASC`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_distribution
         (policy_id, user_id, status)
       VALUES ($1, $2, 'distributed')
       ON CONFLICT DO NOTHING
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT procedure_id AS process_id, title AS name
     FROM "${schema}".procedures
     WHERE linked_policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT t.team_id, t.name FROM "${schema}".teams t
     INNER JOIN "${schema}".policies p ON p.owner = t.team_id::text
     WHERE p.policy_id = $1 AND p.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT risk_id, title FROM "${schema}".risks
     WHERE policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title FROM "${schema}".controls
     WHERE policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_exceptions
     WHERE status = 'approved'
       AND expires_at IS NOT NULL
       AND expires_at <= CURRENT_DATE + $1 * INTERVAL '1 day'
       AND expires_at >= CURRENT_DATE
     ORDER BY expires_at ASC`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_exceptions
     SET status = $1,
         reviewed_by = $2,
         review_notes = $3,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE exception_id = $4
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_exceptions
       (policy_id, title, justification, requested_by, risk_assessment,
        compensating_controls, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT user_id, acknowledged, acknowledged_at
     FROM "${schema}".policy_attestations
     WHERE campaign_id = $1
     ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_attestation_campaigns
     WHERE campaign_id = $1`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_attestations
         (campaign_id, user_id, acknowledged, acknowledged_at)
       VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END)
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_attestations
     SET acknowledged = $1,
         acknowledged_at = CASE WHEN $1 THEN NOW() ELSE NULL END
     WHERE campaign_id = $2 AND user_id = $3
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT pac.*,
       (SELECT COUNT(*) FROM "${schema}".policy_attestations pa
        WHERE pa.campaign_id = pac.campaign_id)::int AS total_recipients,
       (SELECT COUNT(*) FROM "${schema}".policy_attestations pa
        WHERE pa.campaign_id = pac.campaign_id AND pa.acknowledged = true)::int AS acknowledged_count
     FROM "${schema}".policy_attestation_campaigns pac
     ORDER BY pac.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_attestations (campaign_id, user_id)
       VALUES ($1, $2)`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_attestation_campaigns
       (policy_id, title, description, deadline, target_audience, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT content FROM "${schema}".policies WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT content FROM "${schema}".policies WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT content, version FROM "${schema}".policy_versions
     WHERE policy_id = $1 AND version = $2`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT content, version FROM "${schema}".policy_versions
     WHERE policy_id = $1 AND version = $2`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT category, COUNT(*) AS cnt FROM "${schema}".policies GROUP BY category ORDER BY cnt DESC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) AS cnt FROM "${schema}".policies GROUP BY status ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) FILTER (WHERE review_date < NOW()) AS overdue FROM "${schema}".policies`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".policies WHERE owner IS NULL`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".policies WHERE review_date < NOW() AND status != 'archived'`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".policies WHERE status = 'draft'`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT title, status, review_date, owner, version FROM "${schema}".policies WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `SELECT status, review_date, effective_date, version, owner FROM "${schema}".policies WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT category, status FROM "${schema}".policies WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT title, category, status, version, owner, effective_date, review_date, description
     FROM "${schema}".policies WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".policies
       WHERE status NOT IN ('retired', 'archived', 'deleted')`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_redundancies
         (redundancy_id, policy_ids, overlap_percent, description,
          consolidation_recommendation, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (redundancy_id) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, title_en, content, body, scope, clauses, category
     FROM "${schema}".policies
     WHERE status NOT IN ('retired', 'archived', 'deleted')
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_conflicts
         (conflict_id, policy_a_id, policy_b_id, conflict_type, description,
          severity, detected_at, resolved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (conflict_id) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT requirement_id AS policy_id,
              title, title_en, description AS content,
              scope, NULL AS authority, NULL AS owner_id,
              effective_date, NULL AS expiry_date, NULL AS review_date,
              'active' AS status, NULL AS clauses, category
       FROM "${schema}".regulatory_requirements
       WHERE status = 'active'`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, title_en, content, body, scope, authority,
            owner_id, effective_date, expiry_date, review_date, status,
            clauses, category
     FROM "${schema}".policies
     WHERE status NOT IN ('retired', 'archived', 'deleted')
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT policy_id FROM "${schema}".policy_control_links WHERE control_id = $1`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title,
            COUNT(e.evidence_id)::int AS evidence_count,
            COUNT(e.evidence_id) FILTER (WHERE e.status = 'validated' AND (e.expiry_date IS NULL OR e.expiry_date > NOW()))::int AS fresh_count,
            COUNT(e.evidence_id) FILTER (WHERE e.status = 'expired' OR (e.expiry_date IS NOT NULL AND e.expiry_date <= NOW()))::int AS expired_count
     FROM "${schema}".policy_control_links pcl
     JOIN "${schema}".controls c ON c.control_id = pcl.control_id
     LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id AND e.deleted_at IS NULL
     WHERE pcl.policy_id = $1 AND c.deleted_at IS NULL
     GROUP BY c.control_id, c.title`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, description FROM "${schema}".controls
         WHERE deleted_at IS NULL AND status = 'active' LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT title, scope_description, requirements FROM "${schema}".policies WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".controls
         SET policy_version = $1, policy_aligned = true, last_policy_review = NOW(), updated_at = NOW()
         WHERE control_id = $2`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT pcl.control_id, c.title, c.effectiveness_score, c.status
       FROM "${schema}".policy_control_links pcl
       JOIN "${schema}".controls c ON c.control_id = pcl.control_id
       WHERE pcl.policy_id = $1 AND c.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT data
     FROM "${schema}".policy_dashboard_cache
     WHERE cache_key = $1 AND expires_at > NOW()`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_dashboard_cache
     (cache_key, data, expires_at, computed_at)
     VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 minute'), NOW())
     ON CONFLICT (cache_key) DO UPDATE
     SET data = EXCLUDED.data,
         expires_at = EXCLUDED.expires_at,
         computed_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_scores (policy_id, score_type, score_value, computed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (policy_id, score_type) DO UPDATE
       SET score_value = EXCLUDED.score_value, computed_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS active_exceptions
     FROM "${schema}".policy_exception_requests
     WHERE policy_id = $1 AND status IN ('approved', 'renewed')`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(ar.record_id)::int AS total_records,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested_count
     FROM "${schema}".attestation_campaigns ac
     JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     WHERE ac.policy_id = $1 AND ac.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT EXTRACT(EPOCH FROM (NOW() - updated_at)) / 2592000 AS months_since_update
     FROM "${schema}".policies
     WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT
       (SELECT COUNT(*)::int FROM "${schema}".policy_control_links WHERE policy_id = $1) AS linked_controls,
       (SELECT COUNT(*)::int FROM "${schema}".controls) AS total_controls`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT *
     FROM "${schema}".policy_workflow_tracker
     ORDER BY created_at DESC
     LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT per.exception_id, per.policy_id, per.reason, per.priority,
            per.requested_by, per.created_at,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE per.status = 'pending'
     ORDER BY
       CASE per.priority
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         ELSE 4
       END,
       per.created_at ASC
     LIMIT $1 OFFSET $2`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT ac.campaign_id, ac.name, ac.policy_id, ac.due_date,
            gp.title AS policy_title,
            COUNT(ar.record_id)::int AS total_records,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested_count,
            COUNT(ar.record_id) FILTER (WHERE ar.status = 'pending')::int AS pending_count
     FROM "${schema}".attestation_campaigns ac
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ac.policy_id
     LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     WHERE ac.created_by = $1
       AND ac.status = 'active'
     GROUP BY ac.campaign_id, ac.name, ac.policy_id, ac.due_date, gp.title
     ORDER BY ac.due_date ASC
     LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.status,
            ppa.created_at, gp.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ppa.policy_id
     WHERE ppa.assigned_to = $1
       AND ppa.step_key = 'publish'
       AND ppa.status = 'pending'
     ORDER BY ppa.created_at ASC
     LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.status,
            ppa.created_at, gp.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ppa.policy_id
     WHERE ppa.assigned_to = $1
       AND ppa.step_key LIKE '%approval%'
       AND ppa.status = 'pending'
     ORDER BY ppa.created_at ASC
     LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.status,
            ppa.created_at, gp.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = ppa.policy_id
     WHERE ppa.assigned_to = $1
       AND ppa.step_key IN ('internal_review', 'legal_review', 'compliance_review')
       AND ppa.status = 'pending'
     ORDER BY ppa.created_at ASC
     LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, status, created_at, updated_at
     FROM "${schema}".policies
     WHERE author_user_id = $1 AND status = 'draft'
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(category, 'Uncategorized') AS category,
            COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE status NOT IN ('retired', 'archived')
     GROUP BY category
     ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) FILTER (WHERE status IN ('approved', 'renewed'))::int AS active_exceptions,
       COUNT(*) FILTER (
         WHERE status IN ('approved', 'renewed')
           AND expiry_date <= NOW() + INTERVAL '30 days'
           AND expiry_date > NOW()
       )::int AS expiring_exceptions
     FROM "${schema}".policy_exception_requests`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total_records,
       COUNT(*) FILTER (WHERE status = 'attested')::int AS attested_count
     FROM "${schema}".attestation_records`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS pending_approvals
     FROM "${schema}".policy_process_actions
     WHERE step_key LIKE '%approval%'
       AND status = 'pending'`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total_policies,
       COUNT(*) FILTER (WHERE status = 'published')::int AS published_count,
       COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_count,
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
       COUNT(*) FILTER (WHERE status = 'retired')::int AS retired_count,
       COUNT(*) FILTER (
         WHERE next_review_date < NOW()
           AND status NOT IN ('retired', 'archived')
       )::int AS overdue_reviews,
       COUNT(*) FILTER (
         WHERE updated_at < NOW() - INTERVAL '12 months'
           AND status = 'published'
       )::int AS stale_policies,
       COUNT(*) FILTER (
         WHERE (owner IS NULL OR owner = '')
           AND status NOT IN ('retired', 'archived')
       )::int AS policies_without_owner
     FROM "${schema}".policies`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT per.*,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE per.status IN ('approved', 'renewed')
       AND per.expiry_date <= NOW() + ($1::int * INTERVAL '1 day')
       AND per.expiry_date > NOW()
     ORDER BY per.expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_exception_requests
     SET status = 'closed',
         closed_by = $2,
         closed_at = NOW(),
         close_comment = $3,
         updated_at = NOW()
     WHERE exception_id = $1 AND status NOT IN ('closed', 'rejected')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_exception_approvals
     (approval_id, exception_id, decision, approver_user_id, comment, decided_at)
     VALUES ($1, $2, 'renew', $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_exception_requests
     SET status = 'renewed',
         expiry_date = $2,
         updated_at = NOW()
     WHERE exception_id = $1 AND status IN ('approved', 'renewed')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_exception_approvals
     (approval_id, exception_id, decision, approver_user_id, comment, reason, decided_at)
     VALUES ($1, $2, 'rejected', $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_exception_requests
     SET status = 'rejected',
         rejected_by = $2,
         rejected_at = NOW(),
         updated_at = NOW()
     WHERE exception_id = $1 AND status = 'pending'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_exception_approvals
     (approval_id, exception_id, decision, approver_user_id, comment, conditions, decided_at)
     VALUES ($1, $2, 'approved', $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_exception_requests
     SET status = 'approved',
         expiry_date = $2,
         approved_by = $3,
         approved_at = NOW(),
         updated_at = NOW()
     WHERE exception_id = $1 AND status = 'pending'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `SELECT per.*,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE per.exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT per.*,
            gp.title AS policy_title
     FROM "${schema}".policy_exception_requests per
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = per.policy_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY per.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_exception_requests
     (exception_id, policy_id, policy_clause_scope, reason,
      business_justification, compensating_controls, risk_assessment,
      requested_by, priority, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT policy_id FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_gaps
     SET resolved_at = NOW()
     WHERE policy_id = $1 AND gap_type = $2 AND resolved_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_gaps
       (gap_id, policy_id, gap_type, severity, description, detected_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (policy_id, gap_type) WHERE resolved_at IS NULL
     DO UPDATE SET severity = EXCLUDED.severity, description = EXCLUDED.description, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_gaps
       SET severity = $3, description = $4, updated_at = NOW()
       WHERE gap_id = $1`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT gap_id, severity FROM "${schema}".policy_gaps
     WHERE policy_id = $1 AND gap_type = $2 AND resolved_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_gaps SET resolved_at = NOW() WHERE gap_id = $1 AND resolved_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT g.gap_id, g.policy_id, g.gap_type, g.severity, g.description,
            g.detected_at, g.resolved_at, p.title AS policy_title
     FROM "${schema}".policy_gaps g
     LEFT JOIN "${schema}".policies p ON p.policy_id = g.policy_id
     WHERE g.resolved_at IS NULL
     ORDER BY
       CASE g.severity WHEN 'red' THEN 1 WHEN 'yellow' THEN 2 ELSE 3 END,
       g.detected_at DESC`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `SELECT gap_type, COUNT(*)::int AS cnt
     FROM "${schema}".policy_gaps
     WHERE resolved_at IS NULL
     GROUP BY gap_type`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT severity, COUNT(*)::int AS cnt
     FROM "${schema}".policy_gaps
     WHERE resolved_at IS NULL
     GROUP BY severity`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(ar.record_id)::int AS total_records,
         COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested_count
       FROM "${schema}".attestation_campaigns ac
       JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
       WHERE ac.policy_id = $1 AND ac.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".policy_risk_links WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".policy_control_links WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.owner, p.updated_at, p.status
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
       AND p.status NOT IN ('retired', 'archived')`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, status, approval_status
     FROM "${schema}".governance_policies
     WHERE policy_id = $1 AND deleted_at IS NULL
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `SELECT ${mapping.titleColumn} FROM "${schema}".${mapping.table}
       WHERE ${mapping.idColumn} = $1 AND deleted_at IS NULL
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `SELECT
       COALESCE(p.category, 'uncategorized') AS category,
       COUNT(*)::int AS count,
       COUNT(*) FILTER (WHERE p.status = 'published')::int AS published,
       COUNT(*) FILTER (WHERE p.status = 'draft')::int AS draft,
       COUNT(*) FILTER (WHERE p.status = 'retired')::int AS retired
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
     GROUP BY COALESCE(p.category, 'uncategorized')
     ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies
       SET supersedes_id = $1, updated_at = NOW()
       WHERE policy_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies
     SET status = 'retired',
         publication_state = 'retired',
         superseded_by_id = COALESCE($2, superseded_by_id),
         updated_at = NOW()
     WHERE policy_id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies
     SET status = 'published',
         publication_state = 'published',
         approval_status = 'approved',
         effective_date = COALESCE(effective_date, NOW()),
         updated_at = NOW()
     WHERE policy_id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE policy_id = $1 AND deleted_at IS NULL
     RETURNING policy_id`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_versions
      (policy_id, version, title, content, status, change_summary, changed_by, snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies
     SET ${setClauses.join(', ')}, updated_at = NOW(), approval_status = 'draft'
     WHERE policy_id = $1 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_versions
      (policy_id, version, major_version, minor_version,
       title, content, status, change_summary, changed_by, snapshot, effective_date)
     VALUES ($1, 1, 1, 0, $2, $3, 'draft', 'Initial version', $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policies
      (title, content, description, category, status, approval_status,
       title_en, title_ar, description_en, description_ar,
       business_domain, audience_scope, category_id,
       author_user_id, approver_user_id, owner, created_by,
       frameworks, review_frequency, next_review_date,
       effective_date, expiry_date, linked_controls, tags,
       version, publication_state)
     VALUES ($1,$2,$3,$4,'draft','draft',
       $5,$6,$7,$8,
       $9,$10,$11,
       $12,$13,$12,$12,
       $14,$15,$16,
       $17,$18,$19,$20,
       1,'unpublished')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `SELECT p.*,
      (SELECT COUNT(*)::int FROM "${schema}".policy_control_links pcl
       WHERE pcl.policy_id = p.policy_id) AS control_count,
      (SELECT COUNT(*)::int FROM "${schema}".policy_risk_links prl
       WHERE prl.policy_id = p.policy_id) AS risk_count,
      (SELECT COUNT(*)::int FROM "${schema}".policy_exception_requests per
       WHERE per.policy_id = p.policy_id
         AND per.status IN ('pending','approved','under_review')) AS exception_count,
      (SELECT COUNT(*)::int FROM "${schema}".policy_versions pv
       WHERE pv.policy_id = p.policy_id) AS version_count,
      (SELECT CASE
        WHEN COUNT(*)::int = 0 THEN 0
        ELSE ROUND((COUNT(*) FILTER (WHERE ar.status = 'attested')::numeric
              / NULLIF(COUNT(*)::numeric, 0)) * 100, 1)
       END
       FROM "${schema}".attestation_records ar
       JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
       WHERE ac.policy_id = p.policy_id AND ac.status = 'active'
      ) AS acknowledgment_rate
     FROM "${schema}".policies p
     WHERE p.policy_id = $1 AND p.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `SELECT p.* FROM "${schema}".policies p
     WHERE ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST, p.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".policies p WHERE ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT o.obligation_id,
            o.title AS obligation_title,
            o.status AS obligation_status,
            o.source AS obligation_source,
            opl.policy_id,
            gp.title AS policy_title,
            gp.status AS policy_status,
            CASE WHEN opl.policy_id IS NOT NULL THEN true ELSE false END AS is_covered
     FROM "${schema}".obligations o
     LEFT JOIN "${schema}".obligation_policy_links opl ON opl.obligation_id = o.obligation_id
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = opl.policy_id
     ORDER BY o.title`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `SELECT o.obligation_id, o.title
     FROM "${schema}".obligations o
     LEFT JOIN "${schema}".obligation_policy_links opl ON opl.obligation_id = o.obligation_id
     WHERE opl.policy_id IS NULL
     ORDER BY o.title`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT r.risk_id, r.title
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.risk_id = r.risk_id
     WHERE prl.link_id IS NULL
     ORDER BY r.title`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.control_id = c.control_id
     WHERE pcl.link_id IS NULL
     ORDER BY c.title`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT gp.policy_id, gp.title
     FROM "${schema}".policies gp
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.policy_id = gp.policy_id
     WHERE prl.link_id IS NULL
       AND gp.status NOT IN ('retired', 'archived')
     ORDER BY gp.title`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT gp.policy_id, gp.title
     FROM "${schema}".policies gp
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.policy_id = gp.policy_id
     WHERE pcl.link_id IS NULL
       AND gp.status NOT IN ('retired', 'archived')
     ORDER BY gp.title`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = `SELECT pil.*,
            i.title AS issue_title
     FROM "${schema}".policy_issue_links pil
     LEFT JOIN "${schema}".issues i ON i.issue_id = pil.issue_id
     WHERE pil.policy_id = $1
     ORDER BY pil.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `SELECT opl.*,
            o.title AS obligation_title
     FROM "${schema}".obligation_policy_links opl
     LEFT JOIN "${schema}".obligations o ON o.obligation_id = opl.obligation_id
     WHERE opl.policy_id = $1
     ORDER BY opl.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = `SELECT prl.*,
            r.title AS risk_title
     FROM "${schema}".policy_risk_links prl
     LEFT JOIN "${schema}".risks r ON r.risk_id = prl.risk_id
     WHERE prl.policy_id = $1
     ORDER BY prl.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT pcl.*,
            c.title AS control_title
     FROM "${schema}".policy_control_links pcl
     LEFT JOIN "${schema}".controls c ON c.control_id = pcl.control_id
     WHERE pcl.policy_id = $1
     ORDER BY pcl.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".policy_issue_links
     WHERE policy_id = $1 AND issue_id = $2
     RETURNING link_id`;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_issue_links
     (link_id, policy_id, issue_id, link_type, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (policy_id, issue_id) DO UPDATE
     SET link_type = COALESCE(EXCLUDED.link_type, policy_issue_links.link_type),
         notes = COALESCE(EXCLUDED.notes, policy_issue_links.notes),
         updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".policy_risk_links
     WHERE policy_id = $1 AND risk_id = $2
     RETURNING link_id`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_risk_links
     (link_id, policy_id, risk_id, link_type, relevance_score, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (policy_id, risk_id) DO UPDATE
     SET link_type = COALESCE(EXCLUDED.link_type, policy_risk_links.link_type),
         relevance_score = COALESCE(EXCLUDED.relevance_score, policy_risk_links.relevance_score),
         notes = COALESCE(EXCLUDED.notes, policy_risk_links.notes),
         updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".policy_control_links
     WHERE policy_id = $1 AND control_id = $2
     RETURNING link_id`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_control_links
     (link_id, policy_id, control_id, link_type, relevance_score, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (policy_id, control_id) DO UPDATE
     SET link_type = COALESCE(EXCLUDED.link_type, policy_control_links.link_type),
         relevance_score = COALESCE(EXCLUDED.relevance_score, policy_control_links.relevance_score),
         notes = COALESCE(EXCLUDED.notes, policy_control_links.notes),
         updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, created_by)
       VALUES ($1, $2, 'policy_stale_warning', 'policy', 'medium', $3, $4, 'policy', 'email', 'pending', 'system')`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.owner, p.updated_at, p.next_review_date,
            EXTRACT(MONTH FROM AGE(NOW(), p.updated_at))::int AS months_since_update
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
       AND p.status = 'published'
       AND p.updated_at < NOW() - ($1::int * INTERVAL '1 month')`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
       VALUES ($1, $2, 'policy_approval_reminder', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `SELECT ppa.action_id, ppa.policy_id, ppa.step_key, ppa.assigned_to,
            ppa.assigned_role, ppa.due_date, ppa.sla_hours,
            p.title AS policy_title
     FROM "${schema}".policy_process_actions ppa
     LEFT JOIN "${schema}".policies p ON p.policy_id = ppa.policy_id
     WHERE ppa.status = 'pending'
       AND ppa.due_date IS NOT NULL
       AND ppa.due_date < NOW()`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
            (notification_id, recipient_id, notification_type, notification_category,
             priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
           VALUES ($1, $2, 'policy_exception_expiry', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT approver_user_id FROM "${schema}".policy_exception_approvals
       WHERE exception_id = $1 AND decision = 'approve'`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
          (notification_id, recipient_id, notification_type, notification_category,
           priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
         VALUES ($1, $2, 'policy_exception_expiry', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `SELECT ex.exception_id, ex.policy_id, ex.requested_by, ex.expiry_date,
            ex.compensating_controls, ex.reason,
            p.title AS policy_title,
            EXTRACT(DAY FROM ex.expiry_date - NOW())::int AS days_until_expiry
     FROM "${schema}".policy_exception_requests ex
     LEFT JOIN "${schema}".policies p ON p.policy_id = ex.policy_id
     WHERE ex.status = 'approved'
       AND ex.expiry_date IS NOT NULL
       AND ex.expiry_date > NOW()
       AND ex.expiry_date <= NOW() + ($1::int * INTERVAL '1 day')`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".attestation_records
       SET reminder_count = $2, last_reminded_at = NOW()
       WHERE record_id = $1`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, action_required, created_by)
       VALUES ($1, $2, 'policy_ack_nudge', 'policy', 'high', $3, $4, 'policy', 'email', 'pending', TRUE, 'system')`;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT ar.record_id, ar.user_id, ar.campaign_id, ar.reminder_count,
            ac.name AS campaign_name, ac.due_date, ac.reminder_interval_days,
            p.title AS policy_title
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     LEFT JOIN "${schema}".policies p ON p.policy_id = ac.policy_id
     WHERE ar.status = 'pending'
       AND ac.status = 'active'
       AND ac.due_date < NOW()
       AND (ar.last_reminded_at IS NULL
            OR ar.last_reminded_at < NOW() - (COALESCE(ac.reminder_interval_days, 7) * INTERVAL '1 day'))`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, created_by)
       VALUES ($1, $2, 'policy_published', 'policy', 'medium', $3, $4, 'policy', 'email', 'pending', 'system')`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role = $2 AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM public.users WHERE tenant_id = $1 AND status = 'active'`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `SELECT audience_type, audience_ref
       FROM "${schema}".policy_publication_audiences
       WHERE publication_id = $1`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `SELECT pdr.user_id
     FROM "${schema}".policy_delivery_records pdr
     WHERE pdr.publication_id = $1 AND pdr.status = 'pending'`;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `SELECT pp.*, p.title AS policy_title
     FROM "${schema}".policy_publications pp
     LEFT JOIN "${schema}".policies p ON p.policy_id = pp.policy_id
     WHERE pp.publication_id = $1`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
        (notification_id, recipient_id, notification_type, notification_category,
         priority, subject, body, entity_type, delivery_channel, status, created_by)
       VALUES ($1, $2, 'policy_review_due', 'policy', 'medium', $3, $4, 'policy', 'email', 'pending', 'system')`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.owner, p.next_review_date,
            EXTRACT(DAY FROM p.next_review_date - NOW())::int AS days_until_review
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
       AND p.status = 'published'
       AND p.next_review_date IS NOT NULL
       AND p.next_review_date > NOW()
       AND p.next_review_date <= NOW() + ($1::int * INTERVAL '1 day')`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_publications
     SET status = 'recalled',
         recalled_at = NOW(),
         recalled_by = $2,
         recall_reason = $3,
         updated_at = NOW()
     WHERE publication_id = $1 AND status NOT IN ('recalled')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_delivery_records
     SET reminder_count = COALESCE(reminder_count, 0) + 1,
         last_reminded_at = NOW(),
         updated_at = NOW()
     WHERE publication_id = $1
       AND status IN ('pending', 'delivered', 'viewed')
     RETURNING delivery_id`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_delivery_records
     SET status = $2,
         delivered_at = CASE WHEN $2 = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
         viewed_at = CASE WHEN $2 = 'viewed' AND viewed_at IS NULL THEN NOW() ELSE viewed_at END,
         acknowledged_at = CASE WHEN $2 = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
         declined_at = CASE WHEN $2 = 'declined' THEN NOW() ELSE declined_at END,
         declined_reason = CASE WHEN $2 = 'declined' THEN $3 ELSE declined_reason END,
         updated_at = NOW()
     WHERE delivery_id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_delivery_records
       (delivery_id, publication_id, user_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', NOW(), NOW())
       ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS cnt
     FROM "${schema}".policy_delivery_records
     WHERE publication_id = $1
     GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_publications
     WHERE publication_id = $1`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    const query = `SELECT pp.*,
            COALESCE(aud.audience_count, 0)::int AS audience_count,
            COALESCE(aud.total_user_count, 0)::int AS total_user_count
     FROM "${schema}".policy_publications pp
     LEFT JOIN (
       SELECT publication_id,
              COUNT(*)::int AS audience_count,
              SUM(COALESCE(user_count, 0))::int AS total_user_count
       FROM "${schema}".policy_publication_audiences
       GROUP BY publication_id
     ) aud ON aud.publication_id = pp.publication_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY pp.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_publication_audiences
       (audience_id, publication_id, audience_type, audience_ref,
        audience_name, user_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_publications
     (publication_id, policy_id, policy_version_id, campaign_name,
      published_by, publish_channel, message, status,
      scheduled_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.title_en, p.category, p.owner,
            p.status, p.next_review_date, p.updated_at, p.review_frequency,
            p.business_domain,
            CASE
              WHEN p.next_review_date IS NULL THEN 'no_review_date'
              WHEN p.next_review_date > NOW() + INTERVAL '90 days' THEN 'on_schedule'
              WHEN p.next_review_date > NOW() AND p.next_review_date <= NOW() + INTERVAL '90 days' THEN 'upcoming'
              WHEN p.next_review_date <= NOW() AND p.updated_at >= p.next_review_date - INTERVAL '30 days' THEN 'late'
              WHEN p.next_review_date <= NOW() THEN 'missed'
              ELSE 'on_schedule'
            END AS review_status,
            CASE
              WHEN p.next_review_date IS NOT NULL
              THEN EXTRACT(DAY FROM p.next_review_date - NOW())::int
              ELSE NULL
            END AS days_until_review
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL AND p.status IN ('published','approved','review')
     ORDER BY p.next_review_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    const query = `SELECT pp.*,
            p.title AS policy_title, p.category AS policy_category,
            COUNT(pdr.delivery_id)::int AS total_deliveries,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'delivered')::int AS delivered_count,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'viewed')::int AS viewed_count,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'acknowledged')::int AS acknowledged_count,
            COUNT(pdr.delivery_id) FILTER (WHERE pdr.status = 'pending')::int AS pending_count
     FROM "${schema}".policy_publications pp
     LEFT JOIN "${schema}".policies p ON p.policy_id = pp.policy_id
     LEFT JOIN "${schema}".policy_delivery_records pdr ON pdr.publication_id = pp.publication_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY pp.publication_id, p.title, p.category
     ORDER BY pp.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_exception_approvals
       WHERE exception_id = ANY($1)
       ORDER BY decided_at DESC`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    const query = `SELECT ex.*,
            p.title AS policy_title, p.category AS policy_category,
            u.first_name AS requestor_first_name, u.last_name AS requestor_last_name, u.email AS requestor_email
     FROM "${schema}".policy_exception_requests ex
     LEFT JOIN "${schema}".policies p ON p.policy_id = ex.policy_id
     LEFT JOIN public.users u ON u.user_id = ex.requested_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY ex.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    const query = `SELECT r.risk_id, r.title
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.risk_id = r.risk_id
     WHERE prl.link_id IS NULL
     ORDER BY r.title
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    const query = `SELECT c.control_id, c.title
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.control_id = c.control_id
     WHERE pcl.link_id IS NULL
     ORDER BY c.title
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.status, p.category
     FROM "${schema}".policies p
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.policy_id = p.policy_id
     WHERE p.deleted_at IS NULL AND p.status IN ('published','draft')
       AND prl.link_id IS NULL
     ORDER BY p.title`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.status, p.category
     FROM "${schema}".policies p
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.policy_id = p.policy_id
     WHERE p.deleted_at IS NULL AND p.status IN ('published','draft')
       AND pcl.link_id IS NULL
     ORDER BY p.title`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    const query = `SELECT p.policy_id, p.title, p.title_en, p.category, p.owner,
            p.status, p.next_review_date, p.updated_at, p.review_frequency,
            p.business_domain,
            EXTRACT(DAY FROM NOW() - COALESCE(p.next_review_date, p.updated_at))::int AS days_overdue
     FROM "${schema}".policies p
     WHERE ${conditions.join(' AND ')}
     ORDER BY days_overdue DESC`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    const query = `SELECT ar.user_id, ac.campaign_id, ac.name AS campaign_name, ac.due_date,
            u.first_name, u.last_name, u.email
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     LEFT JOIN public.users u ON u.user_id = ar.user_id::text
     WHERE ar.status = 'pending' AND ac.due_date < NOW() AND ac.status = 'active'
     ORDER BY ac.due_date ASC`;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    const query = `SELECT
       ac.campaign_id, ac.name AS campaign_name,
       ac.due_date, ac.status AS campaign_status,
       p.title AS policy_title, p.policy_id,
       COUNT(ar.record_id)::int AS total_users,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'declined')::int AS declined,
       COUNT(ar.record_id) FILTER (WHERE ar.status = 'pending')::int AS pending,
       CASE WHEN COUNT(ar.record_id) > 0
         THEN ROUND((COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::numeric
               / COUNT(ar.record_id)::numeric) * 100, 1)
         ELSE 0
       END AS completion_rate
     FROM "${schema}".attestation_campaigns ac
     LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     LEFT JOIN "${schema}".policies p ON p.policy_id = ac.policy_id
     WHERE 1=1 ${dateFilter}
     GROUP BY ac.campaign_id, ac.name, ac.due_date, ac.status, p.title, p.policy_id
     ORDER BY ac.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, status, updated_at
     FROM "${schema}".policies
     WHERE deleted_at IS NULL AND updated_at >= NOW() - INTERVAL '30 days'
     ORDER BY updated_at DESC LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(DISTINCT p.policy_id)::int AS total,
       COUNT(DISTINCT pcl.policy_id)::int AS with_controls
     FROM "${schema}".policies p
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.policy_id = p.policy_id
     WHERE p.deleted_at IS NULL AND p.status = 'published'`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total_records,
       COUNT(*) FILTER (WHERE ar.status = 'attested')::int AS attested
     FROM "${schema}".attestation_records ar
     JOIN "${schema}".attestation_campaigns ac ON ac.campaign_id = ar.campaign_id
     WHERE ac.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE deleted_at IS NULL AND status = 'published'
       AND (next_review_date < NOW() OR updated_at < NOW() - INTERVAL '12 months')`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS count
     FROM "${schema}".policy_exception_requests
     WHERE status IN ('pending','approved','under_review')`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(category, 'uncategorized') AS category, COUNT(*)::int AS count
     FROM "${schema}".policies WHERE deleted_at IS NULL
     GROUP BY category ORDER BY count DESC LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS count
     FROM "${schema}".policies
     WHERE deleted_at IS NULL
     GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_guidance
        (policy_id, template_key, guidance_type, title_en, title_ar, content_en, content_ar, frameworks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_guidance WHERE ${conditions.join(' AND ')} ORDER BY sort_order ASC`;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_mom_records
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE mom_id = $2`;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_mom_records ${where} ORDER BY meeting_date DESC LIMIT ${limit}`;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_mom_records
        (policy_id, mom_type, title, meeting_date, location, chairperson,
         attendees, absentees, agenda_items, discussion_notes, decisions,
         action_items, next_meeting_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_templates
          (template_key, title_en, title_ar, category, description_en, description_ar,
           frameworks, sectors, content_en, content_ar, guidance_en, guidance_ar,
           variables, review_frequency, tags, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (template_key) DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_guidance
              (policy_id, template_key, guidance_type, title_en, title_ar, content_en, content_ar, frameworks, created_by)
             VALUES ($1,$2,'implementation',$3,$4,$5,$6,$7,$8)`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_versions (policy_id, version, title, content, status, change_summary, changed_by, snapshot)
           VALUES ($1, 1, $2, $3, 'draft', $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policies
          (title, content, description, category, status, approval_status, frameworks, owner,
           review_frequency, effective_date, next_review_date, tags)
         VALUES ($1,$2,$3,$4,'draft','draft',$5,$6,$7,$8,$9,$10) RETURNING policy_id`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    const query = `SELECT org_name, tenant_name_ar, industry, org_size, regions FROM public.tenants WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_process_actions SET status = 'in_progress', updated_at = NOW()
           WHERE policy_id = $1 AND step_key = $2`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    const query = `SELECT step_key FROM "${schema}".policy_process_actions
         WHERE policy_id = $1 AND step_order > (
           SELECT step_order FROM "${schema}".policy_process_actions WHERE policy_id = $1 AND step_key = $2
         ) AND status = 'pending' AND is_required = TRUE
         ORDER BY step_order ASC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_process_actions
       SET status = $1, completed_by = $2, completed_at = NOW(), notes = $3, updated_at = NOW()
       WHERE policy_id = $4 AND step_key = $5`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_process_actions
       WHERE policy_id = $1 ORDER BY step_order ASC`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_process_actions
          (policy_id, step_key, step_order, status, assigned_role, sla_hours, is_required)
         VALUES ($1,$2,$3,'pending',$4,$5,$6)
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_workflow_tracker
       WHERE policy_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_workflow_tracker
        (policy_id, action, actor_user_id, actor_role, from_status, to_status, comment, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_versions
     SET status = 'superseded'
     WHERE version_id = $1`;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_versions
     SET supersedes_version_id = $2
     WHERE version_id = $1`;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_version_diffs
     WHERE from_version_id = $1 AND to_version_id = $2`;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_version_diffs
      (diff_id, policy_id, from_version_id, to_version_id,
       diff_data, additions, deletions, modifications)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (from_version_id, to_version_id) DO UPDATE SET
       diff_data = EXCLUDED.diff_data,
       additions = EXCLUDED.additions,
       deletions = EXCLUDED.deletions,
       modifications = EXCLUDED.modifications,
       created_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    const query = `SELECT version_id, policy_id, content FROM "${schema}".policy_versions WHERE version_id = $1`;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    const query = `SELECT version_id, policy_id, content FROM "${schema}".policy_versions WHERE version_id = $1`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policy_versions
     SET approved_at = NOW(), approved_by = $2, status = 'approved'
     WHERE version_id = $1
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_versions WHERE version_id = $1`;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".policy_versions
     WHERE policy_id = $1
     ORDER BY major_version DESC, minor_version DESC`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies
     SET version = $2, updated_at = NOW()
     WHERE policy_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_versions
      (version_id, policy_id, version, major_version, minor_version,
       title, content, status, change_summary, changed_by,
       effective_date, snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    const query = `SELECT major_version, minor_version, version
     FROM "${schema}".policy_versions
     WHERE policy_id = $1
     ORDER BY major_version DESC, minor_version DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'workflow_failed', $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'workflow_closed', $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'escalation', $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, details, created_at)
     VALUES ($1, $2, 'task_created', $3, $4, NOW())`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".policy_audit_log (entity_id, entity_type, action, triggered_by, correlation_id, details, created_at)
     VALUES ($1, $2, 'workflow_triggered', $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

}
