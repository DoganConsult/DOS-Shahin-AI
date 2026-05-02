"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateRollback = initiateRollback;
exports.advanceRollbackStatus = advanceRollbackStatus;
exports.getRollback = getRollback;
exports.getRollbackByDeployment = getRollbackByDeployment;
exports.listRollbacks = listRollbacks;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
const deployment_service_1 = require("../deployment/deployment.service");
async function initiateRollback(input) {
    const rollbackId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO dos_rollbacks (
      rollback_id, deployment_id, release_id, tenant_id, status,
      triggered_by, trigger_reason, initiated_at, completed_at, failed_at,
      failure_reason, data_integrity_notes
    ) VALUES ($1,$2,$3,$4,'initiated',$5,$6,$7,NULL,NULL,NULL,$8)`, [
        rollbackId,
        input.deploymentId,
        input.releaseId,
        input.tenantId,
        input.triggeredBy,
        input.triggerReason,
        now,
        input.dataIntegrityNotes ?? null,
    ]);
    await (0, events_1.publish)('delivery.rollback.initiated', input.tenantId, { rollbackId, deploymentId: input.deploymentId, releaseId: input.releaseId }, {});
    return getRollback(input.tenantId, rollbackId);
}
async function advanceRollbackStatus(tenantId, rollbackId, newStatus, failureReason) {
    const now = new Date().toISOString();
    if (newStatus === 'completed') {
        await (0, db_1.safeQuery)(`UPDATE dos_rollbacks SET status = 'completed', completed_at = $1 WHERE rollback_id = $2`, [now, rollbackId]);
        const rollback = await getRollback(tenantId, rollbackId);
        if (rollback) {
            await (0, deployment_service_1.markDeploymentRolledBack)(tenantId, rollback.deploymentId, rollbackId);
        }
        await (0, events_1.publish)('delivery.rollback.completed', tenantId, { rollbackId }, {});
    }
    else if (newStatus === 'failed') {
        await (0, db_1.safeQuery)(`UPDATE dos_rollbacks SET status = 'failed', failed_at = $1, failure_reason = $2 WHERE rollback_id = $3`, [now, failureReason ?? null, rollbackId]);
        await (0, events_1.publish)('delivery.rollback.failed', tenantId, { rollbackId, reason: failureReason }, {});
    }
    else {
        await (0, db_1.safeQuery)(`UPDATE dos_rollbacks SET status = $1 WHERE rollback_id = $2`, [newStatus, rollbackId]);
    }
}
async function getRollback(tenantId, rollbackId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM dos_rollbacks WHERE rollback_id = $1 LIMIT 1`, [rollbackId]);
    if (!result.rows[0])
        return null;
    return mapRollbackRow(result.rows[0]);
}
async function getRollbackByDeployment(tenantId, deploymentId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM dos_rollbacks WHERE deployment_id = $1 ORDER BY initiated_at DESC LIMIT 1`, [deploymentId]);
    if (!result.rows[0])
        return null;
    return mapRollbackRow(result.rows[0]);
}
async function listRollbacks(tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM dos_rollbacks ORDER BY initiated_at DESC`, []);
    return result.rows.map(mapRollbackRow);
}
function mapRollbackRow(row) {
    return {
        rollbackId: row.rollback_id,
        deploymentId: row.deployment_id,
        releaseId: row.release_id,
        tenantId: row.tenant_id,
        status: row.status,
        triggeredBy: row.triggered_by,
        triggerReason: row.trigger_reason,
        initiatedAt: row.initiated_at,
        completedAt: row.completed_at ?? null,
        failedAt: row.failed_at ?? null,
        failureReason: row.failure_reason ?? null,
        dataIntegrityNotes: row.data_integrity_notes ?? null,
    };
}
//# sourceMappingURL=rollback.service.js.map