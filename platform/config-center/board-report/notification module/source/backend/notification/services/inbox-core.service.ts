import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface InboxQueryOptions {
  tenantId: string;
  userId: string;
  page?: number;
  limit?: number;
  status?: string;
}

export async function listInbox(options: InboxQueryOptions): Promise<{ items: unknown[]; total: number }> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const offset = (page - 1) * limit;

  const conditions: string[] = ['tenant_id = $1', 'user_id = $2'];
  const params: unknown[] = [options.tenantId, options.userId];

  if (options.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(options.status);
  }

  const where = conditions.join(' AND ');

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.notifications WHERE ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const result = await safeQuery(
      `SELECT notification_id, tenant_id, user_id, title, body, type, channel, module,
              entity_type, entity_id, status, metadata, created_at, read_at, sent_at
       FROM dos.notifications
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return { items: result.rows, total };
  } catch (err) {
    logger.error('[notification-service] Failed to list inbox', { tenantId: options.tenantId, userId: options.userId, error: toErrorMessage(err) });
    return { items: [], total: 0 };
  }
}

export async function getInboxCount(tenantId: string, userId: string): Promise<{ total: number; unread: number }> {
  try {
    const result = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status != 'read')::int AS unread
       FROM dos.notifications
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    const row = result.rows[0];
    return { total: row?.total || 0, unread: row?.unread || 0 };
  } catch (err) {
    logger.error('[notification-service] Failed to get inbox count', { tenantId, userId, error: toErrorMessage(err) });
    return { total: 0, unread: 0 };
  }
}

export async function markInboxItemRead(tenantId: string, userId: string, notificationId: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notifications
       SET status = 'read', read_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND notification_id = $3 AND status != 'read'
       RETURNING notification_id`,
      [tenantId, userId, notificationId],
    );
    return (result.rowCount || 0) > 0;
  } catch (err) {
    logger.error('[notification-service] Failed to mark inbox item read', { tenantId, userId, notificationId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function markAllInboxRead(tenantId: string, userId: string): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notifications
       SET status = 'read', read_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND status != 'read'`,
      [tenantId, userId],
    );
    return result.rowCount || 0;
  } catch (err) {
    logger.error('[notification-service] Failed to mark all inbox read', { tenantId, userId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function dismissInboxItem(tenantId: string, userId: string, notificationId: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notifications
       SET status = 'dismissed'
       WHERE tenant_id = $1 AND user_id = $2 AND notification_id = $3 AND status != 'dismissed'
       RETURNING notification_id`,
      [tenantId, userId, notificationId],
    );
    return (result.rowCount || 0) > 0;
  } catch (err) {
    logger.error('[notification-service] Failed to dismiss inbox item', { tenantId, userId, notificationId, error: toErrorMessage(err) });
    throw err;
  }
}

export const InboxService = {
  listInbox,
  getInboxCount,
  markInboxItemRead,
  markAllInboxRead,
  dismissInboxItem,
};
