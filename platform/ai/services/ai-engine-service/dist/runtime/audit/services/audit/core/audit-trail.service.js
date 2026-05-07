/**
 * audit-trail.service — engine-local writer for dos.audit_trail.
 *
 * Inserts an append-only row into the canonical audit table used across the
 * platform. The function is intentionally fire-and-forget tolerant: a failed
 * audit write never throws to the caller (audit must not break the user-facing
 * action), but the failure is logged so it can be alerted on.
 *
 * Two callsite shapes are supported, because the executor and the tool-gate
 * already standardised on the older positional signature:
 *
 *   recordAudit(tenantId, actorId, action, entityType, entityId, payload)
 *   recordAudit(tenantId, action, payload)            // legacy 3-arg form
 *
 * Schema target: dos.audit_trail
 *   columns: entry_id, tenant_id, actor_id, action, entity_type, entity_id, module, payload, created_at
 */
import { safeQuery } from '../../../../ai/ports/database.port.js';
import { logger } from '../../../../ai/ports/logger.port.js';
const MODULE_TAG = 'ai';
export async function recordAudit(tenantId, actorOrAction, actionOrPayload, entityType, entityId, payload) {
    // Detect signature shape: 6-arg vs 3-arg
    const isFullForm = typeof actionOrPayload === 'string';
    const actorId = isFullForm ? actorOrAction : null;
    const action = isFullForm ? actionOrPayload : actorOrAction;
    const ent_type = isFullForm ? (entityType ?? null) : null;
    const ent_id = isFullForm ? (entityId ?? null) : null;
    const body = isFullForm ? (payload ?? null) : (actionOrPayload ?? null);
    try {
        await safeQuery(`INSERT INTO dos.audit_trail
         (tenant_id, actor_id, action, entity_type, entity_id, module, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())`, [
            tenantId,
            actorId,
            action,
            ent_type,
            ent_id,
            MODULE_TAG,
            body == null ? null : JSON.stringify(body),
        ]);
    }
    catch (err) {
        logger.warn?.('[audit-trail] insert failed', { error: err?.message, action });
    }
}
//# sourceMappingURL=audit-trail.service.js.map