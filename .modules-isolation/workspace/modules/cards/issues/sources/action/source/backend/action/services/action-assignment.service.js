"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignAction = assignAction;
exports.reassignAction = reassignAction;
exports.getAssignmentHistory = getAssignmentHistory;
exports.getAssigneeWorkload = getAssigneeWorkload;
/**
 * Action Assignment Service
 * Manages assignment and reassignment of action items with full history.
 * @owner Module:action
 */
const database_port_1 = require("../ports/database.port");
const logger_port_1 = require("../ports/logger.port");
const resilience_1 = require("@dos/platform-core/resilience");
const audit_port_1 = require("../ports/audit.port");
const events_port_1 = require("../ports/events.port");
// ---------------------------------------------------------------------------
// Assign
// ---------------------------------------------------------------------------
/** Assign an action item to a user. */
async function assignAction(tenantId, actionId, assigneeId, assignedBy) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const current = await (0, database_port_1.safeQuery)(`SELECT assigned_to FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (current.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const previousAssignee = current.rows[0].assigned_to ?? null;
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET assigned_to = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`, [assigneeId, assignedBy, actionId]);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".action_assignment_history
       (action_id, previous_assignee, new_assignee, assigned_by, reason, assigned_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`, [actionId, previousAssignee, assigneeId, assignedBy, 'Initial assignment']).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId: assignedBy,
        module: 'action',
        action: 'update',
        entityType: 'action_item',
        entityId: actionId,
        beforeState: { assigned_to: previousAssignee },
        afterState: { assigned_to: assigneeId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.assigned',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, assigneeId, assignedBy, previousAssignee },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Action item assigned', { actionId, assigneeId, assignedBy });
    return { actionId, assigneeId };
}
// ---------------------------------------------------------------------------
// Reassign
// ---------------------------------------------------------------------------
/** Reassign an action item to a different user. Validates not same user. */
async function reassignAction(tenantId, actionId, newAssigneeId, reassignedBy, reason) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const current = await (0, database_port_1.safeQuery)(`SELECT assigned_to FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (current.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const previousAssigneeId = current.rows[0].assigned_to ?? null;
    if (previousAssigneeId === newAssigneeId) {
        throw Object.assign(new Error('Cannot reassign to the same user'), { statusCode: 400 });
    }
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET assigned_to = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`, [newAssigneeId, reassignedBy, actionId]);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".action_assignment_history
       (action_id, previous_assignee, new_assignee, assigned_by, reason, assigned_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`, [actionId, previousAssigneeId, newAssigneeId, reassignedBy, reason]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId: reassignedBy,
        module: 'action',
        action: 'update',
        entityType: 'action_item',
        entityId: actionId,
        beforeState: { assigned_to: previousAssigneeId },
        afterState: { assigned_to: newAssigneeId },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.reassigned',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, newAssigneeId, previousAssigneeId, reassignedBy, reason },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Action item reassigned', { actionId, newAssigneeId, reassignedBy, reason });
    return { actionId, newAssigneeId, previousAssigneeId };
}
// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
/** Get full assignment history for an action item. */
async function getAssignmentHistory(tenantId, actionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT
       id AS "assignmentId",
       action_id AS "actionId",
       previous_assignee AS "previousAssignee",
       new_assignee AS "newAssignee",
       assigned_by AS "assignedBy",
       reason,
       assigned_at AS "assignedAt"
     FROM "${schema}".action_assignment_history
     WHERE action_id = $1
     ORDER BY assigned_at ASC`, [actionId]);
    return result.rows;
}
// ---------------------------------------------------------------------------
// Workload
// ---------------------------------------------------------------------------
/** Get workload counts per assignee across all active action items. */
async function getAssigneeWorkload(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT
       assigned_to AS "assigneeId",
       COUNT(*) FILTER (WHERE status = 'open')::int AS "openCount",
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS "inProgressCount",
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS "overdueCount",
       COUNT(*)::int AS "totalActive"
     FROM "${schema}".action_items
     WHERE deleted_at IS NULL
       AND assigned_to IS NOT NULL
       AND status NOT IN ('closed', 'cancelled', 'verified')
     GROUP BY assigned_to
     ORDER BY "totalActive" DESC`, []);
    return result.rows;
}
//# sourceMappingURL=action-assignment.service.js.map