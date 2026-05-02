import { safeQuery } from "@dos/db";
export async function onWorkflowTriggered(_ctx) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
    return {};
}
export async function onTaskCreated(_ctx, _taskId) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
    return {};
}
export async function onApprovalRequired(_ctx, _approverRole) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
    return {};
}
export async function onEscalation(_ctx, _reason, _escalateTo) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
    return {};
}
export async function onClosure(_ctx, _closureReason) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
    return {};
}
export async function onFailure(_ctx, _error) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (_ctx.tenantId ? " WHERE tenant_id = $1" : ""), _ctx.tenantId ? [_ctx.tenantId] : []);
    return {};
}
//# sourceMappingURL=ai-governance-workflow.service.js.map