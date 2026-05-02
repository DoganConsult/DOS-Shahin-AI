"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWebhookNode = exports.executeSendEmailNode = exports.executeApiCallNode = exports.executeNotificationStep = exports.emitWorkflowEvent = exports.getFailurePath = exports.getInstanceStatus = exports.cancelExecution = exports.completeStep = exports.advanceStep = exports.startWorkflowExecution = void 0;
exports.evaluateTransitionConditions = evaluateTransitionConditions;
exports.createApprovalForStep = createApprovalForStep;
exports.onApprovalResolved = onApprovalResolved;
var workflows_1 = require("../workflows");
Object.defineProperty(exports, "startWorkflowExecution", { enumerable: true, get: function () { return workflows_1.startWorkflowExecution; } });
Object.defineProperty(exports, "advanceStep", { enumerable: true, get: function () { return workflows_1.advanceStep; } });
Object.defineProperty(exports, "completeStep", { enumerable: true, get: function () { return workflows_1.completeStep; } });
Object.defineProperty(exports, "cancelExecution", { enumerable: true, get: function () { return workflows_1.cancelExecution; } });
Object.defineProperty(exports, "getInstanceStatus", { enumerable: true, get: function () { return workflows_1.getInstanceStatus; } });
Object.defineProperty(exports, "getFailurePath", { enumerable: true, get: function () { return workflows_1.getFailurePath; } });
Object.defineProperty(exports, "emitWorkflowEvent", { enumerable: true, get: function () { return workflows_1.emitWorkflowEvent; } });
Object.defineProperty(exports, "executeNotificationStep", { enumerable: true, get: function () { return workflows_1.executeNotificationStep; } });
Object.defineProperty(exports, "executeApiCallNode", { enumerable: true, get: function () { return workflows_1.executeApiCallNode; } });
Object.defineProperty(exports, "executeSendEmailNode", { enumerable: true, get: function () { return workflows_1.executeSendEmailNode; } });
Object.defineProperty(exports, "executeWebhookNode", { enumerable: true, get: function () { return workflows_1.executeWebhookNode; } });
async function evaluateTransitionConditions(_tenantId, _transition, _context) {
    return true;
}
async function createApprovalForStep(_tenantId, _instanceId, _stepId, _context) {
    return {};
}
async function onApprovalResolved(_tenantId, _approvalId, _decision) { }
//# sourceMappingURL=workflow-engine.service.js.map