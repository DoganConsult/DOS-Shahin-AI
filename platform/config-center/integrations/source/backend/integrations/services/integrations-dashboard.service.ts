/**
 * IntegrationsDashboardService -- Enterprise Integrations Dashboard
 * ===================================================================
 * Aggregates integration connector statistics by status (active,
 * failed, disabled), sync health, error rates, and connector
 * distribution for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped integration tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner integrations
 * @module integrations
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the integrations module. */
export interface IntegrationsDashboardSummary {
  tenantId: string;
  totalIntegrations: number;
  activeIntegrations: number;
  failedIntegrations: number;
  disabledIntegrations: number;
  pendingIntegrations: number;
  totalSyncRuns: number;
  successfulSyncs: number;
  failedSyncs: number;
  syncSuccessRate: number;
  lastSyncAt: string | null;
  byConnectorType: ConnectorTypeCount[];
}

/** Integration count grouped by connector type. */
export interface ConnectorTypeCount {
  connectorType: string;
  count: number;
}

// -- Service ------------------------------------------------------------------

export class IntegrationsDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: integrations by status
   * (active, failed, disabled, pending), sync run statistics, sync
   * success rate, last sync timestamp, and connector type distribution.
   */
  async getDashboardSummary(tenantId: string): Promise<IntegrationsDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      // Integration status aggregates
      const intResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
         FROM "${schema}".integrations`,
        [],
      ).catch(() => ({
        rows: [{ total: 0, active: 0, failed: 0, disabled: 0, pending: 0 }],
      }));

      const iRow = intResult.rows[0] ?? {};

      // Sync run aggregates
      const syncResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total_syncs,
           COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           MAX(completed_at) AS last_sync_at
         FROM "${schema}".integration_sync_runs`,
        [],
      ).catch(() => ({
        rows: [{ total_syncs: 0, successful: 0, failed: 0, last_sync_at: null }],
      }));

      const sRow = syncResult.rows[0] ?? {};
      const totalSyncs = parseInt(sRow.total_syncs ?? '0', 10);
      const successfulSyncs = parseInt(sRow.successful ?? '0', 10);

      // Connector type distribution
      const typeResult = await safeQuery(
        `SELECT
           COALESCE(connector_type, 'unknown') AS connector_type,
           COUNT(*)::int AS count
         FROM "${schema}".integrations
         WHERE status != 'disabled'
         GROUP BY connector_type
         ORDER BY count DESC`,
        [],
      ).catch(() => ({ rows: [] }));

      const byConnectorType: ConnectorTypeCount[] =
        (typeResult.rows as Record<string, unknown>[]).map((r) => ({
          connectorType: r.connector_type,
          count: parseInt((r as any).count ?? '0', 10),
        }));

      return {
        tenantId,
        totalIntegrations: parseInt(iRow.total ?? '0', 10),
        activeIntegrations: parseInt(iRow.active ?? '0', 10),
        failedIntegrations: parseInt(iRow.failed ?? '0', 10),
        disabledIntegrations: parseInt(iRow.disabled ?? '0', 10),
        pendingIntegrations: parseInt(iRow.pending ?? '0', 10),
        totalSyncRuns: totalSyncs,
        successfulSyncs,
        failedSyncs: parseInt(sRow.failed ?? '0', 10),
        syncSuccessRate: totalSyncs > 0
          ? Math.round((successfulSyncs / totalSyncs) * 10000) / 100
          : 0,
        lastSyncAt: sRow.last_sync_at ?? null,
        byConnectorType,
      };
    } catch {
      return {
        tenantId,
        totalIntegrations: 0,
        activeIntegrations: 0,
        failedIntegrations: 0,
        disabledIntegrations: 0,
        pendingIntegrations: 0,
        totalSyncRuns: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        syncSuccessRate: 0,
        lastSyncAt: null,
        byConnectorType: [],
      };
    }
  }
}
