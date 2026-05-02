"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onWorkflowTriggered = onWorkflowTriggered;
exports.onTaskCreated = onTaskCreated;
exports.onApprovalRequired = onApprovalRequired;
exports.onEscalation = onEscalation;
exports.onClosure = onClosure;
exports.onFailure = onFailure;
const db_1 = require("@dos/db");
async function onWorkflowTriggered(ctx) {
    const { tenantId } = ctx;
    await (0, db_1.safeQuery)("UPDATE __TENANT_SCHEMA__.asset_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
async function onTaskCreated(ctx, _taskId) {
    const { tenantId } = ctx;
    await (0, db_1.safeQuery)("UPDATE __TENANT_SCHEMA__.asset_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
async function onApprovalRequired(ctx, _approverRole) {
    const { tenantId } = ctx;
    await (0, db_1.safeQuery)("UPDATE __TENANT_SCHEMA__.asset_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
async function onEscalation(ctx, _reason, _escalateTo) {
    const { tenantId } = ctx;
    await (0, db_1.safeQuery)("UPDATE __TENANT_SCHEMA__.asset_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
async function onClosure(ctx, _closureReason) {
    const { tenantId } = ctx;
    await (0, db_1.safeQuery)("UPDATE __TENANT_SCHEMA__.asset_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
async function onFailure(ctx, _error) {
    const { tenantId } = ctx;
    await (0, db_1.safeQuery)("UPDATE __TENANT_SCHEMA__.asset_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
//# sourceMappingURL=asset-workflow.service.js.map