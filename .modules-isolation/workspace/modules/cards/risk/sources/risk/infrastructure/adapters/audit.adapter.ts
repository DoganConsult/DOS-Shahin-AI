import { ServiceClient } from '@dos/service-client';

const auditClient = new ServiceClient({
  baseUrl: process.env.AUDIT_SERVICE_URL || 'http://127.0.0.1:4006',
  timeout: 5000,
  retries: 1,
});

export async function recordAudit(
  tenantIdOrPayload: string | Record<string, unknown>,
  action?: string,
  entityType?: string,
  entityId?: string,
  actorId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  let body: Record<string, unknown>;
  let tenantId: string;
  if (typeof tenantIdOrPayload === 'string') {
    tenantId = tenantIdOrPayload;
    body = {
      tenantId,
      actorId,
      action,
      module: 'risk',
      entityType,
      entityId,
      source: 'risk',
      details: details || {},
    };
  } else {
    const p = tenantIdOrPayload;
    tenantId = (p['tenantId'] as string) ?? '';
    body = {
      module: 'risk',
      source: 'risk',
      ...p,
    };
  }
  try {
    await auditClient.post('/api/audit/entries', body, { 'x-tenant-id': tenantId });
  } catch {}
}

