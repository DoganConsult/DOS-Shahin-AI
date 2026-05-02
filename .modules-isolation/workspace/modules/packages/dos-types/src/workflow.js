"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_ACTION_SUBTYPES_EXECUTED = exports.ALL_PALETTE_NODE_TYPES = exports.WORKFLOW_NODE_TYPES_UI_ONLY = exports.WORKFLOW_NODE_TYPES_EXECUTED = void 0;
exports.isExecutedNodeType = isExecutedNodeType;
exports.isExecutableActionSubType = isExecutableActionSubType;
exports.isTenantWideExecutionRole = isTenantWideExecutionRole;
exports.WORKFLOW_NODE_TYPES_EXECUTED = [
    'start', 'end', 'approval', 'task', 'condition', 'parallel',
    'timer', 'notification', 'escalation', 'subprocess', 'script',
];
exports.WORKFLOW_NODE_TYPES_UI_ONLY = [
    'note', 'group', 'swimlane', 'label',
];
exports.ALL_PALETTE_NODE_TYPES = [
    ...exports.WORKFLOW_NODE_TYPES_EXECUTED,
    ...exports.WORKFLOW_NODE_TYPES_UI_ONLY,
];
function isExecutedNodeType(value) {
    return typeof value === 'string' && exports.WORKFLOW_NODE_TYPES_EXECUTED.includes(value);
}
exports.WORKFLOW_ACTION_SUBTYPES_EXECUTED = [
    'api_call', 'send_email', 'webhook', 'db_query', 'script_run',
    'approval', 'task', 'script', 'subprocess',
];
function isExecutableActionSubType(value) {
    return typeof value === 'string' && exports.WORKFLOW_ACTION_SUBTYPES_EXECUTED.includes(value);
}
function isTenantWideExecutionRole(role) {
    return ['tenant_admin', 'workflow_admin', 'platform_super_admin'].includes(role);
}
//# sourceMappingURL=workflow.js.map