"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLA_DEFAULTS = exports.EMPTY_RESOLUTION = void 0;
exports.setWorkflowEngine = setWorkflowEngine;
exports.createProcessTask = createProcessTask;
exports.completeProcessTask = completeProcessTask;
exports.createAutomationRule = createAutomationRule;
exports.getAutomationRule = getAutomationRule;
exports.getAutomationRules = getAutomationRules;
exports.updateAutomationRule = updateAutomationRule;
exports.deleteAutomationRule = deleteAutomationRule;
exports.getAutomationLog = getAutomationLog;
exports.advanceStep = advanceStep;
exports.completeStep = completeStep;
exports.startWorkflowExecution = startWorkflowExecution;
exports.cancelExecution = cancelExecution;
exports.getInstanceStatus = getInstanceStatus;
exports.getFailurePath = getFailurePath;
exports.emitWorkflowEvent = emitWorkflowEvent;
exports.emitWorkflowEntityEvent = emitWorkflowEntityEvent;
exports.executeNotificationStep = executeNotificationStep;
exports.executeApiCallNode = executeApiCallNode;
exports.executeSendEmailNode = executeSendEmailNode;
exports.executeWebhookNode = executeWebhookNode;
exports.EMPTY_RESOLUTION = {};
exports.SLA_DEFAULTS = {
    low: 72,
    medium: 48,
    high: 24,
    critical: 4,
};
let _workflows = null;
function setWorkflowEngine(impl) {
    _workflows = impl;
}
function getWorkflows() {
    if (!_workflows) {
        throw new Error('PlatformWorkflows not initialized. Call setWorkflowEngine() first.');
    }
    return _workflows;
}
function createProcessTask(tenantId, input) {
    return getWorkflows().createProcessTask(tenantId, input);
}
function completeProcessTask(tenantId, taskId, outcome) {
    return getWorkflows().completeProcessTask(tenantId, taskId, outcome);
}
function createAutomationRule(tenantId, input) {
    return getWorkflows().createAutomationRule(tenantId, input);
}
function getAutomationRule(tenantId, ruleId) {
    return getWorkflows().getAutomationRule(tenantId, ruleId);
}
function getAutomationRules(tenantId, moduleCode) {
    return getWorkflows().getAutomationRules(tenantId, moduleCode);
}
function updateAutomationRule(tenantId, ruleId, updates) {
    return getWorkflows().updateAutomationRule(tenantId, ruleId, updates);
}
function deleteAutomationRule(tenantId, ruleId) {
    return getWorkflows().deleteAutomationRule(tenantId, ruleId);
}
function getAutomationLog(tenantId, ruleId) {
    return getWorkflows().getAutomationLog(tenantId, ruleId);
}
function advanceStep(tenantId, stepId) {
    return getWorkflows().advanceStep(tenantId, stepId);
}
function completeStep(tenantId, stepId) {
    return getWorkflows().completeStep(tenantId, stepId);
}
function startWorkflowExecution(tenantId, definitionId, entityId, opts) {
    const impl = getWorkflows();
    if (!impl.startWorkflowExecution)
        throw new Error('startWorkflowExecution() not supported.');
    return impl.startWorkflowExecution(tenantId, definitionId, entityId, opts);
}
function cancelExecution(tenantId, instanceId, reason) {
    const impl = getWorkflows();
    if (!impl.cancelExecution)
        throw new Error('cancelExecution() not supported.');
    return impl.cancelExecution(tenantId, instanceId, reason);
}
function getInstanceStatus(tenantId, instanceId) {
    const impl = getWorkflows();
    if (!impl.getInstanceStatus)
        throw new Error('getInstanceStatus() not supported.');
    return impl.getInstanceStatus(tenantId, instanceId);
}
function getFailurePath(tenantId, instanceId) {
    const impl = getWorkflows();
    if (!impl.getFailurePath)
        throw new Error('getFailurePath() not supported.');
    return impl.getFailurePath(tenantId, instanceId);
}
function emitWorkflowEvent(tenantId, event) {
    const impl = getWorkflows();
    if (!impl.emitWorkflowEvent)
        throw new Error('emitWorkflowEvent() not supported.');
    return impl.emitWorkflowEvent(tenantId, event);
}
function emitWorkflowEntityEvent(opts) {
    const impl = getWorkflows();
    if (!impl.emitWorkflowEntityEvent)
        throw new Error('emitWorkflowEntityEvent() not supported.');
    impl.emitWorkflowEntityEvent(opts);
}
function executeNotificationStep(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeNotificationStep)
        throw new Error('executeNotificationStep() not supported.');
    return impl.executeNotificationStep(tenantId, stepId, context);
}
function executeApiCallNode(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeApiCallNode)
        throw new Error('executeApiCallNode() not supported.');
    return impl.executeApiCallNode(tenantId, stepId, context);
}
function executeSendEmailNode(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeSendEmailNode)
        throw new Error('executeSendEmailNode() not supported.');
    return impl.executeSendEmailNode(tenantId, stepId, context);
}
function executeWebhookNode(tenantId, stepId, context) {
    const impl = getWorkflows();
    if (!impl.executeWebhookNode)
        throw new Error('executeWebhookNode() not supported.');
    return impl.executeWebhookNode(tenantId, stepId, context);
}
//# sourceMappingURL=workflows.js.map