import { safeQuery } from '@dos/db';

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
  } catch {
    return [];
  }
}
