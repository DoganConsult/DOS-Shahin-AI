import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
export async function getUnifiedActivityFeed(tenantId, userId, filter, cursor, limit = 20) {
    const schema = tenantSchema(tenantId);
    try {
        const conditions = ['1=1'];
        const params = [];
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
        const { rows } = await safeQuery(`SELECT * FROM "${schema}".activity_feed
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(safeLimit + 1)) || 50))}`, params);
        const hasMore = rows.length > safeLimit;
        const items = hasMore ? rows.slice(0, safeLimit) : rows;
        const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;
        return { items, nextCursor, total: items.length };
    }
    catch (err) {
        logger.warn(`[UnifiedActivityFeed] Failed: ${err instanceof Error ? err.message : String(err)}`);
        return { items: [], nextCursor: null, total: 0 };
    }
}
//# sourceMappingURL=unified-activity-feed.service.js.map