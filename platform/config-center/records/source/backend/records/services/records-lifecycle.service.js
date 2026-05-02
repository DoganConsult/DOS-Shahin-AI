"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionStatus = transitionStatus;
exports.getLifecycleHistory = getLifecycleHistory;
exports.getAllowedTransitions = getAllowedTransitions;
exports.doesTransitionRequireApproval = doesTransitionRequireApproval;
exports.doesTransitionRequireWorkflow = doesTransitionRequireWorkflow;
const database_port_1 = require("../ports/database.port");
const db_1 = require("@dos/db");
const ALLOWED_TRANSITIONS = {
    activate: {
        from: ['active'],
        to: 'active',
        requiresApproval: false,
        requiresWorkflow: false,
    },
    start_retention: {
        from: ['active'],
        to: 'retention',
        requiresApproval: false,
        requiresWorkflow: false,
    },
    start_review: {
        from: ['active', 'retention'],
        to: 'review',
        requiresApproval: false,
        requiresWorkflow: true,
    },
    place_hold: {
        from: ['active', 'retention', 'review'],
        to: 'hold',
        requiresApproval: false,
        requiresWorkflow: false,
    },
    release_hold: {
        from: ['hold'],
        to: 'active',
        requiresApproval: false,
        requiresWorkflow: false,
    },
    schedule_disposal: {
        from: ['retention', 'review'],
        to: 'disposal_pending',
        requiresApproval: true,
        requiresWorkflow: true,
    },
    execute_disposal: {
        from: ['disposal_pending'],
        to: 'disposed',
        requiresApproval: true,
        requiresWorkflow: true,
    },
    archive: {
        from: ['active', 'retention', 'review', 'disposed'],
        to: 'archived',
        requiresApproval: false,
        requiresWorkflow: false,
    },
};
async function transitionStatus(tenantId, recordId, action, actorId, reason, workflowInstanceId) {
    const result = await (0, database_port_1.safeQuery)("SELECT * FROM __TENANT_SCHEMA__.records_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
async function getLifecycleHistory(tenantId, recordId, limit = 50, offset = 0) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".record_lifecycle_history WHERE record_id = $1`, [recordId]);
    const total = (0, db_1.getFirstRow)(countResult)?.total ?? 0;
    const dataResult = await (0, database_port_1.safeQuery)(`SELECT history_id, record_id, previous_status, new_status, action, transitioned_by, reason, workflow_instance_id, transitioned_at
     FROM "${schema}".record_lifecycle_history
     WHERE record_id = $1
     ORDER BY transitioned_at DESC
     LIMIT $2 OFFSET $3`, [recordId, limit, offset]);
    const rows = (dataResult.rows ?? []).map((r) => ({
        historyId: r.history_id,
        recordId: r.record_id,
        previousStatus: r.previous_status,
        newStatus: r.new_status,
        action: r.action,
        transitionedBy: r.transitioned_by,
        reason: r.reason,
        workflowInstanceId: r.workflow_instance_id,
        transitionedAt: r.transitioned_at,
    }));
    return { rows, total };
}
function getAllowedTransitions(currentStatus) {
    return Object.entries(ALLOWED_TRANSITIONS)
        .filter(([, rule]) => rule.from.includes(currentStatus))
        .map(([action]) => action);
}
function doesTransitionRequireApproval(action) {
    return ALLOWED_TRANSITIONS[action]?.requiresApproval ?? false;
}
function doesTransitionRequireWorkflow(action) {
    return ALLOWED_TRANSITIONS[action]?.requiresWorkflow ?? false;
}
//# sourceMappingURL=records-lifecycle.service.js.map