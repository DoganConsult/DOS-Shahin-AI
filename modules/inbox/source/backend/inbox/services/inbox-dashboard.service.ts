/**
 * InboxDashboardService -- Enterprise Inbox Dashboard
 * =====================================================
 * Aggregates inbox item statistics by status (unread, read, archived),
 * priority distribution, and inbox throughput for operational dashboards
 * and admin surfaces.
 *
 * All data is derived from tenant-scoped inbox tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner inbox
 * @module inbox
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the inbox module. */
export interface InboxDashboardSummary {
  tenantId: string;
  totalItems: number;
  unreadItems: number;
  readItems: number;
  archivedItems: number;
  flaggedItems: number;
  actionRequiredItems: number;
  avgResponseTimeHrs: number | null;
  recentlyReceived: number;
}

// -- Service ------------------------------------------------------------------

export class InboxDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: inbox items by status
   * (unread, read, archived), flagged items, action-required count,
   * average response time, and recently received (last 7 days).
   */
  async getDashboardSummary(tenantId: string): Promise<InboxDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'unread')::int AS unread,
           COUNT(*) FILTER (WHERE status = 'read')::int AS read,
           COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
           COUNT(*) FILTER (WHERE is_flagged = true)::int AS flagged,
           COUNT(*) FILTER (WHERE action_required = true AND status != 'archived')::int AS action_required,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (responded_at - received_at)) / 3600)
               FILTER (WHERE responded_at IS NOT NULL AND received_at IS NOT NULL),
             NULL
           )::numeric AS avg_response_hrs,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recently_received
         FROM "${schema}".inbox_items`,
        [],
      ).catch(() => ({
        rows: [{
          total: 0, unread: 0, read: 0, archived: 0,
          flagged: 0, action_required: 0, avg_response_hrs: null,
          recently_received: 0,
        }],
      }));

      const row = result.rows[0] ?? {};

      return {
        tenantId,
        totalItems: parseInt(row.total ?? '0', 10),
        unreadItems: parseInt(row.unread ?? '0', 10),
        readItems: parseInt(row.read ?? '0', 10),
        archivedItems: parseInt(row.archived ?? '0', 10),
        flaggedItems: parseInt(row.flagged ?? '0', 10),
        actionRequiredItems: parseInt(row.action_required ?? '0', 10),
        avgResponseTimeHrs: row.avg_response_hrs != null
          ? Math.round(parseFloat(row.avg_response_hrs) * 100) / 100
          : null,
        recentlyReceived: parseInt(row.recently_received ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalItems: 0,
        unreadItems: 0,
        readItems: 0,
        archivedItems: 0,
        flaggedItems: 0,
        actionRequiredItems: 0,
        avgResponseTimeHrs: null,
        recentlyReceived: 0,
      };
    }
  }
}
