"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_TRANSITIONS = void 0;
exports.validateTransition = validateTransition;
exports.getAvailableTransitions = getAvailableTransitions;
exports.isProtectedTransition = isProtectedTransition;
exports.executeTransition = executeTransition;
exports.getEntityLifecycleTimeline = getEntityLifecycleTimeline;
exports.handleApprovalOutcome = handleApprovalOutcome;
exports.onWorkflowTriggered = onWorkflowTriggered;
exports.onTaskCreated = onTaskCreated;
exports.onApprovalRequired = onApprovalRequired;
exports.onEscalation = onEscalation;
exports.onClosure = onClosure;
exports.onFailure = onFailure;
const database_port_1 = require("../../ports/database.port");
const foundation_event_service_1 = require("../events/foundation-event.service");
const crypto_1 = require("crypto");
const resilience_port_1 = require("../../ports/resilience.port");
exports.ALLOWED_TRANSITIONS = {
    'draft': ['in_review'],
    'in_review': ['approved', 'draft'],
    'approved': ['active'],
    'active': ['suspended', 'archived'],
    'suspended': ['active', 'archived'],
    'archived': [],
};
const PROTECTED_TRANSITIONS = ['in_review->approved'];
function validateTransition(fromStatus, toStatus) {
    return (exports.ALLOWED_TRANSITIONS[fromStatus] ?? []).includes(toStatus);
}
function getAvailableTransitions(status) {
    return exports.ALLOWED_TRANSITIONS[status] ?? [];
}
function isProtectedTransition(fromStatus, toStatus) {
    return PROTECTED_TRANSITIONS.includes(`${fromStatus}->${toStatus}`);
}
async function executeTransition(tenantId, entityId, fromStatus, toStatus, userId) {
    if (!validateTransition(fromStatus, toStatus)) {
        return { success: false, error: `Transition ${fromStatus} -> ${toStatus} is not allowed` };
    }
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const correlationId = (0, crypto_1.randomUUID)();
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".foundation_org_change SET status = $1, updated_at = NOW() WHERE id = $2`, [toStatus, entityId]);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`, [tenantId, userId, 'foundation', 'org_change', entityId, JSON.stringify({ status: fromStatus }), JSON.stringify({ status: toStatus })]);
    if (isProtectedTransition(fromStatus, toStatus)) {
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`, [tenantId, `Foundation Approval Required: ${toStatus}`, `Foundation ${entityId} requires approval for transition to ${toStatus}`, 'org_change', entityId]).catch((0, resilience_port_1.catchHandler)(resilience_port_1.EC.EVENT_BUS));
    }
    (0, foundation_event_service_1.emitFoundationEvent)({
        tenantId,
        entityType: 'org_change',
        entityId,
        action: 'status_changed',
        triggeredBy: userId,
        previousState: fromStatus,
        newState: toStatus,
        correlationId,
    });
    return { success: true };
}
async function getEntityLifecycleTimeline(tenantId, entityId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT user_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND module = 'foundation' AND action = 'transition' ORDER BY created_at ASC`, [tenantId, entityId]);
    return result?.rows ?? [];
}
async function handleApprovalOutcome(tenantId, entityId, outcome, userId, _comments) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const current = await (0, database_port_1.safeQuery)(`SELECT status FROM "${schema}".foundation_org_change WHERE id = $1`, [entityId]);
    if (!current?.rows?.length)
        return { success: false, error: 'Entity not found' };
    const currentStatus = current.rows[0].status;
    if (outcome === 'rejected') {
        const prev = Object.entries(exports.ALLOWED_TRANSITIONS).find(([_, targets]) => targets.includes(currentStatus));
        return executeTransition(tenantId, entityId, currentStatus, prev ? prev[0] : currentStatus, userId);
    }
    const next = getAvailableTransitions(currentStatus);
    return next.length > 0 ? executeTransition(tenantId, entityId, currentStatus, next[0], userId) : { success: false, error: `No transitions from ${currentStatus}` };
}
async function onWorkflowTriggered(ctx) {
    (0, foundation_event_service_1.emitFoundationEvent)({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, correlationId: ctx.correlationId, data: { trigger: 'workflow_start' } });
}
async function onTaskCreated(ctx, taskId) {
    (0, foundation_event_service_1.emitFoundationEvent)({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'created', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { taskId, trigger: 'task_creation' } });
}
async function onApprovalRequired(ctx, approverRole) {
    (0, foundation_event_service_1.emitFoundationEvent)({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { approverRole, trigger: 'approval_hook' } });
}
async function onEscalation(ctx, reason, escalateTo) {
    (0, foundation_event_service_1.emitFoundationEvent)({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'escalated', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { reason, escalateTo, trigger: 'escalation_hook' } });
}
async function onClosure(ctx, closureReason) {
    (0, foundation_event_service_1.emitFoundationEvent)({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: ctx.triggeredBy, newState: 'archived', correlationId: ctx.correlationId, data: { closureReason, trigger: 'closure_hook' } });
}
async function onFailure(ctx, error) {
    (0, foundation_event_service_1.emitFoundationEvent)({ tenantId: ctx.tenantId, entityType: ctx.entityType, entityId: ctx.entityId, action: 'status_changed', triggeredBy: 'workflow', correlationId: ctx.correlationId, data: { error, trigger: 'failure_compensation' } });
}
//# sourceMappingURL=foundation-workflow.service.js.map