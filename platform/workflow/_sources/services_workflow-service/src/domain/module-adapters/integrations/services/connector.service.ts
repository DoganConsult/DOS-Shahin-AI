/**
 * workflow-service — integrations/connector adapter.
 *
 * Reads the tenant's connector health dashboard: one row per registered
 * integration connector with status ∈ {healthy, degraded, unhealthy,
 * unknown}. Used by the integrations monitoring activity to surface
 * unhealthy connectors upstream.
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ConnectorHealthRow {
  connectionId: string;
  connectorCode: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  last_health_check_at: string | null;
  message?: string | null;
  [key: string]: unknown;
}

export async function getHealthDashboard(tenantId: string): Promise<ConnectorHealthRow[]> {
  try {
    const res = await safeQuery(
      `SELECT
         c.id::text            AS "connectionId",
         c.connector_code      AS "connectorCode",
         COALESCE(h.status, 'unknown') AS status,
         h.checked_at          AS last_health_check_at,
         h.message             AS message
       FROM public.integration_connections c
       LEFT JOIN LATERAL (
         SELECT status, checked_at, message
           FROM public.integration_health_checks ih
          WHERE ih.connection_id = c.id
          ORDER BY ih.checked_at DESC
          LIMIT 1
       ) h ON TRUE
       WHERE c.tenant_id = $1
         AND c.deleted_at IS NULL
       ORDER BY c.connector_code`,
      [tenantId],
    );
    return res.rows as ConnectorHealthRow[];
  } catch (err) {
    logger.warn('[ConnectorService] getHealthDashboard failed', {
      tenantId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function getConnection(
  tenantId: string,
  connectionId: string,
): Promise<ConnectorHealthRow | null> {
  try {
    const res = await safeQuery(
      `SELECT
         id::text AS "connectionId",
         connector_code AS "connectorCode",
         'unknown'::text AS status,
         NULL AS last_health_check_at
       FROM public.integration_connections
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [tenantId, connectionId],
    );
    return (res.rows[0] as ConnectorHealthRow | undefined) ?? null;
  } catch (err) {
    logger.warn('[ConnectorService] getConnection failed', {
      tenantId, connectionId, error: toErrorMessage(err),
    });
    return null;
  }
}
