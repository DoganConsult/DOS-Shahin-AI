// ============================================
// Notification Service — minimal CRUD ported from monolith
// Source: modules/notification/source/backend/notification/services/notification.service.ts
// (only the functions actually called from ai-engine-service)
// ============================================

import { withTenantClient, getFirstRow } from '@dos/db';

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  severity?: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function createNotification(
  tenantId: string,
  data: NotificationInput,
): Promise<Notification> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `INSERT INTO notifications
         (user_id, type, title, body, link, entity_type, entity_id, module, severity, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())
       RETURNING *`,
      [
        data.userId,
        data.type,
        data.title,
        data.body ?? null,
        data.link ?? null,
        data.entityType ?? null,
        data.entityId ?? null,
        data.module ?? null,
        data.severity ?? null,
      ],
    );
    return getFirstRow(result) as Notification;
  });
}

export async function getNotifications(
  tenantId: string,
  userId: string,
): Promise<Notification[]> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows as Notification[];
  });
}

export async function markAsRead(
  tenantId: string,
  notificationId: string,
): Promise<Notification | null> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `UPDATE notifications SET read = true, read_at = NOW()
       WHERE notification_id = $1 RETURNING *`,
      [notificationId],
    );
    return (getFirstRow(result) as Notification) ?? null;
  });
}

export async function markAllAsRead(tenantId: string, userId: string): Promise<number> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `UPDATE notifications SET read = true, read_at = NOW()
       WHERE user_id = $1 AND read = false`,
      [userId],
    );
    return result.rowCount ?? 0;
  });
}
