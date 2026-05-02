export interface FoundationWorkflowContext {
    tenantId: string;
    entityId: string;
    entityType: string;
    triggeredBy: string;
    correlationId?: string;
}
export declare const ALLOWED_TRANSITIONS: Record<string, string[]>;
export declare function validateTransition(fromStatus: string, toStatus: string): boolean;
export declare function getAvailableTransitions(status: string): string[];
export declare function isProtectedTransition(fromStatus: string, toStatus: string): boolean;
export declare function executeTransition(tenantId: string, entityId: string, fromStatus: string, toStatus: string, userId: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function getEntityLifecycleTimeline(tenantId: string, entityId: string): Promise<Record<string, unknown>[]>;
export declare function handleApprovalOutcome(tenantId: string, entityId: string, outcome: 'approved' | 'rejected', userId: string, _comments?: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function onWorkflowTriggered(ctx: FoundationWorkflowContext): Promise<void>;
export declare function onTaskCreated(ctx: FoundationWorkflowContext, taskId: string): Promise<void>;
export declare function onApprovalRequired(ctx: FoundationWorkflowContext, approverRole: string): Promise<void>;
export declare function onEscalation(ctx: FoundationWorkflowContext, reason: string, escalateTo: string): Promise<void>;
export declare function onClosure(ctx: FoundationWorkflowContext, closureReason: string): Promise<void>;
export declare function onFailure(ctx: FoundationWorkflowContext, error: string): Promise<void>;
