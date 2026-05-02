"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTaskCreated = onTaskCreated;
exports.onWorkflowTriggered = onWorkflowTriggered;
exports.onApprovalRequired = onApprovalRequired;
exports.onEscalation = onEscalation;
exports.onClosure = onClosure;
exports.onFailure = onFailure;
/**
 * Action Workflow Service
 * Handles workflow lifecycle events: trigger, approval, escalation, closure, failure.
 * @owner Module:action
 */
const logger_port_1 = require("../ports/logger.port");
const resilience_1 = require("@dos/platform-core/resilience");
const audit_port_1 = require("../ports/audit.port");
const auth_port_1 = require("../ports/auth.port");
const approval_routing_service_1 = require("../../workflow/services/approvals/approval-routing.service");
const events_port_1 = require("../ports/events.port");
// ---------------------------------------------------------------------------
// Workflow triggered
// ---------------------------------------------------------------------------
/** Record that a task was created inside the action workflow. */
async function onTaskCreated(ctx, taskId) {
    logger_port_1.logger.info('Action task created', { entityId: ctx.entityId, taskId, triggeredBy: ctx.triggeredBy });
    await (0, audit_port_1.recordAudit)({
        tenantId: ctx.tenantId,
        userId: ctx.triggeredBy,
        module: 'action',
        action: 'create',
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        afterState: { event: 'task_created', taskId, correlationId: ctx.correlationId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    await (0, events_port_1.emitEvent)({
        eventType: 'action.workflow.task_created',
        tenantId: ctx.tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: {
            entityId: ctx.entityId,
            entityType: ctx.entityType,
            taskId,
            triggeredBy: ctx.triggeredBy,
            correlationId: ctx.correlationId,
            timestamp: new Date().toISOString(),
        },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
/** Record that a workflow has been triggered for an action entity. */
async function onWorkflowTriggered(ctx) {
    logger_port_1.logger.info('Action workflow triggered', { entityId: ctx.entityId, entityType: ctx.entityType, triggeredBy: ctx.triggeredBy });
    await (0, audit_port_1.recordAudit)({
        tenantId: ctx.tenantId,
        userId: ctx.triggeredBy,
        module: 'action',
        action: 'create',
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        afterState: { event: 'workflow_triggered', correlationId: ctx.correlationId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    await (0, events_port_1.emitEvent)({
        eventType: 'action.workflow.triggered',
        tenantId: ctx.tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: {
            entityId: ctx.entityId,
            entityType: ctx.entityType,
            triggeredBy: ctx.triggeredBy,
            correlationId: ctx.correlationId,
            timestamp: new Date().toISOString(),
        },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
// ---------------------------------------------------------------------------
// Approval required
// ---------------------------------------------------------------------------
/** Route an action entity through the approval workflow. */
async function onApprovalRequired(ctx, approverRole) {
    logger_port_1.logger.info('Action approval required', { entityId: ctx.entityId, approverRole, triggeredBy: ctx.triggeredBy });
    await (0, approval_routing_service_1.initiateApproval)(ctx.tenantId, {
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        action: 'approve',
        requestedBy: ctx.triggeredBy,
        routeId: `action.${ctx.entityType}.approval`,
        context: {
            approverRole,
            correlationId: ctx.correlationId,
        },
    });
    await (0, audit_port_1.recordAudit)({
        tenantId: ctx.tenantId,
        userId: ctx.triggeredBy,
        module: 'action',
        action: 'create',
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        afterState: { event: 'approval_required', approverRole, correlationId: ctx.correlationId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------
/** Record and emit an escalation event for an action entity. */
async function onEscalation(ctx, reason, escalateTo) {
    logger_port_1.logger.warn('Action escalation triggered', { entityId: ctx.entityId, reason, escalateTo, triggeredBy: ctx.triggeredBy });
    await (0, audit_port_1.recordAudit)({
        tenantId: ctx.tenantId,
        userId: ctx.triggeredBy,
        module: 'action',
        action: 'update',
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        afterState: { event: 'escalated', reason, escalateTo, correlationId: ctx.correlationId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    await (0, events_port_1.emitEvent)({
        eventType: 'action.workflow.escalated',
        tenantId: ctx.tenantId,
        sourceService: 'action',
        severity: 'warning',
        payload: {
            entityId: ctx.entityId,
            entityType: ctx.entityType,
            reason,
            escalateTo,
            triggeredBy: ctx.triggeredBy,
            correlationId: ctx.correlationId,
            timestamp: new Date().toISOString(),
        },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
// ---------------------------------------------------------------------------
// Closure
// ---------------------------------------------------------------------------
/** Validate lifecycle transition via DAuth, then record closure. */
async function onClosure(ctx, closureReason) {
    logger_port_1.logger.info('Action closure requested', { entityId: ctx.entityId, closureReason, triggeredBy: ctx.triggeredBy });
    await (0, auth_port_1.evaluateLifecycleTransition)(ctx.tenantId, ctx.triggeredBy, {
        moduleCode: 'action',
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        fromState: 'verified',
        toState: 'closed',
        permissionCode: 'action.item.close',
        userRoles: [],
    });
    await (0, audit_port_1.recordAudit)({
        tenantId: ctx.tenantId,
        userId: ctx.triggeredBy,
        module: 'action',
        action: 'update',
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        afterState: { event: 'closed', closureReason, correlationId: ctx.correlationId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    await (0, events_port_1.emitEvent)({
        eventType: 'action.workflow.closed',
        tenantId: ctx.tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: {
            entityId: ctx.entityId,
            entityType: ctx.entityType,
            closureReason,
            triggeredBy: ctx.triggeredBy,
            correlationId: ctx.correlationId,
            timestamp: new Date().toISOString(),
        },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
// ---------------------------------------------------------------------------
// Failure
// ---------------------------------------------------------------------------
/** Record and emit a workflow failure event. */
async function onFailure(ctx, error) {
    logger_port_1.logger.error('Action workflow failure', { entityId: ctx.entityId, error, triggeredBy: ctx.triggeredBy });
    await (0, audit_port_1.recordAudit)({
        tenantId: ctx.tenantId,
        userId: ctx.triggeredBy,
        module: 'action',
        action: 'update',
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        afterState: { event: 'workflow_failed', error, correlationId: ctx.correlationId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    await (0, events_port_1.emitEvent)({
        eventType: 'action.workflow.failed',
        tenantId: ctx.tenantId,
        sourceService: 'action',
        severity: 'critical',
        payload: {
            entityId: ctx.entityId,
            entityType: ctx.entityType,
            error,
            triggeredBy: ctx.triggeredBy,
            correlationId: ctx.correlationId,
            timestamp: new Date().toISOString(),
        },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
//# sourceMappingURL=action-workflow.service.js.map