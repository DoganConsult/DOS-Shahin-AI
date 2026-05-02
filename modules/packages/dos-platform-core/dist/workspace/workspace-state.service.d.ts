/**
 * Workspace State Service — Manages workspace lifecycle state transitions.
 *
 * Valid states: initializing, provisioning, active, maintenance, suspended, archived, deleted
 * Transitions are validated against a canonical transition map before execution.
 * All state changes are recorded in the workspace_state_history audit table.
 */
export type WorkspaceState = 'initializing' | 'provisioning' | 'active' | 'maintenance' | 'suspended' | 'archived' | 'deleted';
export interface WorkspaceStateRecord {
    workspaceId: string;
    tenantId: string;
    currentState: WorkspaceState;
    previousState: WorkspaceState | null;
    stateChangedAt: string;
    stateChangedBy: string | null;
    metadata: Record<string, unknown>;
}
export interface WorkspaceStateHistoryEntry {
    historyId: string;
    workspaceId: string;
    fromState: WorkspaceState | null;
    toState: WorkspaceState;
    triggeredBy: string;
    reason: string | null;
    metadata: Record<string, unknown>;
    transitionedAt: string;
}
/**
 * Retrieve the current state record for a workspace.
 */
export declare function getWorkspaceState(tenantId: string, workspaceId: string): Promise<WorkspaceStateRecord | null>;
/**
 * Transition a workspace to a new state with full validation and audit trail.
 * Returns the updated state record, or throws if the transition is not allowed.
 */
export declare function transitionWorkspaceState(tenantId: string, workspaceId: string, targetState: WorkspaceState, triggeredBy: string, reason?: string): Promise<WorkspaceStateRecord>;
/**
 * Retrieve the full state history audit trail for a workspace.
 */
export declare function getWorkspaceStateHistory(tenantId: string, workspaceId: string): Promise<WorkspaceStateHistoryEntry[]>;
/**
 * Check whether a workspace can transition to the specified target state.
 */
export declare function canTransitionTo(tenantId: string, workspaceId: string, targetState: WorkspaceState): Promise<boolean>;
/**
 * List all workspaces in a given state for a tenant.
 */
export declare function getWorkspacesByState(tenantId: string, state: WorkspaceState): Promise<WorkspaceStateRecord[]>;
/**
 * Check if a workspace is in an operational state (active and not suspended/archived/deleted).
 * Returns true only when the workspace is in 'active' state.
 */
export declare function isWorkspaceOperational(tenantId: string, workspaceId: string): Promise<boolean>;
