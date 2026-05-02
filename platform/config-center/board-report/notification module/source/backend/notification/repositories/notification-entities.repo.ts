import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';
import { getFirstRow } from '../../../utils/db-utils';

/**
 * Notification module entities repository — 11 tables.
 * Tables: notifications, notification_templates, notification_channels,
 *   notification_preferences, notification_rules, notification_batches,
 *   notification_subscriptions, email_templates, mobile_push_tokens,
 *   push_tokens, notifications_log
 */
export class NotificationEntitiesRepository {
  private readonly schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // ── notifications ───────────────────────────────────────────────────
  async findNotificationById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".notifications WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllNotifications(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notifications WHERE deleted_at IS NULL`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notifications WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createNotification(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notifications (recipient_id, channel, subject, body, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.recipient_id, data.channel, data.subject, data.body, data.status || 'pending', data.priority || 'normal', data.created_by],
    );
    return getFirstRow(result);
  }

  // ── notification_templates ──────────────────────────────────────────
  async findTemplateById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_templates WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllTemplates(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notification_templates WHERE deleted_at IS NULL`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_templates WHERE deleted_at IS NULL ORDER BY name ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createTemplate(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notification_templates (name, channel, subject_template, body_template, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.channel, data.subject_template, data.body_template, data.variables, data.created_by],
    );
    return getFirstRow(result);
  }

  // ── notification_channels ───────────────────────────────────────────
  async findChannelById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_channels WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllChannels(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notification_channels WHERE deleted_at IS NULL`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_channels WHERE deleted_at IS NULL ORDER BY name ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createChannel(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notification_channels (name, channel_type, provider, config, is_enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.channel_type, data.provider, data.config, data.is_enabled ?? true, data.created_by],
    );
    return getFirstRow(result);
  }

  // ── notification_preferences ────────────────────────────────────────
  async findPreferenceById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_preferences WHERE id = $1`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllPreferences(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notification_preferences`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_preferences ORDER BY user_id ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createPreference(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notification_preferences (user_id, channel, event_type, is_enabled, quiet_hours_start, quiet_hours_end)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.user_id, data.channel, data.event_type, data.is_enabled ?? true, data.quiet_hours_start, data.quiet_hours_end],
    );
    return getFirstRow(result);
  }

  // ── notification_rules ──────────────────────────────────────────────
  async findRuleById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_rules WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllRules(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notification_rules WHERE deleted_at IS NULL`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_rules WHERE deleted_at IS NULL ORDER BY priority ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createRule(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notification_rules (name, event_type, condition_expression, channel, template_id, priority, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.name, data.event_type, data.condition_expression, data.channel, data.template_id, data.priority || 0, data.is_active ?? true, data.created_by],
    );
    return getFirstRow(result);
  }

  // ── notification_batches ────────────────────────────────────────────
  async findBatchById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_batches WHERE id = $1`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllBatches(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notification_batches`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_batches ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createBatch(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notification_batches (name, channel, template_id, recipient_filter, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.name, data.channel, data.template_id, data.recipient_filter, data.status || 'pending', data.scheduled_at, data.created_by],
    );
    return getFirstRow(result);
  }

  // ── notification_subscriptions ──────────────────────────────────────
  async findSubscriptionById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_subscriptions WHERE id = $1`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllSubscriptions(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notification_subscriptions`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notification_subscriptions ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createSubscription(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notification_subscriptions (user_id, topic, channel, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.user_id, data.topic, data.channel, data.is_active ?? true],
    );
    return getFirstRow(result);
  }

  // ── email_templates ─────────────────────────────────────────────────
  async findEmailTemplateById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".email_templates WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllEmailTemplates(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".email_templates WHERE deleted_at IS NULL`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".email_templates WHERE deleted_at IS NULL ORDER BY name ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createEmailTemplate(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".email_templates (name, subject, html_body, text_body, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.subject, data.html_body, data.text_body, data.variables, data.created_by],
    );
    return getFirstRow(result);
  }

  // ── mobile_push_tokens ──────────────────────────────────────────────
  async findMobilePushTokenById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".mobile_push_tokens WHERE id = $1`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllMobilePushTokens(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".mobile_push_tokens`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".mobile_push_tokens ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createMobilePushToken(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".mobile_push_tokens (user_id, device_id, platform, token, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.user_id, data.device_id, data.platform, data.token, data.is_active ?? true],
    );
    return getFirstRow(result);
  }

  // ── push_tokens ─────────────────────────────────────────────────────
  async findPushTokenById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".push_tokens WHERE id = $1`,
      [id],
    );
    return getFirstRow(result);
  }

  async findAllPushTokens(page = 1, pageSize = 20): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".push_tokens`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".push_tokens ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }

  async createPushToken(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".push_tokens (user_id, endpoint, auth_key, p256dh_key, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.user_id, data.endpoint, data.auth_key, data.p256dh_key, data.is_active ?? true],
    );
    return getFirstRow(result);
  }

  // ── notifications_log (log table: insert + list) ────────────────────
  async insertNotificationLog(data: GenericRow): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".notifications_log (notification_id, event_type, channel, status, details, error_message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.notification_id, data.event_type, data.channel, data.status, data.details, data.error_message],
    );
    return getFirstRow(result);
  }

  async listNotificationLog(page = 1, pageSize = 50): Promise<{ rows: GenericRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".notifications_log`,
    );
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".notifications_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    );
    return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
  }
}
