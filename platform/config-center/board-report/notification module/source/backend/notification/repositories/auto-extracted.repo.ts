// @ts-nocheck
// Auto-extracted Notification repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class NotificationAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".notifications ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".notifications ${where}`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notifications WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notifications WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notifications WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT
         COALESCE(type, 'general') AS module_code,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE read = true) AS read_count,
         MAX(type) AS most_common_type
       FROM "${schema}".notifications
       WHERE created_at > NOW() - INTERVAL '${periodDays} days'
       GROUP BY type
       ORDER BY total DESC`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT
         TO_CHAR(DATE_TRUNC('${truncate}', created_at), '${format}') AS period,
         COUNT(*) AS total,
         type AS module_code
       FROM "${schema}".notifications
       WHERE created_at > NOW() - INTERVAL '${periodDays} days'
       GROUP BY DATE_TRUNC('${truncate}', created_at), type
       ORDER BY period ASC`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE read = true) AS total_read,
       AVG(CASE WHEN read = true AND read_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (read_at - created_at)) * 1000 ELSE NULL END) AS avg_read_ms
     FROM "${schema}".notifications
     WHERE ${conditions.join(' AND ')}`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT
         channel_type AS channel,
         COUNT(*) AS total_sent,
         COUNT(*) FILTER (WHERE status = 'delivered') AS total_delivered,
         COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
         AVG(CASE WHEN delivered_at IS NOT NULL AND sent_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (delivered_at - sent_at)) * 1000 ELSE NULL END) AS avg_delivery_ms
       FROM "${schema}".notification_deliveries
       WHERE created_at > NOW() - INTERVAL '${periodDays} days'
       GROUP BY channel_type
       ORDER BY total_sent DESC`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `SELECT channel_type,
                COUNT(*) AS total_sent,
                COUNT(*) FILTER (WHERE status = 'failed') AS total_failed
         FROM "${schema}".notification_deliveries
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY channel_type`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT channel_type, status, health_checked_at FROM "${schema}".notification_channel_configs`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_deliveries
       WHERE notification_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notification_deliveries
     SET status = $1,
         delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
         failure_reason = COALESCE($2, failure_reason),
         updated_at = NOW()
     WHERE delivery_id = $3`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_deliveries
       (delivery_id, notification_id, channel_type, recipient_id, status,
        sent_at, failure_reason)
     VALUES ($1,$2,$3,$4,$5,
       CASE WHEN $5 IN ('delivered','pending') THEN NOW() ELSE NULL END,
       $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notification_channel_configs
       SET status = $1, last_error_message = $2, health_checked_at = NOW(), updated_at = NOW()
       WHERE channel_type = $3`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_channel_configs ORDER BY channel_type ASC`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_channel_configs WHERE channel_type = $1`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_channel_configs
       (channel_id, tenant_id, channel_type, status, config, rate_limit_per_hour)
     VALUES ($1,$2,$3,'active',$4::jsonb,$5)
     ON CONFLICT (channel_type) DO UPDATE
       SET config = EXCLUDED.config,
           rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
           status = 'active',
           updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT
           COALESCE(channel, 'unknown') AS channel,
           COUNT(*)::int AS count
         FROM "${schema}".notifications
         GROUP BY channel
         ORDER BY count DESC`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read'))::int AS sent,
           COUNT(*) FILTER (WHERE status = 'read')::int AS read,
           COUNT(*) FILTER (WHERE status IN ('sent', 'delivered') AND status != 'read')::int AS unread,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recently_sent
         FROM "${schema}".notifications`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT control_id, title, owner
       FROM "${schema}".controls
       WHERE test_status = 'failed'
         AND last_tested_at < CURRENT_DATE - INTERVAL '7 days'`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT vendor_id, name, owner_id, next_review_date
       FROM "${schema}".vendors
       WHERE next_review_date IS NOT NULL
         AND next_review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         AND status != 'terminated'`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT approval_id, approver_id, step_id, sla_deadline, execution_id
       FROM "${schema}".approvals
       WHERE status = 'pending'
         AND sla_deadline IS NOT NULL
         AND sla_deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours'`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT assessment_id, title, created_by
       FROM "${schema}".assessments
       WHERE status = 'in_progress'
         AND updated_at < CURRENT_DATE - INTERVAL '14 days'`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT evidence_id, title, submitted_by, expiry_date
       FROM "${schema}".evidence
       WHERE expiry_date IS NOT NULL
         AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, owner_id, review_date
       FROM "${schema}".policies
       WHERE review_date IS NOT NULL
         AND review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND status != 'archived'`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT task_id, title, assigned_to, due_date
       FROM "${schema}".remediation_tasks
       WHERE due_date IS NOT NULL
         AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND status NOT IN ('completed', 'overdue')`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_digest_subscriptions
       WHERE enabled = true
         AND (next_scheduled_at IS NULL OR next_scheduled_at <= NOW())
       ORDER BY next_scheduled_at ASC`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notification_digest_subscriptions
       SET last_sent_at = NOW(),
           next_scheduled_at = $1,
           updated_at = NOW()
       WHERE user_id = $2 AND frequency = $3`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT
       n.notification_id, n.type, n.title, n.body, n.link, n.read, n.created_at,
       COALESCE(n.type, 'general') AS module_code,
       'medium' AS priority
     FROM "${schema}".notifications n
     WHERE n.user_id = $1
       AND n.created_at > NOW() - INTERVAL '${windowHours} hours'
     ORDER BY n.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notification_digest_subscriptions
       SET enabled = false, updated_at = NOW()
       WHERE user_id = $1 ${extra}`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_digest_subscriptions ${where} ORDER BY frequency ASC`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_digest_subscriptions
       (subscription_id, user_id, frequency, module_filter, enabled, next_scheduled_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6)
     ON CONFLICT (user_id, frequency) DO UPDATE
       SET module_filter = EXCLUDED.module_filter,
           enabled = EXCLUDED.enabled,
           next_scheduled_at = EXCLUDED.next_scheduled_at,
           updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'notification','transition','notification',$3,$4,$5)`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notification_queue SET status = 'pending', updated_at = NOW() WHERE status = 'failed' RETURNING id`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at AS "createdAt" FROM "${schema}".notification_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'notification' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'notification','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT label_en, parent_nav_key FROM "${schema}".navigation_registry WHERE nav_key = $1`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT r.nav_key, r.label_en, COALESCE(b.is_allowed, true) AS is_allowed
             FROM "${schema}".navigation_registry r
             LEFT JOIN "${schema}".navigation_role_bindings b
               ON b.nav_key = r.nav_key AND b.role_code = $2
             WHERE r.route = $1 AND r.is_active = true
             LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT r.nav_key, r.label_en, r.module_code, r.parent_nav_key,
                COALESCE(b.is_allowed, true) AS is_allowed
         FROM "${schema}".navigation_registry r
         LEFT JOIN "${schema}".navigation_role_bindings b
           ON b.nav_key = r.nav_key AND b.role_code = $2
         WHERE r.route = $1 AND r.is_active = true
           AND (r.status = 'published' OR r.status IS NULL)
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".notifications
       WHERE user_id = $1 AND type = $2
         AND created_at > NOW() - INTERVAL '${windowHours} hours'`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_quiet_hours WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_quiet_hours
       (quiet_hours_id, user_id, start_hour, end_hour, timezone, days_of_week, enabled)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
     ON CONFLICT (user_id) DO UPDATE
       SET start_hour = EXCLUDED.start_hour,
           end_hour = EXCLUDED.end_hour,
           timezone = EXCLUDED.timezone,
           days_of_week = EXCLUDED.days_of_week,
           enabled = EXCLUDED.enabled,
           updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_role_preferences
         WHERE role = $1 AND channel = $2
           AND (event_type = $3 OR event_type IS NULL)
           AND (module_code = $4 OR module_code IS NULL)
         ORDER BY (event_type IS NOT NULL)::int DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_preferences
       WHERE user_id = $1 AND channel = $2
         AND (event_type = $3 OR event_type IS NULL)
         AND (module_code = $4 OR module_code IS NULL)
       ORDER BY
         (event_type IS NOT NULL)::int DESC,
         (module_code IS NOT NULL)::int DESC
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_preferences WHERE user_id = $1 ORDER BY channel ASC`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_preferences
       (preference_id, user_id, event_type, module_code, channel, enabled,
        frequency_limit, frequency_window_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id, channel, COALESCE(event_type,''), COALESCE(module_code,''))
     DO UPDATE SET enabled = EXCLUDED.enabled,
                   frequency_limit = EXCLUDED.frequency_limit,
                   frequency_window_hours = EXCLUDED.frequency_window_hours,
                   updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT user_id FROM "${schema}".enterprise_user_role_assignments
           WHERE platform_role = $1 AND is_active = TRUE
             AND (valid_to IS NULL OR valid_to > NOW())`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM "${schema}".team_members
           WHERE team_id = $1 AND active = TRUE`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT enabled, channels
       FROM "${schema}".notification_preferences
       WHERE user_id = $1
         AND activity_type = $2
         AND module = $3
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT rule_id, name, module, event, conditions, actions, enabled, priority
       FROM "${schema}".automation_rules
       WHERE enabled = TRUE
         AND deleted_at IS NULL
         AND (
           module = 'notification'
           OR actions::text LIKE '%notify%'
           OR actions::text LIKE '%notification%'
           OR actions::text LIKE '%send_notification%'
         )
       ORDER BY priority DESC, created_at ASC`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notification_templates SET is_active = false, updated_at = NOW() WHERE template_id = $1`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notification_templates SET ${sets.join(', ')} WHERE template_id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_templates
       WHERE event_type = $1 AND channel = $2 AND lang = $3 AND is_active = true
       ORDER BY version DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_templates WHERE template_id = $1`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notification_templates ${where} ORDER BY name ASC, lang ASC`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_templates
       (template_id, name, event_type, channel, lang,
        subject_template, body_template, variables, version, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,1,true) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".notifications WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notifications SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".notifications
     WHERE notification_id = $1`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notifications
     SET read = true, read_at = NOW()
     WHERE user_id = $1 AND read = false`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".notifications
     SET read = true, read_at = NOW()
     WHERE notification_id = $1`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue
       (recipient_id, notification_type, priority, subject, body, delivery_channel, status)
       VALUES ($1, $2, 'medium', $3, $4, 'email', 'pending')`;
    return safeQuery(query, args);
  }

}
