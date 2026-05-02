import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';
import { publishNotificationCreated, publishNotificationSent, publishNotificationRead } from '../events/publisher';
import { deliverViaEmail, deliverViaWebhook, deliverViaPagerDuty, deliverViaOpsGenie } from './delivery.service';

export interface NotificationRecord {
  notification_id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  module: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  sent_at: string | null;
}

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  channel?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
  userId?: string;
  status?: string;
  type?: string;
  channel?: string;
  limit?: number;
  offset?: number;
}

export async function createNotification(input: CreateNotificationInput): Promise<{ notificationId: string }> {
  try {
    const result = await safeQuery(
      `INSERT INTO dos.notifications
         (tenant_id, user_id, title, body, type, channel, module, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING notification_id`,
      [
        input.tenantId,
        input.userId,
        input.title,
        input.body,
        input.type,
        input.channel || 'inbox',
        input.module || null,
        input.entityType || null,
        input.entityId || null,
        JSON.stringify(input.metadata || {}),
      ],
    );
    const notificationId = result.rows[0].notification_id;
    logger.info('[notification-service] Notification created', { notificationId, tenantId: input.tenantId, userId: input.userId });
    await publishNotificationCreated(input.tenantId, notificationId, input.userId, {
      title: input.title,
      body: input.body,
      type: input.type,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
    }).catch(() => {});
    return { notificationId };
  } catch (err) {
    logger.error('[notification-service] Failed to create notification', { tenantId: input.tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getNotification(tenantId: string, notificationId: string): Promise<NotificationRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT notification_id, tenant_id, user_id, title, body, type, channel, module,
              entity_type, entity_id, status, metadata, created_at, read_at, sent_at
       FROM dos.notifications
       WHERE tenant_id = $1 AND notification_id = $2`,
      [tenantId, notificationId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as NotificationRecord;
  } catch (err) {
    logger.error('[notification-service] Failed to get notification', { tenantId, notificationId, error: toErrorMessage(err) });
    return null;
  }
}

export async function listNotifications(
  tenantId: string,
  filters: NotificationFilters = {},
): Promise<{ data: NotificationRecord[]; total: number }> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters.userId !== undefined) {
    conditions.push(`user_id = $${idx}`);
    params.push(filters.userId);
    idx++;
  }
  if (filters.status !== undefined) {
    conditions.push(`status = $${idx}`);
    params.push(filters.status);
    idx++;
  }
  if (filters.type !== undefined) {
    conditions.push(`type = $${idx}`);
    params.push(filters.type);
    idx++;
  }
  if (filters.channel !== undefined) {
    conditions.push(`channel = $${idx}`);
    params.push(filters.channel);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters.limit || 50, 200);
  const offset = filters.offset || 0;

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.notifications ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT notification_id, tenant_id, user_id, title, body, type, channel, module,
              entity_type, entity_id, status, metadata, created_at, read_at, sent_at
       FROM dos.notifications ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as NotificationRecord[], total };
  } catch (err) {
    logger.error('[notification-service] Failed to list notifications', { tenantId, error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

export async function markNotificationRead(tenantId: string, notificationId: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notifications
       SET status = 'read', read_at = NOW()
       WHERE tenant_id = $1 AND notification_id = $2 AND status != 'read'
       RETURNING user_id`,
      [tenantId, notificationId],
    );
    const row = result.rows[0];
    if (row) {
      await publishNotificationRead(tenantId, notificationId, row.user_id).catch(() => {});
      logger.info('[notification-service] Notification marked read', { tenantId, notificationId });
    }
    return (result.rowCount || 0) > 0;
  } catch (err) {
    logger.error('[notification-service] Failed to mark notification read', { tenantId, notificationId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function markAllRead(tenantId: string, userId: string): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notifications
       SET status = 'read', read_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND status != 'read'`,
      [tenantId, userId],
    );
    const count = result.rowCount || 0;
    logger.info('[notification-service] All notifications marked read', { tenantId, userId, count });
    return count;
  } catch (err) {
    logger.error('[notification-service] Failed to mark all read', { tenantId, userId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function deleteNotification(tenantId: string, notificationId: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `DELETE FROM dos.notifications
       WHERE tenant_id = $1 AND notification_id = $2`,
      [tenantId, notificationId],
    );
    const deleted = (result.rowCount || 0) > 0;
    if (deleted) {
      logger.info('[notification-service] Notification deleted', { tenantId, notificationId });
    }
    return deleted;
  } catch (err) {
    logger.error('[notification-service] Failed to delete notification', { tenantId, notificationId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getUnreadCount(tenantId: string, userId: string): Promise<number> {
  try {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS count FROM dos.notifications
       WHERE tenant_id = $1 AND user_id = $2 AND status != 'read'`,
      [tenantId, userId],
    );
    return result.rows[0]?.count || 0;
  } catch (err) {
    logger.error('[notification-service] Failed to get unread count', { tenantId, userId, error: toErrorMessage(err) });
    return 0;
  }
}

export async function sendViaChannel(
  tenantId: string,
  notificationId: string,
  channel: string,
  target: string,
): Promise<void> {
  const notification = await getNotification(tenantId, notificationId);
  if (!notification) throw new Error('Notification not found');

  if (channel === 'email') {
    await deliverViaEmail(target, notification.title, notification.body);
  } else if (channel === 'webhook') {
    await deliverViaWebhook(target, { title: notification.title, body: notification.body });
  } else if (channel === 'pagerduty') {
    await deliverViaPagerDuty(notification.title, 'warning', 'dos-platform', notificationId);
  } else if (channel === 'opsgenie') {
    await deliverViaOpsGenie(notification.title, 'P3', { body: notification.body }, notificationId);
  }

  await safeQuery(
    `UPDATE dos.notifications SET status = 'sent', sent_at = NOW() WHERE notification_id = $1`,
    [notificationId],
  );

  await publishNotificationSent(tenantId, notificationId, notification.user_id, channel).catch(() => {});
}

export const NotificationService = {
  createNotification,
  getNotification,
  listNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  sendViaChannel,
};
