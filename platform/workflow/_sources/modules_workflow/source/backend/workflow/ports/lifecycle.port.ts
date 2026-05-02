export { startWorkflowExecution, advanceStep, completeStep, cancelExecution, getInstanceStatus, createProcessTask, completeProcessTask, emitWorkflowEvent, executeNotificationStep, executeApiCallNode, executeSendEmailNode, executeWebhookNode } from '@dos/platform-core/workflows';
export type { StartResult, AdvanceResult, EngineStep, ProcessTaskType } from '@dos/platform-core/workflows';
export { emitWorkflowStatusChange, emitSlaWarning, emitSlaBreached, emitTaskOverdue, emitApprovalEscalated } from '@dos/platform-core/workflows';
export { registerLifecycleDefinition, getRegistryEntry, isTransitionValid, isTerminalState } from '@dos/platform-core/lifecycle';
export type { ApprovalRecord, WorkflowDefinition, WorkflowStep, WorkflowExecution, WorkflowExecutionContext } from '@dos/platform-core/workflows';
export { WORKFLOW_STATUSES as _WORKFLOW_STATUSES } from '@dos/platform-core/workflows';
export type { WorkflowStatus } from '@dos/platform-core/workflows';
