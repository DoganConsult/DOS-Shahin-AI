export declare const WORKFLOW_STATUSES: readonly ["draft", "active", "paused", "completed", "cancelled", "archived"];
export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];
export type { WorkflowDefinition } from '@dos/types';
export type { ApprovalRecord } from '@dos/types';
export interface WorkflowStep {
    stepId: string;
    code?: string;
    status?: WorkflowStatus | string;
    assigneeId?: string;
    metadata?: Record<string, unknown>;
}
export interface WorkflowExecution {
    executionId: string;
    tenantId: string;
    workflowCode: string;
    status: WorkflowStatus | string;
    steps?: WorkflowStep[];
    createdAt?: string;
    updatedAt?: string;
    [k: string]: unknown;
}
export interface WorkflowExecutionContext {
    tenantId: string;
    userId?: string;
    moduleCode?: string;
    correlationId?: string;
    [k: string]: unknown;
}
export declare function emitWorkflowStatusChange(tenantId: string, payload: Record<string, unknown>): Promise<string>;
export declare function emitSlaWarning(tenantId: string, payload: Record<string, unknown>): Promise<string>;
export declare function emitSlaBreached(tenantId: string, payload: Record<string, unknown>): Promise<string>;
export declare function emitTaskOverdue(tenantId: string, payload: Record<string, unknown>): Promise<string>;
export declare function emitApprovalEscalated(tenantId: string, payload: Record<string, unknown>): Promise<string>;
export declare function primeDescriptorCache(_tenantId: string): Promise<void>;
export declare function getFullRegistry(): Record<string, unknown>;
