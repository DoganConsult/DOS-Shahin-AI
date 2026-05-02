/**
 * NotificationService — Real DB implementation
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'slack' | 'teams' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'dismissed';

export interface CreateNotificationInput {
  tenantId: string;
  recipientId: string;
  notificationType: string;
  title: string;
  body: string;
  channel?: NotificationChannel;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<string> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.notifications
       (id, tenant_id, recipient_id, notification_type, title, body, channel,
        entity_type, entity_id, action_url, metadata, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
    [id, input.tenantId, input.recipientId, input.notificationType,
     input.title, input.body, input.channel || 'in_app',
     input.entityType || null, input.entityId || null,
     input.actionUrl || null, JSON.stringify(input.metadata || {})],
  );

  // Also create inbox item for in_app notifications
  if (!input.channel || input.channel === 'in_app') {
    await createInboxItem({
      tenantId: input.tenantId,
      recipientId: input.recipientId,
      notificationId: id,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }

  logger.info('[Notification] Created', { id, recipientId: input.recipientId, type: input.notificationType });
  return id;
}

export async function markNotificationSent(notificationId: string, tenantId: string): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.notifications
     SET status = 'sent', sent_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [notificationId, tenantId],
  );
}

export async function markNotificationRead(notificationId: string, tenantId: string, userId: string): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.notifications
     SET status = 'delivered', read_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND recipient_id = $3`,
    [notificationId, tenantId, userId],
  );
}

export async function getUnreadCount(tenantId: string, userId: string): Promise<number> {
  const result = await safeQuery(
    `SELECT COUNT(*)::int AS count FROM __TENANT_SCHEMA__.notifications
     WHERE tenant_id = $1 AND recipient_id = $2 AND read_at IS NULL AND status != 'dismissed'`,
    [tenantId, userId],
  );
  return (result.rows[0] as { count: number })?.count || 0;
}

export async function listNotifications(
  tenantId: string,
  userId: string,
  limit = 50,
  offset = 0,
): Promise<{ data: unknown[]; total: number }> {
  const [countRes, dataRes] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.notifications
       WHERE tenant_id = $1 AND recipient_id = $2 AND status != 'dismissed'`,
      [tenantId, userId],
    ),
    safeQuery(
      `SELECT id, notification_type, title, body, channel, entity_type, entity_id,
              action_url, status, sent_at, read_at, created_at
       FROM __TENANT_SCHEMA__.notifications
       WHERE tenant_id = $1 AND recipient_id = $2 AND status != 'dismissed'
       ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [tenantId, userId, limit, offset],
    ),
  ]);
  return {
    data: dataRes.rows,
    total: (countRes.rows[0] as { total: number })?.total || 0,
  };
}

// ─── Inbox ──────────────────────────────────────────────────────────────────

export async function createInboxItem(input: {
  tenantId: string;
  recipientId: string;
  notificationId?: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<string> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.inbox_items
       (id, tenant_id, recipient_id, notification_id, title, body, entity_type, entity_id, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, input.tenantId, input.recipientId, input.notificationId || null,
     input.title, input.body || null, input.entityType || null, input.entityId || null,
     input.priority || 'normal'],
  );
  return id;
}

export async function markInboxRead(itemId: string, tenantId: string, userId: string): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.inbox_items
     SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND recipient_id = $3`,
    [itemId, tenantId, userId],
  );
}

export async function getInboxItems(
  tenantId: string,
  userId: string,
  limit = 50,
  offset = 0,
): Promise<{ data: unknown[]; unreadCount: number }> {
  const [dataRes, countRes] = await Promise.all([
    safeQuery(
      `SELECT id, notification_id, title, body, entity_type, entity_id,
              priority, is_read, is_archived, read_at, created_at
       FROM __TENANT_SCHEMA__.inbox_items
       WHERE tenant_id = $1 AND recipient_id = $2 AND is_archived = FALSE
       ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [tenantId, userId, limit, offset],
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS count FROM __TENANT_SCHEMA__.inbox_items
       WHERE tenant_id = $1 AND recipient_id = $2 AND is_read = FALSE AND is_archived = FALSE`,
      [tenantId, userId],
    ),
  ]);
  return {
    data: dataRes.rows,
    unreadCount: (countRes.rows[0] as { count: number })?.count || 0,
  };
}

export const NotificationService = {
  createNotification,
  markNotificationSent,
  markNotificationRead,
  getUnreadCount,
  listNotifications,
  createInboxItem,
  markInboxRead,
  getInboxItems,
};
