"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionStatus = transitionStatus;
exports.bulkTransitionStatus = bulkTransitionStatus;
exports.getStatusHistory = getStatusHistory;
exports.getLifecycleState = getLifecycleState;
exports.getAvailableTransitions = getAvailableTransitions;
exports.getPendingChanges = getPendingChanges;
exports.getSuspendedOrgs = getSuspendedOrgs;
const database_port_1 = require("../../ports/database.port");
const resilience_port_1 = require("../../ports/resilience.port");
const ALLOWED_TRANSITIONS = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['active'],
    active: ['suspended', 'archived'],
    suspended: ['active', 'archived'],
    archived: [],
};
async function transitionStatus(tenantId, entityId, targetStatus, userId, entityType = 'organization', _reason) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const table = 'foundation_org_change';
    const current = await (0, database_port_1.safeQuery)(`SELECT status FROM "${schema}"."${table}" WHERE id = $1`, [entityId]);
    if (current.rows.length === 0) {
        const e = new Error(`foundation ${entityType} not found`);
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
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`, [targetStatus, entityId]);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'foundation','transition',$3,$4,$5,$6)`, [tenantId, userId, entityType, entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: targetStatus })]).catch((0, resilience_port_1.catchHandler)(resilience_port_1.EC.EVENT_BUS));
    return { fromStatus, toStatus: targetStatus };
}
async function bulkTransitionStatus(tenantId, entityIds, targetStatus, userId, entityType = 'organization') {
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
async function getStatusHistory(tenantId, entityId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'foundation' AND action = 'transition' ORDER BY created_at ASC`, [entityId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
async function getLifecycleState(tenantId, entityId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`SELECT id, status, created_at FROM "${schema}".foundation_org_change WHERE id = $1`, [entityId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        const slaHours = 168;
        const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 3600000;
        const remaining = Math.max(0, slaHours - elapsed);
        return { entityId, status: row.status, slaHours, remainingHours: Math.round(remaining * 10) / 10, breached: remaining <= 0 };
    }
    catch {
        return null;
    }
}
async function getAvailableTransitions(currentState) {
    return ALLOWED_TRANSITIONS[currentState] ?? [];
}
async function getPendingChanges(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".foundation_org_change WHERE status = 'pending' ORDER BY updated_at ASC LIMIT 100`);
        return result.rows;
    }
    catch {
        return [];
    }
}
async function getSuspendedOrgs(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".foundation_org_change WHERE status = 'suspended' ORDER BY updated_at ASC LIMIT 100`);
        return result.rows;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=foundation-lifecycle.service.js.map