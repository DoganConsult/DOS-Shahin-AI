export interface AssetWorkflowContext {
    tenantId: string;
    entityId: string;
    entityType: string;
    triggeredBy: string;
    correlationId?: string;
}
export declare function onWorkflowTriggered(ctx: AssetWorkflowContext): Promise<void>;
export declare function onTaskCreated(ctx: AssetWorkflowContext, _taskId: string): Promise<void>;
export declare function onApprovalRequired(ctx: AssetWorkflowContext, _approverRole: string): Promise<void>;
export declare function onEscalation(ctx: AssetWorkflowContext, _reason: string, _escalateTo: string): Promise<void>;
export declare function onClosure(ctx: AssetWorkflowContext, _closureReason: string): Promise<void>;
export declare function onFailure(ctx: AssetWorkflowContext, _error: string): Promise<void>;
