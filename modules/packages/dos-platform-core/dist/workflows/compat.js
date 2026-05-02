"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_STATUSES = void 0;
exports.emitWorkflowStatusChange = emitWorkflowStatusChange;
exports.emitSlaWarning = emitSlaWarning;
exports.emitSlaBreached = emitSlaBreached;
exports.emitTaskOverdue = emitTaskOverdue;
exports.emitApprovalEscalated = emitApprovalEscalated;
exports.primeDescriptorCache = primeDescriptorCache;
exports.getFullRegistry = getFullRegistry;
const events_1 = require("../events");
exports.WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled', 'archived'];
async function emitWorkflowStatusChange(tenantId, payload) {
    return (0, events_1.publish)('workflow.status_changed', tenantId, payload, { moduleCode: 'workflow', category: 'domain' });
}
async function emitSlaWarning(tenantId, payload) {
    return (0, events_1.publish)('workflow.sla_warning', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' });
}
async function emitSlaBreached(tenantId, payload) {
    return (0, events_1.publish)('workflow.sla_breached', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'error' });
}
async function emitTaskOverdue(tenantId, payload) {
    return (0, events_1.publish)('workflow.task_overdue', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' });
}
async function emitApprovalEscalated(tenantId, payload) {
    return (0, events_1.publish)('workflow.approval_escalated', tenantId, payload, { moduleCode: 'workflow', category: 'domain', severity: 'warn' });
}
async function primeDescriptorCache(_tenantId) { }
function getFullRegistry() {
    return {};
}
//# sourceMappingURL=compat.js.map