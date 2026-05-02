// ============================================
// Shahin — Notification Analytics Service
// Delivery success rates, open/read rates,
// response times, per-channel metrics,
// volume trends, per-module notification counts
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';

// === Types ===

export interface DeliveryMetrics {
  channel: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliverySuccessRate: number;
  averageDeliveryMs: number | null;
}

export interface ReadMetrics {
  totalNotifications: number;
  totalRead: number;
  totalUnread: number;
  readRate: number;
  averageReadTimeMs: number | null;
}

export interface VolumeTrend {
  period: string;
  total: number;
  byChannel: Record<string, number>;
  byModule: Record<string, number>;
}

export interface ModuleNotificationCount {
  moduleCode: string;
  total: number;
  read: number;
  unread: number;
  readRate: number;
  mostCommonType: string | null;
}

export interface ChannelPerformance {
  channel: string;
  deliveryRate: number;
  readRate: number;
  totalVolume: number;
  failedCount: number;
  avgResponseTimeSec: number | null;
}

export interface NotificationAnalyticsSummary {
  generatedAt: string;
  periodDays: number;
  totalNotifications: number;
  overallReadRate: number;
  overallDeliveryRate: number;
  topChannel: string | null;
  topModule: string | null;
  byChannel: ChannelPerformance[];
  byModule: ModuleNotificationCount[];
}

// === Pure Functions ===

export function computeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function findTopByVolume<T extends { total: number; [key: string]: any }>(
  items: T[],
  labelKey: keyof T
): string | null {
  if (items.length === 0) return null;
  const top = items.reduce((a, b) => (a.total > b.total ? a : b));
  return String(top[labelKey]);
}

// === Delivery Analytics ===

export async function getDeliveryMetrics(
  tenantId: string,
  periodDays: number = 30
): Promise<DeliveryMetrics[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         channel_type AS channel,
         COUNT(*) AS total_sent,
         COUNT(*) FILTER (WHERE status = 'delivered') AS total_delivered,
         COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
         AVG(CASE WHEN delivered_at IS NOT NULL AND sent_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (delivered_at - sent_at)) * 1000 ELSE NULL END) AS avg_delivery_ms
       FROM "${schema}".notification_deliveries
       WHERE created_at > NOW() - INTERVAL '${periodDays} days'
       GROUP BY channel_type
       ORDER BY total_sent DESC`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => {
      const sent = parseInt((r as any).total_sent, 10);
      const delivered = parseInt((r as any).total_delivered, 10);
      return {
        channel: r.channel,
        totalSent: sent,
        totalDelivered: delivered,
        totalFailed: parseInt((r as any).total_failed, 10),
        deliverySuccessRate: computeRate(delivered, sent),
        averageDeliveryMs: r.avg_delivery_ms ? Math.round(parseFloat((r as any).avg_delivery_ms)) : null,
      };
    });
  } catch { return []; }
}

// === Read Analytics ===

export async function getReadMetrics(
  tenantId: string,
  periodDays: number = 30,
  userId?: string
): Promise<ReadMetrics> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [];
  const conditions = [`created_at > NOW() - INTERVAL '${periodDays} days'`];
  let idx = 1;
  if (userId) { conditions.push(`user_id = $${idx++}`); params.push(userId); }

  const result = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE read = true) AS total_read,
       AVG(CASE WHEN read = true AND read_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (read_at - created_at)) * 1000 ELSE NULL END) AS avg_read_ms
     FROM "${schema}".notifications
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  const r = getFirstRow(result)!;
  const total = parseInt(r?.total || '0', 10);
  const read = parseInt(r?.total_read || '0', 10);

  return {
    totalNotifications: total,
    totalRead: read,
    totalUnread: total - read,
    readRate: computeRate(read, total),
    averageReadTimeMs: r?.avg_read_ms ? Math.round(parseFloat(r.avg_read_ms)) : null,
  };
}

// === Volume Trends ===

export async function getVolumeTrends(
  tenantId: string,
  periodDays: number = 30,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<VolumeTrend[]> {
  const schema = tenantSchema(tenantId);
  const truncate = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';
  const format = groupBy === 'day' ? 'YYYY-MM-DD' : groupBy === 'week' ? 'IYYY-IW' : 'YYYY-MM';

  try {
    const result = await safeQuery(
      `SELECT
         TO_CHAR(DATE_TRUNC('${truncate}', created_at), '${format}') AS period,
         COUNT(*) AS total,
         type AS module_code
       FROM "${schema}".notifications
       WHERE created_at > NOW() - INTERVAL '${periodDays} days'
       GROUP BY DATE_TRUNC('${truncate}', created_at), type
       ORDER BY period ASC`,
      []
    );

    const trendsMap: Record<string, VolumeTrend> = {};
    for (const r of result.rows as Record<string, unknown>[][]) {

      if (!trendsMap[r.period]) {

        trendsMap[r.period] = { period: r.period, total: 0, byChannel: {}, byModule: {} };
      }

      const count = parseInt(r.total, 10);

      trendsMap[r.period].total += count;

      const module = r.module_code || 'general';

      trendsMap[r.period].byModule[module] = (trendsMap[r.period].byModule[module] || 0) + count;
    }

    return Object.values(trendsMap).sort((a, b) => a.period.localeCompare(b.period));
  } catch { return []; }
}

// === Module Counts ===

export async function getModuleNotificationCounts(
  tenantId: string,
  periodDays: number = 30
): Promise<ModuleNotificationCount[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         COALESCE(type, 'general') AS module_code,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE read = true) AS read_count,
         MAX(type) AS most_common_type
       FROM "${schema}".notifications
       WHERE created_at > NOW() - INTERVAL '${periodDays} days'
       GROUP BY type
       ORDER BY total DESC`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => {
      const total = parseInt((r as any).total, 10);
      const read = parseInt((r as any).read_count, 10);
      return {
        moduleCode: r.module_code,
        total,
        read,
        unread: total - read,
        readRate: computeRate(read, total),
        mostCommonType: r.most_common_type || null,
      };
    });
  } catch { return []; }
}

// === Channel Performance ===

export async function getChannelPerformance(
  tenantId: string,
  periodDays: number = 30
): Promise<ChannelPerformance[]> {
  const _schema = tenantSchema(tenantId);

  const [deliveryMetrics, readResult] = await Promise.all([
    getDeliveryMetrics(tenantId, periodDays),
    getReadMetrics(tenantId, periodDays),
  ]);

  const inAppReadRate = readResult.readRate;

  return deliveryMetrics.map(d => ({
    channel: d.channel,
    deliveryRate: d.deliverySuccessRate,
    readRate: d.channel === 'in_app' ? inAppReadRate : 0,
    totalVolume: d.totalSent,
    failedCount: d.totalFailed,
    avgResponseTimeSec: d.averageDeliveryMs ? Math.round(d.averageDeliveryMs / 1000) : null,
  }));
}

// === Summary ===

export async function getAnalyticsSummary(
  tenantId: string,
  periodDays: number = 30
): Promise<NotificationAnalyticsSummary> {
  const [deliveryMetrics, readMetrics, moduleMetrics, channelPerformance] = await Promise.all([
    getDeliveryMetrics(tenantId, periodDays),
    getReadMetrics(tenantId, periodDays),
    getModuleNotificationCounts(tenantId, periodDays),
    getChannelPerformance(tenantId, periodDays),
  ]);

  const totalDelivered = deliveryMetrics.reduce((sum, d) => sum + d.totalDelivered, 0);
  const totalSent = deliveryMetrics.reduce((sum, d) => sum + d.totalSent, 0);
  const overallDeliveryRate = computeRate(totalDelivered, totalSent);

  const topChannel = findTopByVolume(
    channelPerformance.map(c => ({ total: c.totalVolume, channel: c.channel })),
    'channel'
  );
  const topModule = findTopByVolume(
    moduleMetrics.map(m => ({ total: m.total, moduleCode: m.moduleCode })),
    'moduleCode'
  );

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    totalNotifications: readMetrics.totalNotifications,
    overallReadRate: readMetrics.readRate,
    overallDeliveryRate,
    topChannel,
    topModule,
    byChannel: channelPerformance,
    byModule: moduleMetrics,
  };
}
