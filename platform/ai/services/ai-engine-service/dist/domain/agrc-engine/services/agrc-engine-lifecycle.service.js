// @ts-nocheck
import { safeQuery, tenantSchema } from '../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
const ALLOWED_TRANSITIONS = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['active'],
    active: ['suspended', 'archived'],
    suspended: ['active', 'archived'],
    archived: [],
};
export async function transitionStatus(tenantId, entityId, targetStatus, userId, entityType = 'run', _reason) {
    const schema = tenantSchema(tenantId);
    const table = 'agrc_engine_runs';
    const current = await safeQuery(`SELECT status FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);
    if (current.rows.length === 0) {
        const e = new Error(`agrc-engine ${entityType} not found`);
        e.statusCode = 404;
        throw e;
    }
    const fromStatus = current.rows[0].status;
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(targetStatus)) {
        const e = new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`);
        e.statusCode = 400;
        throw e;
    }
    const { evaluateLifecycleTransition } = await import('../../../ports/auth.port').catch(() => ({ evaluateLifecycleTransition: async () => ({ allowed: true }) }));
    if (evaluateLifecycleTransition) {
        const lifecycleResult = await evaluateLifecycleTransition(tenantId, userId, {
            moduleCode: 'agrc-engine', entityType: 'agrc-engine', entityId: entityId,
            fromState: fromStatus, toState: targetStatus, permissionCode: 'agrc-engine.record.approve'
        });
        if (!lifecycleResult.allowed) {
            const e = new Error('Lifecycle auth denied');
            e.statusCode = 403;
            throw e;
        }
    }
    await safeQuery(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`, [targetStatus, entityId]);
    await safeQuery(`INSERT INTO "${schema}".audit_trail (tenant_id, actor_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'agrc-engine','transition',$3,$4,$5,$6)`, [tenantId, userId, entityType, entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: targetStatus })]).catch(catchHandler(EC.EVENT_BUS));
    try {
        const { emitEvent } = await import('../../../ports/events.port').catch(() => ({ emitEvent: () => { } }));
        if (emitEvent)
            await emitEvent({ tenantId, userId: userId, module: 'agrc-engine', event: 'status_changed', entityType: 'agrc-engine', entityId: entityId, data: { fromStatus, targetStatus } });
    }
    catch { }
    return { fromStatus, toStatus: targetStatus };
}
export async function bulkTransitionStatus(tenantId, entityIds, targetStatus, userId, entityType = 'run') {
    const succeeded = [];
    const failed = [];
    for (const id of entityIds) {
        try {
            await transitionStatus(tenantId, id, targetStatus, userId, entityType);
            succeeded.push(id);
        }
        catch (e) {
            failed.push({ id, error: e.message });
        }
    }
    return { succeeded, failed };
}
export async function getStatusHistory(tenantId, entityId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT before_state AS "fromStatus", after_state AS "toStatus", actor_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'agrc-engine' AND action = 'transition' ORDER BY created_at ASC`, [entityId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function getLifecycleState(tenantId, entityId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT id, status, created_at FROM "${schema}".agrc_engine_runs WHERE id = $1`, [entityId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        const slaHours = 24;
        const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
        const remaining = Math.max(0, slaHours - elapsed);
        return { entityId, status: row.status, slaHours, remainingHours: Math.round(remaining * 10) / 10, breached: remaining <= 0 };
    }
    catch {
        return null;
    }
}
export async function getAvailableTransitions(currentState) {
    return ALLOWED_TRANSITIONS[currentState] ?? [];
}
export async function getFailedRuns(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".agrc_engine_runs WHERE status = 'failed' ORDER BY updated_at ASC LIMIT 100`);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function getStuckRuns(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".agrc_engine_runs WHERE status = 'running' ORDER BY updated_at ASC LIMIT 100`);
        return result.rows;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=agrc-engine-lifecycle.service.js.map