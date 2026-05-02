export interface ActionWorkflowContext {
    tenantId: string;
    entityId: string;
    entityType: string;
    triggeredBy: string;
    correlationId?: string;
}
/** Record that a task was created inside the action workflow. */
export declare function onTaskCreated(ctx: ActionWorkflowContext, taskId: string): Promise<void>;
/** Record that a workflow has been triggered for an action entity. */
export declare function onWorkflowTriggered(ctx: ActionWorkflowContext): Promise<void>;
/** Route an action entity through the approval workflow. */
export declare function onApprovalRequired(ctx: ActionWorkflowContext, approverRole: string): Promise<void>;
/** Record and emit an escalation event for an action entity. */
export declare function onEscalation(ctx: ActionWorkflowContext, reason: string, escalateTo: string): Promise<void>;
/** Validate lifecycle transition via DAuth, then record closure. */
export declare function onClosure(ctx: ActionWorkflowContext, closureReason: string): Promise<void>;
/** Record and emit a workflow failure event. */
export declare function onFailure(ctx: ActionWorkflowContext, error: string): Promise<void>;
