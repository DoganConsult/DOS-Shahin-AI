/**
 * NotificationDashboardService -- Enterprise Notification Dashboard
 * ===================================================================
 * Aggregates notification delivery statistics: sent, read, unread
 * counts, channel distribution, and delivery health for operational
 * dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped notification tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner notification
 * @module notification
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the notification module. */
export interface NotificationDashboardSummary {
  tenantId: string;
  totalNotifications: number;
  sentCount: number;
  readCount: number;
  unreadCount: number;
  failedCount: number;
  readRate: number;
  recentlySent: number;
  byChannel: NotificationChannelCount[];
}

/** Notification count grouped by delivery channel. */
export interface NotificationChannelCount {
  channel: string;
  count: number;
}

// -- Service ------------------------------------------------------------------

export class NotificationDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: notifications sent, read,
   * unread, and failed counts, read rate percentage, recently sent
   * (last 7 days), and distribution by channel.
   */
  async getDashboardSummary(tenantId: string): Promise<NotificationDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      // Aggregate counts by status
      const aggResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read'))::int AS sent,
           COUNT(*) FILTER (WHERE status = 'read')::int AS read,
           COUNT(*) FILTER (WHERE status IN ('sent', 'delivered') AND status != 'read')::int AS unread,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recently_sent
         FROM "${schema}".notifications`,
        [],
      ).catch(() => ({
        rows: [{
          total: 0, sent: 0, read: 0, unread: 0, failed: 0, recently_sent: 0,
        }],
      }));

      const agg = aggResult.rows[0] ?? {};
      const sent = parseInt(agg.sent ?? '0', 10);
      const readCount = parseInt(agg.read ?? '0', 10);

      // Channel breakdown
      const channelResult = await safeQuery(
        `SELECT
           COALESCE(channel, 'unknown') AS channel,
           COUNT(*)::int AS count
         FROM "${schema}".notifications
         GROUP BY channel
         ORDER BY count DESC`,
        [],
      ).catch(() => ({ rows: [] }));

      const byChannel: NotificationChannelCount[] =
        (channelResult.rows as Record<string, unknown>[]).map((r) => ({
          channel: r.channel,
          count: parseInt((r as any).count ?? '0', 10),
        }));

      return {
        tenantId,
        totalNotifications: parseInt(agg.total ?? '0', 10),
        sentCount: sent,
        readCount,
        unreadCount: parseInt(agg.unread ?? '0', 10),
        failedCount: parseInt(agg.failed ?? '0', 10),
        readRate: sent > 0 ? Math.round((readCount / sent) * 10000) / 100 : 0,
        recentlySent: parseInt(agg.recently_sent ?? '0', 10),
        byChannel,
      };
    } catch {
      return {
        tenantId,
        totalNotifications: 0,
        sentCount: 0,
        readCount: 0,
        unreadCount: 0,
        failedCount: 0,
        readRate: 0,
        recentlySent: 0,
        byChannel: [],
      };
    }
  }
}
