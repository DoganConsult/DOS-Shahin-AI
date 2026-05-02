"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActionItems = getActionItems;
exports.createActionItem = createActionItem;
exports.updateActionItem = updateActionItem;
exports.getDailyDigest = getDailyDigest;
exports.getConsolidatedActionCenter = getConsolidatedActionCenter;
exports.createActionFromEvent = createActionFromEvent;
/**
 * Action Item Core CRUD Service
 * Provides read/write operations for action_items table.
 * @owner Module:action
 */
const crypto_1 = require("crypto");
const database_port_1 = require("../ports/database.port");
const logger_port_1 = require("../ports/logger.port");
const resilience_1 = require("@dos/platform-core/resilience");
const audit_port_1 = require("../ports/audit.port");
const events_port_1 = require("../ports/events.port");
// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------
function mapRow(row, tenantId) {
    const deadline = row.deadline;
    const targetDate = row.target_date;
    const dueDate = deadline ?? targetDate ?? null;
    const status = row.status;
    const isOverdue = status !== 'closed' &&
        status !== 'cancelled' &&
        status !== 'verified' &&
        dueDate !== null &&
        new Date(dueDate) < new Date();
    return {
        actionId: row.action_id,
        tenantId,
        title: row.title,
        description: row.description ?? null,
        status,
        priority: row.criticality ?? 'medium',
        source: row.source_type ?? 'manual',
        sourceId: row.source_id ?? '',
        assignedToId: row.assigned_to ?? null,
        ownerId: row.owner_team_id ?? null,
        dueDate,
        completedAt: row.completed_at ?? null,
        verifiedById: row.verified_by ?? null,
        verifiedAt: row.verified_at ?? null,
        progressPercent: Number(row.progress_percentage ?? 0),
        isOverdue,
        linkedModuleCode: row.source_type ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------
/** List action items with optional filters, ordered by criticality + deadline. */
async function getActionItems(tenantId, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    let paramIdx = 0;
    if (filters?.status) {
        paramIdx += 1;
        conditions.push(`status = $${paramIdx}`);
        params.push(filters.status);
    }
    if (filters?.assignedTo) {
        paramIdx += 1;
        conditions.push(`assigned_to = $${paramIdx}`);
        params.push(filters.assignedTo);
    }
    if (filters?.sourceType) {
        paramIdx += 1;
        conditions.push(`source_type = $${paramIdx}`);
        params.push(filters.sourceType);
    }
    const where = conditions.join(' AND ');
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".action_items WHERE ${where}`, params);
    const total = countResult.rows[0]?.total ?? 0;
    const dataResult = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".action_items
     WHERE ${where}
     ORDER BY
       CASE criticality WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
       deadline ASC NULLS LAST
     LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`, [...params, limit, offset]);
    const items = dataResult.rows.map((r) => mapRow(r, tenantId));
    return { items, total };
}
/** Create a new action item. */
async function createActionItem(tenantId, input) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const actionId = (0, crypto_1.randomUUID)();
    const now = new Date().toISOString();
    const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".action_items
       (action_id, title, description, source_type, source_id, assigned_to,
        target_date, deadline, criticality, status, created_at, updated_at,
        created_by, updated_by, progress_percentage, verification_required,
        verification_method, owner_team_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10,$10,$11,$11,0,$12,$13,$14)
     RETURNING *`, [
        actionId,
        input.title,
        input.description ?? null,
        input.sourceType ?? 'manual',
        input.sourceId ?? null,
        input.assignedTo ?? null,
        input.targetDate ?? null,
        input.deadline ?? null,
        input.criticality ?? 'medium',
        now,
        input.createdBy,
        input.verificationRequired ?? false,
        input.verificationMethod ?? null,
        input.ownerTeamId ?? null,
    ]);
    const record = mapRow(result.rows[0], tenantId);
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId: input.createdBy,
        module: 'action',
        action: 'create',
        entityType: 'action_item',
        entityId: actionId,
        afterState: record,
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.created',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, title: input.title, createdBy: input.createdBy },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Action item created', { actionId, tenantId });
    return record;
}
/** Update an existing action item. */
async function updateActionItem(tenantId, actionId, updates) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const columnMap = {
        title: 'title',
        description: 'description',
        assignedTo: 'assigned_to',
        targetDate: 'target_date',
        deadline: 'deadline',
        criticality: 'criticality',
        progressPercentage: 'progress_percentage',
        verificationRequired: 'verification_required',
        verificationMethod: 'verification_method',
        ownerTeamId: 'owner_team_id',
    };
    const setClauses = ['updated_at = NOW()', 'updated_by = $2'];
    const params = [actionId, updates.updatedBy];
    let idx = 2;
    for (const [key, col] of Object.entries(columnMap)) {
        const val = updates[key];
        if (val !== undefined) {
            idx += 1;
            setClauses.push(`${col} = $${idx}`);
            params.push(val);
        }
    }
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items SET ${setClauses.join(', ')}
     WHERE action_id = $1 AND deleted_at IS NULL
     RETURNING *`, params);
    if (result.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const record = mapRow(result.rows[0], tenantId);
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId: updates.updatedBy,
        module: 'action',
        action: 'update',
        entityType: 'action_item',
        entityId: actionId,
        afterState: record,
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Action item updated', { actionId, tenantId });
    return record;
}
/** Daily digest: overdue, due-soon, and recently completed items for a user. */
async function getDailyDigest(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const overdueResult = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".action_items
     WHERE assigned_to = $1 AND deleted_at IS NULL
       AND status NOT IN ('closed','cancelled','verified')
       AND (deadline < NOW() OR target_date < NOW())
     ORDER BY deadline ASC NULLS LAST`, [userId]);
    const dueSoonResult = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".action_items
     WHERE assigned_to = $1 AND deleted_at IS NULL
       AND status NOT IN ('closed','cancelled','verified','completed')
       AND deadline IS NOT NULL
       AND deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days'
     ORDER BY deadline ASC`, [userId]);
    const recentlyCompletedResult = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".action_items
     WHERE assigned_to = $1 AND deleted_at IS NULL
       AND status IN ('completed','verified','closed')
       AND completed_at >= NOW() - INTERVAL '7 days'
     ORDER BY completed_at DESC`, [userId]);
    return {
        overdue: overdueResult.rows.map((r) => mapRow(r, tenantId)),
        dueSoon: dueSoonResult.rows.map((r) => mapRow(r, tenantId)),
        recentlyCompleted: recentlyCompletedResult.rows.map((r) => mapRow(r, tenantId)),
    };
}
/** Consolidated action center: all active items sorted by criticality. */
async function getConsolidatedActionCenter(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const conditions = ['deleted_at IS NULL', "status NOT IN ('closed','cancelled')"];
    const params = [];
    if (userId) {
        params.push(userId);
        conditions.push(`assigned_to = $${params.length}`);
    }
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".action_items
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE criticality WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
       CASE WHEN deadline < NOW() THEN 0 ELSE 1 END,
       deadline ASC NULLS LAST`, params);
    return result.rows.map((r) => mapRow(r, tenantId));
}
/** Create an action item from a cross-module event. */
async function createActionFromEvent(tenantId, source, details) {
    logger_port_1.logger.info('Creating action item from cross-module event', { tenantId, source });
    return createActionItem(tenantId, {
        title: details.title,
        description: details.description,
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        assignedTo: details.assignedTo,
        deadline: details.deadline,
        criticality: details.criticality ?? 'medium',
        createdBy: source.triggeredBy,
    });
}
//# sourceMappingURL=action-item.service.js.map