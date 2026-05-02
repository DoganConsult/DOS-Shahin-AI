/**
 * PortalsDashboardService -- Enterprise Portals Dashboard
 * =========================================================
 * Aggregates portal instance statistics by status (active, inactive),
 * access metrics, content health, and portal utilization for
 * operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped portals tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner portals
 * @module portals
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the portals module. */
export interface PortalsDashboardSummary {
  tenantId: string;
  totalPortals: number;
  activePortals: number;
  inactivePortals: number;
  draftPortals: number;
  totalPortalUsers: number;
  portalsWithContent: number;
  recentlyCreated: number;
}

// -- Service ------------------------------------------------------------------

export class PortalsDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: portals by status
   * (active, inactive, draft), total portal users, portals with
   * published content, and recently created portals (last 30 days).
   */
  async getDashboardSummary(tenantId: string): Promise<PortalsDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      // Portal status aggregates
      const portalResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_created
         FROM "${schema}".portals`,
        [],
      ).catch(() => ({
        rows: [{ total: 0, active: 0, inactive: 0, draft: 0, recently_created: 0 }],
      }));

      const pRow = portalResult.rows[0] ?? {};

      // Total portal users across all active portals
      const userResult = await safeQuery(
        `SELECT COUNT(DISTINCT user_id)::int AS total_users
         FROM "${schema}".portal_users pu
         INNER JOIN "${schema}".portals p ON p.portal_id = pu.portal_id
         WHERE p.status = 'active'`,
        [],
      ).catch(() => ({ rows: [{ total_users: 0 }] }));

      const totalPortalUsers = parseInt(userResult.rows[0]?.total_users ?? '0', 10);

      // Portals with at least one published content page
      const contentResult = await safeQuery(
        `SELECT COUNT(DISTINCT p.portal_id)::int AS with_content
         FROM "${schema}".portals p
         INNER JOIN "${schema}".portal_content pc ON pc.portal_id = p.portal_id
         WHERE pc.status = 'published'`,
        [],
      ).catch(() => ({ rows: [{ with_content: 0 }] }));

      const portalsWithContent = parseInt(contentResult.rows[0]?.with_content ?? '0', 10);

      return {
        tenantId,
        totalPortals: parseInt(pRow.total ?? '0', 10),
        activePortals: parseInt(pRow.active ?? '0', 10),
        inactivePortals: parseInt(pRow.inactive ?? '0', 10),
        draftPortals: parseInt(pRow.draft ?? '0', 10),
        totalPortalUsers,
        portalsWithContent,
        recentlyCreated: parseInt(pRow.recently_created ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalPortals: 0,
        activePortals: 0,
        inactivePortals: 0,
        draftPortals: 0,
        totalPortalUsers: 0,
        portalsWithContent: 0,
        recentlyCreated: 0,
      };
    }
  }
}
