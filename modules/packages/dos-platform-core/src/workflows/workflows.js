export const EMPTY_RESOLUTION = {};
export const SLA_DEFAULTS = {
    low: 72,
    medium: 48,
    high: 24,
    critical: 4,
};
let _workflows = null;
export function setWorkflowEngine(impl) {
    _workflows = impl;
}
function getWorkflows() {
    if (!_workflows) {
        throw new Error('PlatformWorkflows not initialized. Call setWorkflowEngine() first.');
    }
    return _workflows;
}
export function createProcessTask(tenantId, input) {
    return getWorkflows().createProcessTask(tenantId, input);
}
export function completeProcessTask(tenantId, taskId, outcome) {
    return getWorkflows().completeProcessTask(tenantId, taskId, outcome);
}
export function createAutomationRule(tenantId, input) {
    return getWorkflows().createAutomationRule(tenantId, input);
}
export function getAutomationRule(tenantId, ruleId) {
    return getWorkflows().getAutomationRule(tenantId, ruleId);
}
export function getAutomationRules(tenantId, moduleCode) {
    return getWorkflows().getAutomationRules(tenantId, moduleCode);
}
export function updateAutomationRule(tenantId, ruleId, updates) {
    return getWorkflows().updateAutomationRule(tenantId, ruleId, updates);
}
export function deleteAutomationRule(tenantId, ruleId) {
    return getWorkflows().deleteAutomationRule(tenantId, ruleId);
}
export function getAutomationLog(tenantId, ruleId) {
    return getWorkflows().getAutomationLog(tenantId, ruleId);
}
export function advanceStep(tenantId, stepId) {
    return getWorkflows().advanceStep(tenantId, stepId);
}
export function completeStep(tenantId, stepId) {
    return getWorkflows().completeStep(tenantId, stepId);
}
export function startWorkflowExecution(tenantId, definitionId, entityId, opts) {
    const impl = getWorkflows();
    if (!impl.startWorkflowExecution)
        throw new Error('startWorkflowExecution() not supported.');
    return impl.startWorkflowExecution(tenantId, definitionId, entityId, opts);
}
export function cancelExecution(tenantId, instanceId, reason) {
    const impl = getWorkflows();
    if (!impl.cancelExecution)
        throw new Error('cancelExecution() not supported.');
    return impl.cancelExecution(tenantId, instanceId, reason);
}
export function getInstanceStatus(tenantId, instanceId) {
    const impl = getWorkflows();
    if (!impl.getInstanceStatus)
        throw new Error('getInstanceStatus() not supported.');
    return impl.getInstanceStatus(tenantId, instanceId);
}
export function getFailurePath(tenantId, instanceId) {
    const impl = getWorkflows();
    if (!impl.getFailurePath)
        throw new Error('getFailurePath() not supported.');
    return impl.getFailurePath(tenantId, instanceId);
}
export function emitWorkflowEvent(tenantId, event) {
    const impl = getWorkflows();
    if (!impl.emitWorkflowEvent)
        throw new Error('emitWorkflowEvent() not supported.');
    return impl.emitWorkflowEvent(tenantId, event);
}
export function emitWorkflowEntityEvent(opts) {
    const impl = getWorkflows();
    if (!impl.emitWorkflowEntityEvent)
        throw new Error('emitWorkflowEntityEvent() not supported.');
    impl.emitWorkflowEntityEvent(opts);
}
export function executeNotificationStep(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeNotificationStep)
        throw new Error('executeNotificationStep() not supported.');
    return impl.executeNotificationStep(tenantId, stepId, context);
}
export function executeApiCallNode(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeApiCallNode)
        throw new Error('executeApiCallNode() not supported.');
    return impl.executeApiCallNode(tenantId, stepId, context);
}
export function executeSendEmailNode(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeSendEmailNode)
        throw new Error('executeSendEmailNode() not supported.');
    return impl.executeSendEmailNode(tenantId, stepId, context);
}
export function executeWebhookNode(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeWebhookNode)
        throw new Error('executeWebhookNode() not supported.');
    return impl.executeWebhookNode(tenantId, stepId, context);
}
//# sourceMappingURL=workflows.js.map