export type { StartResult, AdvanceResult, EngineStep } from '../workflows';
export { startWorkflowExecution, advanceStep, completeStep, cancelExecution, getInstanceStatus, getFailurePath, emitWorkflowEvent, executeNotificationStep, executeApiCallNode, executeSendEmailNode, executeWebhookNode, } from '../workflows';
export interface EngineCondition {
    type: string;
    expr?: string;
    metadata?: Record<string, unknown>;
}
export interface EngineTransition {
    from: string;
    to: string;
    conditions?: EngineCondition[];
    metadata?: Record<string, unknown>;
}
export interface InstanceStepRecord {
    instanceId: string;
    stepId: string;
    status: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>;
}
export declare function evaluateTransitionConditions(_tenantId: string, _transition: EngineTransition, _context: Record<string, unknown>): Promise<boolean>;
export declare function createApprovalForStep(_tenantId: string, _instanceId: string, _stepId: string, _context?: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function onApprovalResolved(_tenantId: string, _approvalId: string, _decision: 'approved' | 'rejected' | string): Promise<void>;
