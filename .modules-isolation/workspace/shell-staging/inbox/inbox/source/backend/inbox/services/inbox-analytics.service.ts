// ============================================
// Shahin-Ai — Inbox Analytics Service
// Read rates, response times, engagement metrics,
// volume trends, per-user metrics, SLA compliance
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';

// === Types ===

export interface InboxVolumePoint {
  date: string;
  total: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

export interface UserEngagementMetrics {
  userId: string;
  totalReceived: number;
  totalRead: number;
  readRate: number;
  avgResponseHours: number | null;
  pendingCount: number;
  overdueCount: number;
}

export interface SlaComplianceReport {
  period: string;
  totalMessages: number;
  withinSla: number;
  breachedSla: number;
  complianceRate: number;
  avgResponseHours: number | null;
  byPriority: Record<string, { within: number; breached: number }>;
}

export interface EngagementSummary {
  tenantId: string;
  generatedAt: string;
  totalUnread: number;
  totalPending: number;
  avgReadRatePct: number;
  topActiveUsers: { userId: string; readCount: number }[];
  volumeTrend: "up" | "down" | "stable";
}

// === Pure Functions ===

export function computeReadRate(totalReceived: number, totalRead: number): number {
  if (totalReceived === 0) return 0;
  return Math.round((totalRead / totalReceived) * 100 * 100) / 100;
}

export function computeAvgResponseHours(totalHours: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round((totalHours / count) * 100) / 100;
}

export function classifyVolumeTrend(
  currentPeriodCount: number,
  previousPeriodCount: number
): "up" | "down" | "stable" {
  if (previousPeriodCount === 0) return currentPeriodCount > 0 ? "up" : "stable";
  const changePct = ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
  if (changePct > 10) return "up";
  if (changePct < -10) return "down";
  return "stable";
}

// === DB-backed Functions ===

export async function getVolumeTrend(
  tenantId: string,
  days = 30
): Promise<InboxVolumePoint[]> {
  const schema = tenantSchema(tenantId);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const result = await safeQuery(
    `SELECT
       DATE(created_at) AS date,
       COUNT(*) AS total,
       priority,
       message_type
     FROM "${schema}".inbox_inbox
     WHERE created_at >= $1 AND deleted_at IS NULL
     GROUP BY DATE(created_at), priority, message_type
     ORDER BY date ASC`,
    [since]
  );

  const map = new Map<string, InboxVolumePoint>();
  for (const r of result.rows) {
    const key = r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date);
    if (!map.has(key)) map.set(key, { date: key, total: 0, byPriority: {}, byType: {} });
    const point = map.get(key)!;
    const cnt = parseInt(r.total, 10);
    point.total += cnt;
    point.byPriority[r.priority] = (point.byPriority[r.priority] || 0) + cnt;
    point.byType[r.message_type] = (point.byType[r.message_type] || 0) + cnt;
  }

  return Array.from(map.values());
}

export async function getUserEngagement(
  tenantId: string,
  userId: string
): Promise<UserEngagementMetrics> {
  const schema = tenantSchema(tenantId);

  const counts = await safeQuery(
    `SELECT
       COUNT(*) AS total_received,
       COUNT(read_at) AS total_read,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
       AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 3600)
         FILTER (WHERE read_at IS NOT NULL) AS avg_response_hours
     FROM "${schema}".inbox_inbox
     WHERE recipient = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const row = counts.rows[0];
  const totalReceived = parseInt(row.total_received, 10) || 0;
  const totalRead = parseInt(row.total_read, 10) || 0;

  const overdueResult = await safeQuery(
    `SELECT COUNT(*) AS cnt
     FROM "${schema}".inbox_inbox
     WHERE recipient = $1
       AND status = 'pending'
       AND deleted_at IS NULL
       AND (metadata->>'sla_deadline')::timestamptz < NOW()`,
    [userId]
  );

  return {
    userId,
    totalReceived,
    totalRead,
    readRate: computeReadRate(totalReceived, totalRead),
    avgResponseHours: row.avg_response_hours ? Math.round(parseFloat(row.avg_response_hours) * 100) / 100 : null,
    pendingCount: parseInt(row.pending_count, 10) || 0,
    overdueCount: parseInt(overdueResult.rows[0]?.cnt, 10) || 0,
  };
}

export async function getSlaCompliance(
  tenantId: string,
  periodDays = 30
): Promise<SlaComplianceReport> {
  const schema = tenantSchema(tenantId);
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const result = await safeQuery(
    `SELECT
       priority,
       COUNT(*) AS total,
       COUNT(*) FILTER (
         WHERE read_at IS NOT NULL
           AND (metadata->>'sla_deadline' IS NULL
                OR read_at <= (metadata->>'sla_deadline')::timestamptz)
       ) AS within_sla,
       AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 3600)
         FILTER (WHERE read_at IS NOT NULL) AS avg_response_hours
     FROM "${schema}".inbox_inbox
     WHERE created_at >= $1 AND deleted_at IS NULL
     GROUP BY priority`,
    [since]
  );

  let totalMessages = 0, withinSla = 0;
  let totalResponseHours = 0, responseCount = 0;
  const byPriority: Record<string, { within: number; breached: number }> = {};

  for (const r of result.rows) {
    const total = parseInt(r.total, 10) || 0;
    const within = parseInt(r.within_sla, 10) || 0;
    totalMessages += total;
    withinSla += within;
    byPriority[r.priority] = { within, breached: total - within };
    if (r.avg_response_hours) {
      totalResponseHours += parseFloat(r.avg_response_hours) * total;
      responseCount += total;
    }
  }

  return {
    period: `last_${periodDays}_days`,
    totalMessages,
    withinSla,
    breachedSla: totalMessages - withinSla,
    complianceRate: computeReadRate(totalMessages, withinSla),
    avgResponseHours: computeAvgResponseHours(totalResponseHours, responseCount),
    byPriority,
  };
}

export async function getEngagementSummary(tenantId: string): Promise<EngagementSummary> {
  const schema = tenantSchema(tenantId);

  const unread = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".inbox_inbox WHERE read_at IS NULL AND deleted_at IS NULL`
  );
  const pending = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".inbox_inbox WHERE status = 'pending' AND deleted_at IS NULL`
  );
  const topUsers = await safeQuery(
    `SELECT recipient AS user_id, COUNT(*) AS read_count
     FROM "${schema}".inbox_inbox
     WHERE read_at IS NOT NULL AND deleted_at IS NULL
     GROUP BY recipient ORDER BY read_count DESC LIMIT 5`
  );
  const current7 = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".inbox_inbox WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL`
  );
  const prev7 = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".inbox_inbox WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' AND deleted_at IS NULL`
  );

  const totalUnread = parseInt(unread.rows[0]?.cnt, 10) || 0;
  const totalPending = parseInt(pending.rows[0]?.cnt, 10) || 0;
  const currentCount = parseInt(current7.rows[0]?.cnt, 10) || 0;
  const prevCount = parseInt(prev7.rows[0]?.cnt, 10) || 0;

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalUnread,
    totalPending,
    avgReadRatePct: 0,

    topActiveUsers: topUsers.rows.map(( r: Record<string, unknown>) => ({
      userId: r.user_id,
      readCount: parseInt((r as any).read_count, 10) || 0,
    })),
    volumeTrend: classifyVolumeTrend(currentCount, prevCount),
  };
}
