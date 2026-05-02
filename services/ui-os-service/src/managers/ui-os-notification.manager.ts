import type { DbPool } from '../db.js';

/**
 * Wave 11e-§9 Notifications/Inbox — manager for 7 §9 tables (migrations
 * 20260502_0111/0112): notification_center_items, notification_preferences,
 * notification_read_state, inbox_views, inbox_rules, inbox_snoozes,
 * inbox_assignments.
 */
export class UiOsNotificationManager {
  constructor(private readonly pool: DbPool) {}

  // ── Notification center items ────────────────────────────────
  async listInbox(tenantId: string, userId: string, opts: { unreadOnly?: boolean; category?: string | null; limit?: number }) {
    const { rows } = await this.pool.query(
      `SELECT n.id::text, n.category, n.severity::text AS severity,
              n.title_key, n.body_key, n.payload, n.link_url,
              n.source_event_id, n.expires_at, n.created_at,
              r.read_at, r.dismissed_at
         FROM dos.ui_notification_center_items n
         LEFT JOIN dos.ui_notification_read_state r
           ON r.notification_id=n.id AND r.user_id=$2
        WHERE n.tenant_id=$1 AND n.recipient_user_id=$2
          AND (n.expires_at IS NULL OR n.expires_at > NOW())
          AND ($3::boolean IS NULL OR ($3=TRUE AND r.read_at IS NULL))
          AND ($4::text IS NULL OR n.category=$4)
        ORDER BY n.created_at DESC LIMIT $5`,
      [tenantId, userId, opts.unreadOnly ?? null, opts.category ?? null, Math.min(opts.limit ?? 100, 500)]);
    return rows;
  }
  async createNotification(tenantId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_notification_center_items
        (tenant_id, recipient_user_id, category, severity, title_key, body_key,
         payload, link_url, source_event_id, expires_at)
       VALUES ($1,$2,$3,COALESCE($4,'info')::dos.ui_notification_severity_t,
               $5,$6,COALESCE($7::jsonb,'{}'::jsonb),$8,$9,$10::timestamptz)
       RETURNING id::text, category, severity::text AS severity, created_at`,
      [tenantId, body.recipient_user_id, body.category, body.severity ?? null,
       body.title_key ?? null, body.body_key ?? null,
       body.payload !== undefined ? JSON.stringify(body.payload) : null,
       body.link_url ?? null, body.source_event_id ?? null, body.expires_at ?? null]);
    return rows[0];
  }
  async markRead(tenantId: string, userId: string, notificationId: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_notification_read_state (tenant_id, notification_id, user_id, read_at)
       VALUES ($1, $2::uuid, $3, NOW())
       ON CONFLICT (notification_id, user_id) DO UPDATE SET read_at=NOW()
       RETURNING id::text, read_at`,
      [tenantId, notificationId, userId]);
    return rows[0];
  }
  async markDismissed(tenantId: string, userId: string, notificationId: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_notification_read_state (tenant_id, notification_id, user_id, dismissed_at)
       VALUES ($1, $2::uuid, $3, NOW())
       ON CONFLICT (notification_id, user_id) DO UPDATE SET dismissed_at=NOW()
       RETURNING id::text, dismissed_at`,
      [tenantId, notificationId, userId]);
    return rows[0];
  }
  async unreadCount(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count
         FROM dos.ui_notification_center_items n
         LEFT JOIN dos.ui_notification_read_state r
           ON r.notification_id=n.id AND r.user_id=$2
        WHERE n.tenant_id=$1 AND n.recipient_user_id=$2
          AND (n.expires_at IS NULL OR n.expires_at > NOW())
          AND r.read_at IS NULL`,
      [tenantId, userId]);
    return rows[0]?.count ?? 0;
  }

  // ── Notification preferences ─────────────────────────────────
  async listPreferences(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, channel::text AS channel, category, enabled,
              digest_window::text AS digest_window
         FROM dos.ui_notification_preferences
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY channel, category`,
      [tenantId, userId]);
    return rows;
  }
  async upsertPreference(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_notification_preferences
        (tenant_id, user_id, channel, category, enabled, digest_window)
       VALUES ($1,$2,$3::dos.ui_notification_channel_t,$4,
               COALESCE($5,TRUE),COALESCE($6,'instant')::dos.ui_notification_digest_window_t)
       ON CONFLICT (tenant_id, user_id, channel, category) DO UPDATE
         SET enabled=EXCLUDED.enabled,
             digest_window=EXCLUDED.digest_window, updated_at=NOW()
       RETURNING id::text, channel::text AS channel, category, enabled, digest_window::text AS digest_window`,
      [tenantId, userId, body.channel, body.category,
       body.enabled ?? null, body.digest_window ?? null]);
    return rows[0];
  }

  // ── Inbox views ──────────────────────────────────────────────
  async listViews(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, view_key, name_key, filters, is_default, is_active
         FROM dos.ui_inbox_views
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY is_default DESC, view_key`,
      [tenantId, userId]);
    return rows;
  }
  async upsertView(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_inbox_views
        (tenant_id, user_id, view_key, name_key, filters, is_default, is_active)
       VALUES ($1,$2,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),COALESCE($6,FALSE),COALESCE($7,TRUE))
       ON CONFLICT (tenant_id, user_id, view_key) DO UPDATE
         SET name_key=EXCLUDED.name_key,
             filters=EXCLUDED.filters,
             is_default=EXCLUDED.is_default,
             is_active=EXCLUDED.is_active, updated_at=NOW()
       RETURNING id::text, view_key, is_default, is_active`,
      [tenantId, userId, body.view_key, body.name_key ?? null,
       body.filters !== undefined ? JSON.stringify(body.filters) : null,
       body.is_default ?? null, body.is_active ?? null]);
    return rows[0];
  }
  async deleteView(tenantId: string, userId: string, viewId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_inbox_views WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid`,
      [tenantId, userId, viewId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Inbox rules ──────────────────────────────────────────────
  async listRules(tenantId: string, userId: string | null) {
    const { rows } = await this.pool.query(
      `SELECT id::text, user_id, rule_key, match_expression, action,
              priority, is_enabled
         FROM dos.ui_inbox_rules
        WHERE tenant_id=$1 AND ($2::text IS NOT DISTINCT FROM user_id)
        ORDER BY priority, rule_key`,
      [tenantId, userId]);
    return rows;
  }
  async upsertRule(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_inbox_rules
        (tenant_id, user_id, rule_key, match_expression, action, priority, is_enabled, created_by, updated_by)
       VALUES ($1,$2,$3,COALESCE($4::jsonb,'{}'::jsonb),COALESCE($5::jsonb,'{}'::jsonb),
               COALESCE($6,100),COALESCE($7,TRUE),$8,$8)
       ON CONFLICT (tenant_id, user_id, rule_key) DO UPDATE
         SET match_expression=EXCLUDED.match_expression,
             action=EXCLUDED.action,
             priority=EXCLUDED.priority,
             is_enabled=EXCLUDED.is_enabled,
             updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING id::text, rule_key, priority, is_enabled`,
      [tenantId, body.user_id ?? null, body.rule_key,
       body.match_expression !== undefined ? JSON.stringify(body.match_expression) : null,
       body.action !== undefined ? JSON.stringify(body.action) : null,
       body.priority ?? null, body.is_enabled ?? null, userId]);
    return rows[0];
  }
  async deleteRule(tenantId: string, ruleId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_inbox_rules WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenantId, ruleId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Inbox snoozes ────────────────────────────────────────────
  async listSnoozes(tenantId: string, userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, notification_id::text AS notification_id, snooze_until, reason, created_at
         FROM dos.ui_inbox_snoozes
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY snooze_until`,
      [tenantId, userId]);
    return rows;
  }
  async upsertSnooze(tenantId: string, userId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_inbox_snoozes (tenant_id, notification_id, user_id, snooze_until, reason)
       VALUES ($1,$2::uuid,$3,$4::timestamptz,$5)
       ON CONFLICT (notification_id, user_id) DO UPDATE
         SET snooze_until=EXCLUDED.snooze_until, reason=EXCLUDED.reason
       RETURNING id::text, notification_id::text AS notification_id, snooze_until`,
      [tenantId, body.notification_id, userId, body.snooze_until, body.reason ?? null]);
    return rows[0];
  }
  async deleteSnooze(tenantId: string, userId: string, snoozeId: string) {
    const r = await this.pool.query(
      `DELETE FROM dos.ui_inbox_snoozes WHERE tenant_id=$1 AND user_id=$2 AND id=$3::uuid`,
      [tenantId, userId, snoozeId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ── Inbox assignments ────────────────────────────────────────
  async listAssignments(tenantId: string, assigneeUserId: string) {
    const { rows } = await this.pool.query(
      `SELECT id::text, notification_id::text AS notification_id,
              assigner_user_id, assignee_user_id, note, assigned_at, acknowledged_at
         FROM dos.ui_inbox_assignments
        WHERE tenant_id=$1 AND assignee_user_id=$2
        ORDER BY assigned_at DESC`,
      [tenantId, assigneeUserId]);
    return rows;
  }
  async createAssignment(tenantId: string, assignerUserId: string, body: any) {
    const { rows } = await this.pool.query(
      `INSERT INTO dos.ui_inbox_assignments
        (tenant_id, notification_id, assigner_user_id, assignee_user_id, note)
       VALUES ($1,$2::uuid,$3,$4,$5)
       ON CONFLICT (notification_id, assignee_user_id) DO UPDATE
         SET assigner_user_id=EXCLUDED.assigner_user_id,
             note=EXCLUDED.note, assigned_at=NOW(), acknowledged_at=NULL
       RETURNING id::text, notification_id::text AS notification_id, assignee_user_id, assigned_at`,
      [tenantId, body.notification_id, assignerUserId, body.assignee_user_id, body.note ?? null]);
    return rows[0];
  }
  async acknowledgeAssignment(tenantId: string, assigneeUserId: string, assignmentId: string) {
    const { rows } = await this.pool.query(
      `UPDATE dos.ui_inbox_assignments
          SET acknowledged_at=NOW()
        WHERE tenant_id=$1 AND assignee_user_id=$2 AND id=$3::uuid
        RETURNING id::text, acknowledged_at`,
      [tenantId, assigneeUserId, assignmentId]);
    return rows[0] ?? null;
  }
}
