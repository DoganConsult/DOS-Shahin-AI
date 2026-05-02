import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import type { GenericRow as _GenericRow } from '../../ports/platform.port';

export async function getActivityTimeline(
  tenantId: string,
  entityType: string,
  entityId: string,
  daysBack = 7,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const safeDays = Math.max(1, Math.min(daysBack, 365));
  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".activity_feed
       WHERE entity_type = $1 AND entity_id = $2
         AND created_at > NOW() - make_interval(days => $3)
       ORDER BY created_at DESC
       LIMIT 200`,
      [entityType, entityId, safeDays],
    );
    return rows;
  } catch (err) {
    logger.warn(`[ActivityCorrelation] getActivityTimeline failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export async function findCorrelatedActivities(
  tenantId: string,
  entityType: string,
  entityId: string,
  timeWindowMs = 300_000,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const safeWindowMinutes = Math.max(1, Math.min(Math.round(timeWindowMs / 60_000), 1440));
  try {
    const { rows: anchor } = await safeQuery(
      `SELECT created_at FROM "${schema}".activity_feed
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [entityType, entityId],
    );
    if (anchor.length === 0) return [];

    const anchorTime = anchor[0].created_at;
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".activity_feed
       WHERE created_at BETWEEN ($1::timestamptz - make_interval(mins => $2)) AND ($1::timestamptz + make_interval(mins => $2))
         AND NOT (entity_type = $3 AND entity_id = $4)
       ORDER BY created_at DESC
       LIMIT 50`,
      [anchorTime, safeWindowMinutes, entityType, entityId],
    );
    return rows;
  } catch (err) {
    logger.warn(`[ActivityCorrelation] findCorrelatedActivities failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
