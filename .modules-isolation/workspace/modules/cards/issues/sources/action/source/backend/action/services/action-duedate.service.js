"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDueDate = setDueDate;
exports.extendDueDate = extendDueDate;
exports.checkOverdue = checkOverdue;
exports.getUpcomingDeadlines = getUpcomingDeadlines;
/**
 * Action Due-Date Service
 * Manages due dates, extensions, overdue detection, and upcoming deadline queries.
 * @owner Module:action
 */
const database_port_1 = require("../ports/database.port");
const logger_port_1 = require("../ports/logger.port");
const resilience_1 = require("@dos/platform-core/resilience");
const audit_port_1 = require("../ports/audit.port");
const events_port_1 = require("../ports/events.port");
// ---------------------------------------------------------------------------
// Set due date
// ---------------------------------------------------------------------------
/** Set or update the deadline for an action item. */
async function setDueDate(tenantId, actionId, deadline, updatedBy) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const parsed = new Date(deadline);
    if (isNaN(parsed.getTime())) {
        throw Object.assign(new Error('Invalid deadline date'), { statusCode: 400 });
    }
    const current = await (0, database_port_1.safeQuery)(`SELECT deadline FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (current.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const previousDeadline = current.rows[0].deadline ?? null;
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET deadline = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`, [deadline, updatedBy, actionId]);
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId: updatedBy,
        module: 'action',
        action: 'update',
        entityType: 'action_item',
        entityId: actionId,
        beforeState: { deadline: previousDeadline },
        afterState: { deadline },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Due date set', { actionId, deadline, updatedBy });
    return { actionId, deadline };
}
// ---------------------------------------------------------------------------
// Extend due date
// ---------------------------------------------------------------------------
/** Extend the deadline for an action item. New date must be after current deadline. */
async function extendDueDate(tenantId, actionId, newDeadline, extendedBy, reason) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const parsed = new Date(newDeadline);
    if (isNaN(parsed.getTime())) {
        throw Object.assign(new Error('Invalid deadline date'), { statusCode: 400 });
    }
    const current = await (0, database_port_1.safeQuery)(`SELECT deadline FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (current.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const previousDeadline = current.rows[0].deadline ?? null;
    if (previousDeadline && new Date(newDeadline) <= new Date(previousDeadline)) {
        throw Object.assign(new Error('New deadline must be after the current deadline'), { statusCode: 400 });
    }
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET deadline = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`, [newDeadline, extendedBy, actionId]);
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId: extendedBy,
        module: 'action',
        action: 'update',
        entityType: 'action_item',
        entityId: actionId,
        beforeState: { deadline: previousDeadline },
        afterState: { deadline: newDeadline, extensionReason: reason },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.updated',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, previousDeadline, newDeadline, extendedBy, reason },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Due date extended', { actionId, previousDeadline, newDeadline, extendedBy, reason });
    return { actionId, previousDeadline, newDeadline };
}
// ---------------------------------------------------------------------------
// Check overdue
// ---------------------------------------------------------------------------
/** Find all action items that are past their deadline and not yet in a terminal state. */
async function checkOverdue(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT action_id, title, deadline, assigned_to, status, criticality
     FROM "${schema}".action_items
     WHERE deleted_at IS NULL
       AND status NOT IN ('closed', 'cancelled', 'verified', 'overdue', 'escalated')
       AND deadline IS NOT NULL
       AND deadline < NOW()
     ORDER BY deadline ASC`, []);
    return result.rows.map((row) => {
        const deadlineDate = new Date(row.deadline);
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
            actionId: row.action_id,
            title: row.title,
            deadline: row.deadline,
            assignedTo: row.assigned_to ?? null,
            status: row.status,
            criticality: row.criticality,
            daysOverdue,
        };
    });
}
// ---------------------------------------------------------------------------
// Upcoming deadlines
// ---------------------------------------------------------------------------
/** Get action items with deadlines within the specified number of days. */
async function getUpcomingDeadlines(tenantId, withinDays) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    if (withinDays < 0) {
        throw Object.assign(new Error('withinDays must be non-negative'), { statusCode: 400 });
    }
    const result = await (0, database_port_1.safeQuery)(`SELECT action_id, title, deadline, assigned_to, status, criticality
     FROM "${schema}".action_items
     WHERE deleted_at IS NULL
       AND status NOT IN ('closed', 'cancelled', 'verified', 'completed')
       AND deadline IS NOT NULL
       AND deadline BETWEEN NOW() AND NOW() + ($1 || ' days')::INTERVAL
     ORDER BY deadline ASC`, [withinDays]);
    return result.rows.map((row) => {
        const deadlineDate = new Date(row.deadline);
        const now = new Date();
        const hoursRemaining = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
        return {
            actionId: row.action_id,
            title: row.title,
            deadline: row.deadline,
            assignedTo: row.assigned_to ?? null,
            status: row.status,
            criticality: row.criticality,
            hoursRemaining,
        };
    });
}
//# sourceMappingURL=action-duedate.service.js.map