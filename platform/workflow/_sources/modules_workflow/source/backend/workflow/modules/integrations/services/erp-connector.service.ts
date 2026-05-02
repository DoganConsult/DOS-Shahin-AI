import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';

export interface ErpConnection {
  connectionId: string;
  connectorCode: string;
  erpCode: string;
  status: string;
  lastSyncedAt: string | null;
}

export interface SyncJobResult {
  jobId: string;
  connectionId: string;
  status: 'queued' | 'failed';
  error?: string;
}

export async function getConnections(tenantId: string): Promise<ErpConnection[]> {
  try {
    const res = await safeQuery(
      `SELECT
         id::text                     AS "connectionId",
         connector_code               AS "connectorCode",
         COALESCE(erp_code, connector_code) AS "erpCode",
         status                       AS status,
         last_synced_at               AS "lastSyncedAt"
       FROM public.integration_connections
       WHERE tenant_id = $1
         AND status = 'active'
         AND connector_kind = 'erp'
         AND deleted_at IS NULL
       ORDER BY connector_code`,
      [tenantId],
    );
    return res.rows as ErpConnection[];
  } catch {
    return [];
  }
}

export async function executeSyncJob(tenantId: string, connectionId: string): Promise<SyncJobResult> {
  const jobId = randomUUID();
  try {
    await safeQuery(
      `INSERT INTO public.integration_sync_jobs
         (id, tenant_id, connection_id, status, requested_at)
       VALUES ($1, $2, $3, 'queued', NOW())`,
      [jobId, tenantId, connectionId],
    );
  } catch {
  }
  try {
    await publish('integrations.erp.sync_requested', tenantId, {
      jobId,
      connectionId,
      requestedAt: new Date().toISOString(),
    });
    return { jobId, connectionId, status: 'queued' };
  } catch (err) {
    return { jobId, connectionId, status: 'failed', error: (err as Error).message };
  }
}
