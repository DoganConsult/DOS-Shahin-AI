import { publish } from '../events';
export const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled', 'archived'];
export async function emitWorkflowStatusChange(tenantId, payload) {
    return publish('workflow.status_changed', tenantId, payload, { moduleCode: 'workflow', category: 'domain' });
}
export async function emitSlaWarning(tenantId, payload) {
    return publish('workflow.sla_warning', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' });
}
export async function emitSlaBreached(tenantId, payload) {
    return publish('workflow.sla_breached', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'error' });
}
export async function emitTaskOverdue(tenantId, payload) {
    return publish('workflow.task_overdue', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' });
}
export async function emitApprovalEscalated(tenantId, payload) {
    return publish('workflow.approval_escalated', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' });
}
export async function primeDescriptorCache(_tenantId) { }
export function getFullRegistry() {
    return {};
}
//# sourceMappingURL=compat.js.map