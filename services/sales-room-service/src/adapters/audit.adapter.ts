import { ServiceClient } from '@dos/service-client';

const auditClient = new ServiceClient({
  baseUrl: process.env.AUDIT_SERVICE_URL || 'http://127.0.0.1:4006',
  timeout: 5000,
  retries: 1,
});

export async function recordAudit(
  tenantId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  actorId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  // Sales Room can run on platform-only (pre-login) routes; audit-service
  // accepts NULL tenant for platform-scoped events. Keep best-effort
  // semantics — audit failures must never break the user-visible path.
  try {
    await auditClient.post(
      '/api/audit/entries',
      {
        tenantId,
        actorId,
        action,
        module: 'sales-room-service',
        entityType,
        entityId,
        source: 'sales-room-service',
        details: details || {},
      },
      tenantId ? { 'x-tenant-id': tenantId } : undefined,
    );
  } catch {
    /* swallow — audit is best-effort */
  }
}
