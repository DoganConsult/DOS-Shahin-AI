export type LifecycleState = 'candidate' | 'hired' | 'onboarding' | 'active' | 'probation' | 'confirmed' | 'on_leave' | 'under_review' | 'pip' | 'transfer_pending' | 'promoted' | 'exiting' | 'alumni';
export interface LifecycleStateRow {
    user_id: string;
    tenant_id: string;
    state: LifecycleState;
    state_since: string;
    state_due_by: string | null;
    state_owner: string | null;
    state_meta: Record<string, unknown>;
    workflow_id: string | null;
    updated_at: string;
}
export interface LifecycleTransitionRow {
    id: string;
    tenant_id: string;
    user_id: string;
    from_state: LifecycleState | null;
    to_state: LifecycleState;
    workflow_code: string | null;
    workflow_id: string | null;
    approved_by: string[] | null;
    evidence_refs: string[] | null;
    reason: string | null;
    occurred_at: string;
    actor_id: string;
    meta: Record<string, unknown>;
}
export interface LifecycleTaskRow {
    id: string;
    tenant_id: string;
    user_id: string;
    workflow_code: string;
    workflow_id: string | null;
    step_code: string;
    title_en: string;
    title_ar: string | null;
    assigned_to: string | null;
    due_at: string | null;
    completed_at: string | null;
    completed_by: string | null;
    status: 'open' | 'in_progress' | 'blocked' | 'done' | 'skipped';
    blocked_reason: string | null;
    evidence_refs: string[] | null;
    sort_order: number;
}
export interface TransitionInput {
    userId: string;
    toState: LifecycleState;
    actorId: string;
    reason?: string;
    evidenceRefs?: string[];
    approvedBy?: string[];
    meta?: Record<string, unknown>;
}
export interface TransitionResult {
    state: LifecycleStateRow;
    transition: LifecycleTransitionRow;
    tasksCreated: number;
    workflowId: string | null;
}
export declare class LifecycleStateMachineError extends Error {
    readonly code: 'INVALID_TRANSITION' | 'EVIDENCE_REQUIRED' | 'APPROVAL_REQUIRED' | 'STATE_NOT_FOUND';
    readonly details?: Record<string, unknown>;
    constructor(code: 'INVALID_TRANSITION' | 'EVIDENCE_REQUIRED' | 'APPROVAL_REQUIRED' | 'STATE_NOT_FOUND', message: string, details?: Record<string, unknown>);
}
export declare function getCurrentState(tenantId: string, userId: string): Promise<LifecycleStateRow | null>;
export declare function getHistory(tenantId: string, userId: string, limit?: number): Promise<LifecycleTransitionRow[]>;
export declare function listByState(tenantId: string, state: LifecycleState, opts?: {
    page?: number;
    pageSize?: number;
}): Promise<{
    data: any[];
    total: number;
}>;
export declare function listOnboardingKanban(tenantId: string): Promise<any[]>;
export declare function listProbationDue(tenantId: string, opts?: {
    withinDays?: number;
}): Promise<any[]>;
export declare function listTasks(tenantId: string, filter?: {
    userId?: string;
    assignedTo?: string;
    workflowId?: string;
    status?: string;
}): Promise<LifecycleTaskRow[]>;
export declare function getWorkflowTemplate(tenantId: string | null, workflowCode: string): Promise<any>;
export declare function transition(tenantId: string, input: TransitionInput): Promise<TransitionResult>;
export declare function completeTask(tenantId: string, taskId: string, actorId: string, evidenceRefs?: string[]): Promise<LifecycleTaskRow | null>;
export declare function blockTask(tenantId: string, taskId: string, reason: string): Promise<LifecycleTaskRow | null>;
export declare function getMetrics(tenantId: string): Promise<any[]>;
