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
      module: 'compliance-controls-service',
      entityType,
      entityId,
      source: 'compliance-controls-service',
      details: details || {},
    }, { 'x-tenant-id': tenantId });
  } catch {}
}

export interface AuditEntry {
  id?: string;
  tenantId?: string;
  actorId?: string | null;
  action?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  source?: string;
  details?: Record<string, unknown>;
  createdAt?: string;
}

/**
 * List audit-trail entries for a given entity. Used by the compliance
 * module activity feeds (e.g. obligation activity log). Proxies to
 * audit-service `/api/audit/entries` which is the canonical query
 * endpoint with entityType+entityId filters and tenant scoping.
 */
export async function listAuditEntries(
  tenantId: string,
  filter: { entityType: string; entityId: string; limit?: number; offset?: number; authToken?: string },
): Promise<{ data: AuditEntry[]; total: number }> {
  const qs = new URLSearchParams({
    entityType: filter.entityType,
    entityId: filter.entityId,
  });
  if (filter.limit != null) qs.set('limit', String(filter.limit));
  if (filter.offset != null) qs.set('offset', String(filter.offset));
  const headers: Record<string, string> = { 'x-tenant-id': tenantId };
  if (filter.authToken) headers['authorization'] = `Bearer ${filter.authToken}`;
  try {
    const resp = await auditClient.get<{ data: AuditEntry[]; total: number }>(
      `/api/audit/entries?${qs.toString()}`,
      headers,
    );
    if (resp.ok && resp.data && Array.isArray((resp.data as any).data)) {
      return { data: (resp.data as any).data, total: (resp.data as any).total ?? (resp.data as any).data.length };
    }
    return { data: [], total: 0 };
  } catch {
    return { data: [], total: 0 };
  }
}
