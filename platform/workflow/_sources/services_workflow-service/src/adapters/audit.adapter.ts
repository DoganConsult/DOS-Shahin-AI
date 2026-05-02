import { logger } from '@dos/platform-core/observability';

const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://127.0.0.1:4006';

export async function recordAudit(data: {
  tenantId: string;
  userId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
}): Promise<void> {
  try {
    await fetch(`${AUDIT_SERVICE_URL}/api/audit/trail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': data.tenantId },
      body: JSON.stringify(data),
    });
  } catch {
    logger.warn('[AuditAdapter] Failed to record audit', { module: data.module, action: data.action });
  }
}
