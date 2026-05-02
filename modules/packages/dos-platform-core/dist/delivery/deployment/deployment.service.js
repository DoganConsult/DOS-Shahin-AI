"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDeployment = startDeployment;
exports.completeDeployment = completeDeployment;
exports.failDeployment = failDeployment;
exports.markDeploymentRolledBack = markDeploymentRolledBack;
exports.getDeployment = getDeployment;
exports.listDeployments = listDeployments;
exports.getDeploymentsByRelease = getDeploymentsByRelease;
exports.getActiveDeployment = getActiveDeployment;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function startDeployment(input) {
    const deploymentId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO dos_deployments (
      deployment_id, release_id, tenant_id, environment, status,
      deployed_by, started_at, completed_at, failed_at, failure_reason, rollback_id
    ) VALUES ($1,$2,$3,$4,'in_progress',$5,$6,NULL,NULL,NULL,NULL)`, [deploymentId, input.releaseId, input.tenantId, input.environment, input.deployedBy, now]);
    await (0, events_1.publish)('delivery.deployment.started', input.tenantId, { deploymentId, releaseId: input.releaseId, environment: input.environment }, {});
    return getDeployment(input.tenantId, deploymentId);
}
async function completeDeployment(tenantId, deploymentId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE dos_deployments SET status = 'completed', completed_at = $1 WHERE deployment_id = $2`, [now, deploymentId]);
    await (0, events_1.publish)('delivery.deployment.completed', tenantId, { deploymentId }, {});
}
async function failDeployment(tenantId, deploymentId, reason) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE dos_deployments SET status = 'failed', failed_at = $1, failure_reason = $2 WHERE deployment_id = $3`, [now, reason, deploymentId]);
    await (0, events_1.publish)('delivery.deployment.failed', tenantId, { deploymentId, reason }, {});
}
async function markDeploymentRolledBack(tenantId, deploymentId, rollbackId) {
    await (0, db_1.safeQuery)(`UPDATE dos_deployments SET status = 'rolled_back', rollback_id = $1 WHERE deployment_id = $2`, [rollbackId, deploymentId]);
}
async function getDeployment(tenantId, deploymentId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM dos_deployments WHERE deployment_id = $1 LIMIT 1`, [deploymentId]);
    if (!result.rows[0])
        return null;
    return mapDeploymentRow(result.rows[0]);
}
async function listDeployments(tenantId, environment) {
    const result = environment
        ? await (0, db_1.safeQuery)(`SELECT * FROM dos_deployments WHERE environment = $1 ORDER BY started_at DESC`, [environment])
        : await (0, db_1.safeQuery)(`SELECT * FROM dos_deployments ORDER BY started_at DESC`, []);
    return result.rows.map(mapDeploymentRow);
}
async function getDeploymentsByRelease(tenantId, releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM dos_deployments WHERE release_id = $1 ORDER BY started_at DESC`, [releaseId]);
    return result.rows.map(mapDeploymentRow);
}
async function getActiveDeployment(tenantId, environment) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM dos_deployments WHERE environment = $1 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`, [environment]);
    if (!result.rows[0])
        return null;
    return mapDeploymentRow(result.rows[0]);
}
function mapDeploymentRow(row) {
    return {
        deploymentId: row.deployment_id,
        releaseId: row.release_id,
        tenantId: row.tenant_id,
        environment: row.environment,
        status: row.status,
        deployedBy: row.deployed_by,
        startedAt: row.started_at,
        completedAt: row.completed_at ?? null,
        failedAt: row.failed_at ?? null,
        failureReason: row.failure_reason ?? null,
        rollbackId: row.rollback_id ?? null,
    };
}
//# sourceMappingURL=deployment.service.js.map