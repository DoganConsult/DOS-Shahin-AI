import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';

export interface ActivityFilter {
  modules?: string[];
  entityTypes?: string[];
  userIds?: string[];
  actions?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  read?: boolean;
  archived?: boolean;
  agentId?: string;
  workflowId?: string;
}

export async function getUnifiedActivityFeed(
  tenantId: string,
  userId: string | null,
  filter: ActivityFilter,
  cursor?: string,
  limit = 20,
): Promise<{ items: unknown[]; nextCursor: string | null; total: number }> {
  const schema = tenantSchema(tenantId);
  try {
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIdx = 0;

    if (filter.modules?.length) {
      paramIdx++;
      params.push(filter.modules);
      conditions.push(`module = ANY($${paramIdx})`);
    }
    if (filter.entityTypes?.length) {
      paramIdx++;
      params.push(filter.entityTypes);
      conditions.push(`entity_type = ANY($${paramIdx})`);
    }
    if (filter.actions?.length) {
      paramIdx++;
      params.push(filter.actions);
      conditions.push(`action = ANY($${paramIdx})`);
    }
    if (filter.dateFrom) {
      paramIdx++;
      params.push(filter.dateFrom.toISOString());
      conditions.push(`created_at >= $${paramIdx}::timestamptz`);
    }
    if (filter.dateTo) {
      paramIdx++;
      params.push(filter.dateTo.toISOString());
      conditions.push(`created_at <= $${paramIdx}::timestamptz`);
    }
    if (cursor) {
      paramIdx++;
      params.push(cursor);
      conditions.push(`created_at < $${paramIdx}::timestamptz`);
    }

    const safeLimit = Math.max(1, Math.min(limit, 100));

    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".activity_feed
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(safeLimit + 1)) || 50))}`,
      params,
    );

    const hasMore = rows.length > safeLimit;
    const items = hasMore ? rows.slice(0, safeLimit) : rows;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    return { items, nextCursor, total: items.length };
  } catch (err) {
    logger.warn(`[UnifiedActivityFeed] Failed: ${err instanceof Error ? err.message : String(err)}`);
    return { items: [], nextCursor: null, total: 0 };
  }
}
