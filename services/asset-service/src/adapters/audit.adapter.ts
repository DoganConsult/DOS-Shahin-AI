import { ServiceClient } from '@dos/service-client';

const auditClient = new ServiceClient({
  baseUrl: process.env.AUDIT_SERVICE_URL || 'http://127.0.0.1:4006',
  timeout: 5000,
  retries: 1,
});

export async function recordAudit(
  tenantId: string,
  action: string,
  entityType: string,
  entityId: string,
  actorId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await auditClient.post('/api/audit/entries', {
      tenantId,
      actorId,
      action,
      module: 'asset-service',
      entityType,
      entityId,
      source: 'asset-service',
      details: details || {},
    }, { 'x-tenant-id': tenantId });
  } catch {}
}
