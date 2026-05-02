// @ts-nocheck
// Auto-extracted Exception repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class ExceptionAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
         COUNT(*) FILTER (WHERE status = 'pending' OR status = 'submitted')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'approved' OR status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
         COUNT(*) FILTER (WHERE status = 'revoked')::int AS revoked
       FROM "${schema}".exceptions WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status='approved'`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT risk_level, COUNT(*) AS cnt FROM "${schema}".exceptions WHERE status='approved' GROUP BY risk_level ORDER BY cnt DESC`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) FILTER (WHERE expiry_date < NOW()) AS expired FROM "${schema}".exceptions`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE compensating_controls IS NULL AND status = 'approved'`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE risk_level IN ('critical','high') AND status = 'approved'`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".exceptions WHERE expiry_date < NOW() AND status = 'approved'`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE effectiveness_rating = 'effective')::int AS effective FROM "${schema}".exception_compensating_controls WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT title, description, status, risk_level, justification, owner, expiry_date, requested_by, created_at, compensating_controls, exception_type
     FROM "${schema}".exceptions WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM "${schema}".user_roles WHERE role_code = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".exceptions SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE exception_id = $1 AND status IN ('under_review', 'submitted')`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".exceptions
     SET approval_chain = $1, requires_ciso = $2, requires_board = $3, updated_at = NOW()
     WHERE exception_id = $4`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT e.*, 
            (SELECT COUNT(*) FROM "${schema}".exception_renewals WHERE exception_id = e.exception_id)::int AS renewal_count
     FROM "${schema}".exceptions e WHERE e.exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exception_compensating_controls WHERE exception_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".exception_compensating_controls WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `WITH date_range AS (
         SELECT d::date AS date
         FROM generate_series(
           (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
           CURRENT_DATE,
           '1 day'::interval
         ) AS d
       ),
       created AS (
         SELECT created_at::date AS day, COUNT(*)::int AS cnt
         FROM "${schema}".exceptions
         WHERE created_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
         GROUP BY created_at::date
       ),
       approved AS (
         SELECT updated_at::date AS day, COUNT(*)::int AS cnt
         FROM "${schema}".exceptions
         WHERE status = 'approved'
           AND updated_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
         GROUP BY updated_at::date
       ),
       expired AS (
         SELECT updated_at::date AS day, COUNT(*)::int AS cnt
         FROM "${schema}".exceptions
         WHERE status = 'expired'
           AND updated_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
         GROUP BY updated_at::date
       )
       SELECT
         dr.date::text AS date,
         COALESCE(c.cnt, 0) AS exceptions_created,
         COALESCE(a.cnt, 0) AS exceptions_approved,
         COALESCE(x.cnt, 0) AS exceptions_expired
       FROM date_range dr
       LEFT JOIN created c ON c.day = dr.date
       LEFT JOIN approved a ON a.day = dr.date
       LEFT JOIN expired x ON x.day = dr.date
       ORDER BY dr.date ASC`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_exceptions,
         COUNT(*) FILTER (
           WHERE status = 'pending'
             AND created_at < NOW() - INTERVAL '7 days'
         )::int AS stale_pending
       FROM "${schema}".exceptions`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM "${schema}".exceptions`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date < $1
     ORDER BY expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date < $1`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= $1
     ORDER BY expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".exceptions
      (title, description, control_id, linked_policy_id, justification, compensating_controls,
       risk_level, exception_type, requested_by, requested_duration, expiry_date,
       linked_risk_id, linked_obligation_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft')
     RETURNING exception_id, status`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT audit_id, entity_id, action, user_id, before_state, after_state, created_at
       FROM "${schema}".audit_trail
       WHERE module = 'exception' AND entity_id = $1 AND action IN ('justification_update', 'justification_create')
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".audit_trail
       WHERE module = 'exception' AND entity_id = $1 AND action IN ('justification_update', 'justification_create')`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exception_justifications WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".exception_status_history (exception_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1,$2,'revoked',$3,$4,NOW())`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".exceptions SET status = 'revoked', revoked_at = NOW(), revoked_by = $1, revocation_reason = $2, updated_at = NOW() WHERE exception_id = $3`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".exception_status_history (exception_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1,$2,$2,$3,$4,NOW())`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".exceptions SET expiry_date = $1, updated_at = NOW() WHERE exception_id = $2`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT status, expiry_date FROM "${schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_by AS "changedBy", reason, changed_at AS "changedAt"
         FROM "${schema}".exception_status_history WHERE exception_id = $1 ORDER BY changed_at ASC LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".exception_status_history WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= $1 AND expiry_date > NOW()
     ORDER BY expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".exception_auto_renewal_rules
      (exception_id, max_auto_renewals, renewal_days, renewed_count, is_active, conditions)
     VALUES ($1,$2,$3,0,$4,$5)
     ON CONFLICT (exception_id) DO UPDATE
       SET max_auto_renewals = $2, renewal_days = $3, is_active = $4, conditions = $5, updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exception_renewals WHERE exception_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT
       risk_impact,
       COUNT(*) as total,
       AVG(EXTRACT(DAY FROM NOW() - created_at)) as avg_age,
       COUNT(*) FILTER (WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '30 days') as expiring_30
     FROM "${schema}".exceptions
     WHERE status NOT IN ('expired', 'rejected')
     GROUP BY risk_impact
     ORDER BY
       CASE risk_impact WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT CASE WHEN COUNT(DISTINCT e.exception_id) > 0
        THEN ROUND(COUNT(DISTINCT r.exception_id)::numeric / COUNT(DISTINCT e.exception_id)::numeric * 100, 2)
        ELSE 0
      END AS renewal_rate
      FROM "${schema}".exceptions e
      LEFT JOIN "${schema}".exception_renewals r ON r.exception_id = e.exception_id
      WHERE e.status NOT IN ('expired', 'rejected')`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT approver_designation, COUNT(*) as cnt FROM "${schema}".exceptions GROUP BY approver_designation`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT control_id, COUNT(*) as cnt FROM "${schema}".exceptions
       WHERE control_id IS NOT NULL GROUP BY control_id ORDER BY cnt DESC LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT
       CASE
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 30 THEN '0-30 days'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 60 THEN '31-60 days'
         WHEN EXTRACT(DAY FROM NOW() - created_at) <= 90 THEN '61-90 days'
         ELSE '90+ days'
       END as bucket,
       risk_impact,
       COUNT(*) as cnt,
       AVG(EXTRACT(DAY FROM NOW() - created_at)) as avg_age
     FROM "${schema}".exceptions
     WHERE status NOT IN ('expired', 'rejected')
     GROUP BY bucket, risk_impact
     ORDER BY avg_age`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT exception_id, control_id, expiry_date, risk_impact
     FROM "${schema}".exceptions
     WHERE status = 'approved' AND expiry_date IS NOT NULL AND expiry_date <= $1
     ORDER BY expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT
         AVG(requested_duration) as avg_duration,
         AVG(EXTRACT(DAY FROM NOW() - created_at)) FILTER (WHERE status = 'approved') as avg_age_approved
       FROM "${schema}".exceptions`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT status, risk_impact, COUNT(*) as cnt
       FROM "${schema}".exceptions
       GROUP BY status, risk_impact`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT risk_impact FROM "${schema}".exceptions WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".exception_risk_links
     SET compensating_control_effectiveness = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE (link_id = $3 OR id = $3) AND exception_id = $4
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exceptions WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exception_risk_links WHERE exception_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".exception_risk_links WHERE exception_id = $1`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".exception_risk_links
      (exception_id, risk_id, control_id, link_type, impact_description,
       residual_risk_level, compensating_control_ids, compensating_control_effectiveness)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".exceptions WHERE exception_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT from_status, to_status, changed_by, reason, changed_at FROM "${schema}".exception_status_history
     WHERE exception_id = $1 ORDER BY changed_at ASC`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority)
       VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".exception_status_history (exception_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1, $2, $3, $4, $5, NOW())`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".exceptions SET status = $1, updated_at = NOW() WHERE exception_id = $2`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exceptions ${where} ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".exceptions
     WHERE status = 'approved'
       AND deleted_at IS NULL
       AND expiry_date IS NOT NULL
       AND expiry_date <= $1
     ORDER BY expiry_date ASC`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".exceptions
      (control_id, justification, compensating_controls, risk_impact,
       requested_by, requested_duration, approver_designation, status, approval_chain)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', '[]')
     RETURNING *`;
    return safeQuery(query, args);
  }

}
