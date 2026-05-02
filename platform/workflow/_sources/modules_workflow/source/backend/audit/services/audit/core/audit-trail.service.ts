// Workflow-local audit-trail adapter.
//
// 29 workflow source files import { recordAudit } from this path to write
// append-only entries to the shared dos.audit_trail table. Making the
// adapter workflow-local keeps the dependency graph tree-shaped (workflow
// owns its audit writes; the audit module owns reads + the UI surface)
// while still writing to the same canonical table.
//
// Signature matches the `recordAudit` surface of
// modules/audit/.../audit-trail.service.ts. Hash-chain verification + query
// helpers stay with the audit module (the read-side owner of the table).

import { safeQuery } from '@dos/db';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createHash } from 'node:crypto';
import { v4 as uuid } from 'uuid';

export interface AuditEntry {
  tenantId: string;
  userId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string;
}

/**
 * Append a row to dos.audit_trail. Errors are swallowed via the
 * platform-core resilience envelope so a downstream audit failure never
 * breaks the caller's business write.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const entryId = uuid();
  const payload = {
    beforeState: entry.beforeState ?? null,
    afterState: entry.afterState ?? null,
    ipAddress: entry.ipAddress ?? null,
  };
  const payloadStr = JSON.stringify(payload);
  const hashInput = [
    entry.tenantId,
    entry.userId,
    entry.module,
    entry.action,
    entry.entityType,
    entry.entityId,
    payloadStr,
  ].join('|');
  const hash = createHash('sha256').update(hashInput).digest('hex');

  swallow(EC.FALLBACK_QUERY, safeQuery(
    `INSERT INTO dos.audit_trail
       (entry_id, tenant_id, actor_id, module, action, entity_type, entity_id,
        payload, hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW())`,
    [
      entryId,
      entry.tenantId,
      entry.userId,
      entry.module,
      entry.action,
      entry.entityType,
      entry.entityId,
      payloadStr,
      hash,
    ],
  ), { tenantId: entry.tenantId, operation: 'workflow.recordAudit' });
}
