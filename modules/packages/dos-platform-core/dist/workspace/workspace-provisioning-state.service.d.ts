/**
 * Workspace Provisioning State Service — Tracks provisioning step execution.
 *
 * Manages the lifecycle of workspace provisioning runs: initialization,
 * step completion/failure/retry, progress tracking, and cancellation.
 * Each provisioning run consists of ordered steps stored in workspace_provisioning_steps.
 */
export type ProvisioningRunStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type ProvisioningStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export interface ProvisioningStepDef {
    stepCode: string;
    label: string;
    ordinal: number;
    isRequired: boolean;
    metadata?: Record<string, unknown>;
}
export interface StepResult {
    outputData?: Record<string, unknown>;
    durationMs?: number;
}
export interface ProvisioningState {
    runId: string;
    workspaceId: string;
    tenantId: string;
    status: ProvisioningRunStatus;
    startedAt: string;
    completedAt: string | null;
    cancelledBy: string | null;
    steps: ProvisioningStepRecord[];
}
export interface ProvisioningStepRecord {
    stepId: string;
    runId: string;
    stepCode: string;
    label: string;
    ordinal: number;
    isRequired: boolean;
    status: ProvisioningStepStatus;
    errorMessage: string | null;
    outputData: Record<string, unknown>;
    startedAt: string | null;
    completedAt: string | null;
    retryCount: number;
}
export interface ProvisioningProgress {
    runId: string;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    pendingSteps: number;
    percentComplete: number;
    steps: ProvisioningStepRecord[];
}
/**
 * Retrieve the current provisioning state for a workspace, including all steps.
 */
export declare function getProvisioningState(tenantId: string, workspaceId: string): Promise<ProvisioningState | null>;
/**
 * Initialize a new provisioning run for a workspace with the specified steps.
 * Throws if there is already an active (pending/in_progress) provisioning run.
 */
export declare function startProvisioning(tenantId: string, workspaceId: string, steps: ProvisioningStepDef[]): Promise<ProvisioningState>;
/**
 * Mark a provisioning step as completed with optional result data.
 */
export declare function completeStep(tenantId: string, workspaceId: string, stepCode: string, result: StepResult): Promise<ProvisioningStepRecord | null>;
/**
 * Mark a provisioning step as failed with an error message.
 */
export declare function failStep(tenantId: string, workspaceId: string, stepCode: string, error: string): Promise<ProvisioningStepRecord | null>;
/**
 * Retry a previously failed provisioning step. Resets the step to 'pending'
 * and increments the retry count.
 */
export declare function retryStep(tenantId: string, workspaceId: string, stepCode: string): Promise<ProvisioningStepRecord | null>;
/**
 * Get provisioning progress as a percentage with step-level breakdown.
 */
export declare function getProvisioningProgress(tenantId: string, workspaceId: string): Promise<ProvisioningProgress | null>;
/**
 * Check whether the most recent provisioning run for a workspace has completed successfully.
 */
export declare function isProvisioningComplete(tenantId: string, workspaceId: string): Promise<boolean>;
/**
 * Cancel an in-progress provisioning run. Marks all pending steps as skipped.
 */
export declare function cancelProvisioning(tenantId: string, workspaceId: string, cancelledBy: string): Promise<ProvisioningState | null>;
