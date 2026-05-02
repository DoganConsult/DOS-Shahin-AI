"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionStatus = transitionStatus;
exports.bulkTransitionStatus = bulkTransitionStatus;
exports.getStatusHistory = getStatusHistory;
exports.cancelItem = cancelItem;
exports.reopenItem = reopenItem;
exports.submitCompletion = submitCompletion;
exports.verifyAction = verifyAction;
exports.closeAction = closeAction;
exports.markOverdue = markOverdue;
exports.escalateAction = escalateAction;
/**
 * Action Item Lifecycle Service
 * Manages state transitions for action items with full audit trail.
 * Uses the canonical ACTION_ITEM_TRANSITIONS from lifecycle-registration.
 * @owner Module:action
 */
const database_port_1 = require("../ports/database.port");
const logger_port_1 = require("../ports/logger.port");
const resilience_1 = require("@dos/platform-core/resilience");
const lifecycle_registration_1 = require("../lifecycle-registration");
const audit_port_1 = require("../ports/audit.port");
const auth_port_1 = require("../ports/auth.port");
const events_port_1 = require("../ports/events.port");
// ---------------------------------------------------------------------------
// Core transition
// ---------------------------------------------------------------------------
/** Transition an action item to a new status with validation and audit. */
async function transitionStatus(tenantId, actionId, targetStatus, userId, reason) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const current = await (0, database_port_1.safeQuery)(`SELECT status FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (current.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const fromStatus = current.rows[0].status;
    const allowed = lifecycle_registration_1.ACTION_ITEM_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
        throw Object.assign(new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`), { statusCode: 400 });
    }
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET status = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`, [targetStatus, userId, actionId]);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".action_status_history
       (action_id, from_status, to_status, changed_by, reason, changed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`, [actionId, fromStatus, targetStatus, userId, reason ?? null]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId,
        module: 'action',
        action: 'update',
        entityType: 'action_item',
        entityId: actionId,
        beforeState: { status: fromStatus },
        afterState: { status: targetStatus },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.status_changed',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, fromStatus, toStatus: targetStatus, changedBy: userId, reason },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Action item transitioned', { actionId, fromStatus, toStatus: targetStatus });
    return { fromStatus, toStatus: targetStatus };
}
// ---------------------------------------------------------------------------
// Bulk transition
// ---------------------------------------------------------------------------
/** Transition multiple action items at once. */
async function bulkTransitionStatus(tenantId, actionIds, targetStatus, userId) {
    const succeeded = [];
    const failed = [];
    for (const id of actionIds) {
        try {
            await transitionStatus(tenantId, id, targetStatus, userId);
            succeeded.push(id);
        }
        catch (e) {
            failed.push({ id, error: e.message });
        }
    }
    logger_port_1.logger.info('Bulk transition completed', { tenantId, targetStatus, succeeded: succeeded.length, failed: failed.length });
    return { succeeded, failed };
}
// ---------------------------------------------------------------------------
// Status history
// ---------------------------------------------------------------------------
/** Get status transition history for an action item. */
async function getStatusHistory(tenantId, actionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT from_status AS "fromStatus", to_status AS "toStatus",
            changed_by AS "changedBy", reason, changed_at AS "changedAt"
     FROM "${schema}".action_status_history
     WHERE action_id = $1
     ORDER BY changed_at ASC`, [actionId]);
    return result.rows;
}
// ---------------------------------------------------------------------------
// Convenience transitions
// ---------------------------------------------------------------------------
/** Cancel an action item. */
async function cancelItem(tenantId, actionId, userId, reason) {
    return transitionStatus(tenantId, actionId, 'cancelled', userId, reason ?? 'Cancelled by user');
}
/** Reopen a completed or cancelled action item. */
async function reopenItem(tenantId, actionId, userId) {
    return transitionStatus(tenantId, actionId, 'open', userId, 'Reopened');
}
/** Submit an action item for completion review. */
async function submitCompletion(tenantId, actionId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await transitionStatus(tenantId, actionId, 'completed', userId, 'Completion submitted');
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET completed_by = $1, completed_at = NOW()
     WHERE action_id = $2`, [userId, actionId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.completed',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, completedBy: userId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return result;
}
/** Verify a completed action item. Requires DAuth lifecycle evaluation. */
async function verifyAction(tenantId, actionId, verifiedBy) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, auth_port_1.evaluateLifecycleTransition)(tenantId, verifiedBy, {
        moduleCode: 'action',
        entityType: 'action_item',
        entityId: actionId,
        fromState: 'completed',
        toState: 'verified',
        permissionCode: 'action.item.verify',
        userRoles: [],
    });
    const result = await transitionStatus(tenantId, actionId, 'verified', verifiedBy, 'Verified');
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET verified_by = $1, verified_at = NOW()
     WHERE action_id = $2`, [verifiedBy, actionId]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.verified',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, verifiedBy },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return result;
}
/** Close a verified action item. */
async function closeAction(tenantId, actionId, userId) {
    await (0, auth_port_1.evaluateLifecycleTransition)(tenantId, userId, {
        moduleCode: 'action',
        entityType: 'action_item',
        entityId: actionId,
        fromState: 'verified',
        toState: 'closed',
        permissionCode: 'action.item.close',
        userRoles: [],
    });
    return transitionStatus(tenantId, actionId, 'closed', userId, 'Closed after verification');
}
/** Mark an action item as overdue. */
async function markOverdue(tenantId, actionId, systemUserId) {
    const result = await transitionStatus(tenantId, actionId, 'overdue', systemUserId, 'Deadline exceeded');
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.overdue_detected',
        tenantId,
        sourceService: 'action',
        severity: 'critical',
        payload: { actionId, detectedBy: systemUserId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return result;
}
/** Escalate an overdue action item. */
async function escalateAction(tenantId, actionId, escalatedBy, reason) {
    const result = await transitionStatus(tenantId, actionId, 'escalated', escalatedBy, reason ?? 'Escalated');
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.escalated',
        tenantId,
        sourceService: 'action',
        severity: 'warning',
        payload: { actionId, escalatedBy, reason },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return result;
}
//# sourceMappingURL=action-lifecycle.service.js.map