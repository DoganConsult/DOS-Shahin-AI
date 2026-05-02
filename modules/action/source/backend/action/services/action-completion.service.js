"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionStatus = getCompletionStatus;
exports.validateCompletionReadiness = validateCompletionReadiness;
exports.recordVerification = recordVerification;
/**
 * Action Completion Service
 * Handles completion readiness checks, evidence validation, and verification recording.
 * @owner Module:action
 */
const database_port_1 = require("../ports/database.port");
const logger_port_1 = require("../ports/logger.port");
const resilience_1 = require("@dos/platform-core/resilience");
const audit_port_1 = require("../ports/audit.port");
const events_port_1 = require("../ports/events.port");
// ---------------------------------------------------------------------------
// Completion status
// ---------------------------------------------------------------------------
/** Get the completion status for an action item including evidence count. */
async function getCompletionStatus(tenantId, actionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const itemResult = await (0, database_port_1.safeQuery)(`SELECT action_id, status, completed_by, verified_by, verified_at,
            completed_at, verification_required, verification_method,
            progress_percentage
     FROM "${schema}".action_items
     WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (itemResult.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const row = itemResult.rows[0];
    const evidenceResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count
     FROM "${schema}".action_evidence
     WHERE action_id = $1`, [actionId]).catch((_err) => {
        logger_port_1.logger.warn('action_evidence table query failed, defaulting to 0', { actionId });
        return { rows: [{ count: 0 }] };
    });
    const evidenceCount = evidenceResult.rows[0]?.count ?? 0;
    return {
        actionId: row.action_id,
        status: row.status,
        evidenceCount,
        submittedBy: row.completed_by ?? null,
        verifiedBy: row.verified_by ?? null,
        verifiedAt: row.verified_at ?? null,
        completedAt: row.completed_at ?? null,
        verificationRequired: row.verification_required ?? false,
        verificationMethod: row.verification_method ?? null,
        progressPercent: Number(row.progress_percentage ?? 0),
    };
}
// ---------------------------------------------------------------------------
// Readiness check
// ---------------------------------------------------------------------------
/** Validate whether an action item is ready for completion submission. */
async function validateCompletionReadiness(tenantId, actionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const reasons = [];
    const itemResult = await (0, database_port_1.safeQuery)(`SELECT status, assigned_to, verification_required
     FROM "${schema}".action_items
     WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (itemResult.rows.length === 0) {
        return { ready: false, reasons: ['Action item not found'] };
    }
    const row = itemResult.rows[0];
    if (row.status !== 'in_progress') {
        reasons.push(`Status must be 'in_progress' to submit completion, current status: '${row.status}'`);
    }
    if (!row.assigned_to) {
        reasons.push('Action item has no assigned user');
    }
    if (row.verification_required) {
        const evidenceResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count
       FROM "${schema}".action_evidence
       WHERE action_id = $1`, [actionId]).catch((_err) => {
            logger_port_1.logger.warn('action_evidence table query failed during readiness check', { actionId });
            return { rows: [{ count: 0 }] };
        });
        const evidenceCount = evidenceResult.rows[0]?.count ?? 0;
        if (evidenceCount === 0) {
            reasons.push('Verification is required but no evidence has been attached');
        }
    }
    const blockerResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count
     FROM "${schema}".action_blockers
     WHERE action_id = $1 AND resolved_at IS NULL`, [actionId]).catch((_err) => {
        logger_port_1.logger.warn('action_blockers table query failed, assuming no blockers', { actionId });
        return { rows: [{ count: 0 }] };
    });
    const unresolvedBlockers = blockerResult.rows[0]?.count ?? 0;
    if (unresolvedBlockers > 0) {
        reasons.push(`${unresolvedBlockers} unresolved blocker(s) remain`);
    }
    const ready = reasons.length === 0;
    logger_port_1.logger.info('Completion readiness evaluated', { actionId, ready, reasonCount: reasons.length });
    return { ready, reasons };
}
// ---------------------------------------------------------------------------
// Verification recording
// ---------------------------------------------------------------------------
/** Record verification of a completed action item. */
async function recordVerification(tenantId, actionId, verifiedBy) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const itemResult = await (0, database_port_1.safeQuery)(`SELECT status, completed_by FROM "${schema}".action_items
     WHERE action_id = $1 AND deleted_at IS NULL`, [actionId]);
    if (itemResult.rows.length === 0) {
        throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
    }
    const row = itemResult.rows[0];
    if (row.status !== 'completed') {
        throw Object.assign(new Error(`Cannot verify action in '${row.status}' status, must be 'completed'`), { statusCode: 400 });
    }
    if (row.completed_by === verifiedBy) {
        throw Object.assign(new Error('Verifier must be different from the person who completed the item'), { statusCode: 400 });
    }
    const updateResult = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".action_items
     SET verified_by = $1, verified_at = NOW(), updated_at = NOW(), updated_by = $1
     WHERE action_id = $2
     RETURNING verified_at`, [verifiedBy, actionId]);
    const verifiedAt = updateResult.rows[0].verified_at;
    (0, audit_port_1.recordAudit)({
        tenantId,
        userId: verifiedBy,
        module: 'action',
        action: 'update',
        entityType: 'action_item',
        entityId: actionId,
        beforeState: { verified_by: null },
        afterState: { verified_by: verifiedBy, verified_at: verifiedAt },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    (0, events_port_1.emitEvent)({
        eventType: 'action.action_item.verified',
        tenantId,
        sourceService: 'action',
        severity: 'info',
        payload: { actionId, verifiedBy, verifiedAt },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    logger_port_1.logger.info('Action item verification recorded', { actionId, verifiedBy, verifiedAt });
    return { actionId, verifiedBy, verifiedAt };
}
//# sourceMappingURL=action-completion.service.js.map