import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface InboxItemRecord {
  item_id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  source_module: string;
  entity_type: string;
  entity_id: string;
  action_url: string;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string | null;
}

export interface CreateInboxItemInput {
  user_id: string;
  title: string;
  body?: string;
  type: string;
  category?: string;
  priority?: string;
  status?: string;
  source_module?: string;
  entity_type: string;
  entity_id?: string;
  action_url?: string;
  read_at?: string;
  dismissed_at?: string;
}

export interface ListInboxItemOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `item_id, tenant_id, user_id, title, body, type, category, priority, status, source_module, entity_type, entity_id, action_url, read_at, dismissed_at, created_at`;

export async function list(
  tenantId: string,
  options: ListInboxItemOptions = {},
): Promise<{ data: InboxItemRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (options.status) {
    conditions.push(`status = $${idx}`);
    params.push(options.status);
    idx++;
  }

  if (options.search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${options.search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortCol = options.sortBy && ['created_at', 'updated_at', 'title', 'status'].includes(options.sortBy) ? options.sortBy : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.notification_inbox ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.notification_inbox ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as InboxItemRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to list inbox-items', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<InboxItemRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.notification_inbox WHERE tenant_id = $1 AND item_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as InboxItemRecord) || null;
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to get inbox-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateInboxItemInput): Promise<InboxItemRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.notification_inbox (item_id, tenant_id, user_id, title, body, type, category, priority, status, source_module, entity_type, entity_id, action_url, read_at, dismissed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.user_id ?? null, input.title ?? null, input.body ?? null, input.type ?? null, input.category ?? null, input.priority ?? null, input.status ?? null, input.source_module ?? null, input.entity_type ?? null, input.entity_id ?? null, input.action_url ?? null, input.read_at ?? null, input.dismissed_at ?? null],
    );
    logger.info('[notification-inbox-service] InboxItem created', { id, tenantId });
    return result.rows[0] as InboxItemRecord;
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to create inbox-item', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateInboxItemInput>): Promise<InboxItemRecord | null> {
  const existing = await getById(tenantId, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [tenantId, id];
  let idx = 3;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${col} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push('updated_at = NOW()');

  try {
    const result = await safeQuery(
      `UPDATE dos.notification_inbox SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND item_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[notification-inbox-service] InboxItem updated', { id, tenantId });
    return (result.rows[0] as InboxItemRecord) || null;
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to update inbox-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notification_inbox SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND item_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[notification-inbox-service] InboxItem deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to delete inbox-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<InboxItemRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notification_inbox SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND item_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows[0]) {
      logger.info('[notification-inbox-service] InboxItem restored', { id, tenantId });
      return result.rows[0] as InboxItemRecord;
    }
    return null;
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to restore inbox-item', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateInboxItemInput[]): Promise<InboxItemRecord[]> {
  const results: InboxItemRecord[] = [];
  for (const item of items) {
    results.push(await create(tenantId, item));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.notification_inbox SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND item_id = ANY($2) AND deleted_at IS NULL`,
      [tenantId, ids],
    );
    logger.info('[notification-inbox-service] InboxItems bulk deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to bulk delete inbox-items', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.notification_inbox WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.notification_inbox WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[notification-inbox-service] Failed to get inbox-item stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/notification with try/catch guards

/**
 * Create notification via module core service.
 */
export async function createNotification(tenantId: string, input: Record<string, unknown>): Promise<unknown> {
  try {
    const mod = require('../../../modules/notification/dist/notification/services/notification-core.service') as any;
    return mod.createNotification({ tenantId, ...input });
  } catch (err) {
    logger.warn('[notification-inbox-service] Module createNotification unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get notification preferences for a user.
 */
export async function getNotificationPreferences(tenantId: string, userId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/notification/dist/notification/services/notification-preference.service') as any;
    return mod.getNotificationPreferences(tenantId, userId);
  } catch (err) {
    logger.warn('[notification-inbox-service] Module getNotificationPreferences unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Generate notification digest for a user.
 */
export async function generateDigest(tenantId: string, userId: string, frequency?: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/notification/dist/notification/services/notification-digest.service') as any;
    return mod.generateDigest(tenantId, userId, frequency);
  } catch (err) {
    logger.warn('[notification-inbox-service] Module generateDigest unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get notification analytics/dashboard data.
 */
export async function getNotificationDashboard(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/notification/dist/notification/services/notification-dashboard.service') as any;
    return mod.getNotificationDashboard(tenantId);
  } catch (err) {
    logger.warn('[notification-inbox-service] Module getNotificationDashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get notification channel configuration.
 */
export async function getChannelConfig(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/notification/dist/notification/services/notification-channel.service') as any;
    return mod.getChannelConfig(tenantId);
  } catch (err) {
    logger.warn('[notification-inbox-service] Module getChannelConfig unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Check deadline-based notification triggers.
 */
export async function checkDeadlines(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/notification/dist/notification/services/notification-deadline-checks') as any;
    return mod.checkDeadlines(tenantId);
  } catch (err) {
    logger.warn('[notification-inbox-service] Module checkDeadlines unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

export async function advancedFilter(
  tenantId: string,
  userId: string,
  filters: {
    type?: string;
    category?: string;
    priority?: string;
    sourceModule?: string;
    isRead?: boolean;
    isDismissed?: boolean;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  },
): Promise<{ data: InboxItemRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1', 'user_id = $2', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId, userId];
  let idx = 3;

  if (filters.type) { conditions.push(`type = $${idx++}`); params.push(filters.type); }
  if (filters.category) { conditions.push(`category = $${idx++}`); params.push(filters.category); }
  if (filters.priority) { conditions.push(`priority = $${idx++}`); params.push(filters.priority); }
  if (filters.sourceModule) { conditions.push(`source_module = $${idx++}`); params.push(filters.sourceModule); }
  if (filters.isRead === true) { conditions.push('read_at IS NOT NULL'); }
  if (filters.isRead === false) { conditions.push('read_at IS NULL'); }
  if (filters.isDismissed === true) { conditions.push('dismissed_at IS NOT NULL'); }
  if (filters.isDismissed === false) { conditions.push('dismissed_at IS NULL'); }
  if (filters.dateFrom) { conditions.push(`created_at >= $${idx++}`); params.push(filters.dateFrom); }
  if (filters.dateTo) { conditions.push(`created_at <= $${idx++}`); params.push(filters.dateTo); }
  if (filters.search) { conditions.push(`(title ILIKE $${idx} OR body ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }

  const where = conditions.join(' AND ');
  const sortField = /^[a-z_]+$/i.test(filters.sortBy || '') ? filters.sortBy : 'created_at';
  const sortDir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const [countRes, dataRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM dos.inbox_items WHERE ${where}`, params).catch(() => ({ rows: [{ total: 0 }] })),
    safeQuery(`SELECT ${COLUMNS} FROM dos.inbox_items WHERE ${where} ORDER BY ${sortField} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`, params).catch(() => ({ rows: [] })),
  ]);

  return { data: dataRes.rows as InboxItemRecord[], total: (countRes.rows[0] as any)?.total || 0, page, pageSize };
}

export async function markAsRead(
  tenantId: string,
  userId: string,
  itemIds: string[],
): Promise<{ updated: number }> {
  if (itemIds.length === 0) return { updated: 0 };
  const placeholders = itemIds.map((_, i) => `$${i + 3}`).join(', ');
  const result = await safeQuery(
    `UPDATE dos.inbox_items SET read_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND user_id = $2 AND item_id IN (${placeholders}) AND read_at IS NULL`,
    [tenantId, userId, ...itemIds],
  ).catch(() => ({ rowCount: 0 }));
  return { updated: result.rowCount };
}

export async function markAllAsRead(
  tenantId: string,
  userId: string,
): Promise<{ updated: number }> {
  const result = await safeQuery(
    `UPDATE dos.inbox_items SET read_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND user_id = $2 AND read_at IS NULL AND deleted_at IS NULL`,
    [tenantId, userId],
  ).catch(() => ({ rowCount: 0 }));
  return { updated: result.rowCount };
}

export async function dismissItems(
  tenantId: string,
  userId: string,
  itemIds: string[],
): Promise<{ updated: number }> {
  if (itemIds.length === 0) return { updated: 0 };
  const placeholders = itemIds.map((_, i) => `$${i + 3}`).join(', ');
  const result = await safeQuery(
    `UPDATE dos.inbox_items SET dismissed_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND user_id = $2 AND item_id IN (${placeholders}) AND dismissed_at IS NULL`,
    [tenantId, userId, ...itemIds],
  ).catch(() => ({ rowCount: 0 }));
  return { updated: result.rowCount };
}

export async function getUnreadCount(
  tenantId: string,
  userId: string,
): Promise<{ total: number; byPriority: Record<string, number>; byModule: Record<string, number> }> {
  const [totalRes, priorityRes, moduleRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM dos.inbox_items WHERE tenant_id = $1 AND user_id = $2 AND read_at IS NULL AND dismissed_at IS NULL AND deleted_at IS NULL`, [tenantId, userId]).catch(() => ({ rows: [{ total: 0 }] })),
    safeQuery(`SELECT COALESCE(priority, 'normal') AS priority, COUNT(*)::int AS count FROM dos.inbox_items WHERE tenant_id = $1 AND user_id = $2 AND read_at IS NULL AND dismissed_at IS NULL AND deleted_at IS NULL GROUP BY priority`, [tenantId, userId]).catch(() => ({ rows: [] })),
    safeQuery(`SELECT COALESCE(source_module, 'system') AS source_module, COUNT(*)::int AS count FROM dos.inbox_items WHERE tenant_id = $1 AND user_id = $2 AND read_at IS NULL AND dismissed_at IS NULL AND deleted_at IS NULL GROUP BY source_module`, [tenantId, userId]).catch(() => ({ rows: [] })),
  ]);
  const byPriority: Record<string, number> = {};
  for (const r of priorityRes.rows as any[]) byPriority[r.priority] = r.count;
  const byModule: Record<string, number> = {};
  for (const r of moduleRes.rows as any[]) byModule[r.source_module] = r.count;
  return { total: (totalRes.rows[0] as any)?.total || 0, byPriority, byModule };
}

export const InboxItemService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, createNotification, getNotificationPreferences, generateDigest, getNotificationDashboard, getChannelConfig, checkDeadlines, advancedFilter, markAsRead, markAllAsRead, dismissItems, getUnreadCount };
