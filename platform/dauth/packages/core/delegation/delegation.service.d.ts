/**
 * DAuth — Agent Delegation Service
 *
 * Allows AI agents to act on behalf of users. Every action flows through
 * DAuth's 14-step evaluateAccess() — no parallel permission engine (§16.3).
 *
 * §9.1: time-bounded, scope-bounded, action-bounded, role-bounded,
 *        authority-aware, SoD-checked, auditable
 * §9.3: no implicit delegation, no expansion beyond delegator rights
 * §16.2: agent actor must exist, permission via DAuth only
 * §16.3: no hidden agent-wide bypass, no separate permission engine
 *
 * Ownership: platform/dauth/delegation/
 * Scopes and action-type mappings are registered at runtime by product/module layers.
 */
import type { GenericRow } from '@dos/types/db';
export type DelegationScope = string;
export interface DelegationGrant {
    grantId: string;
    tenantId: string;
    userId: string;
    agentId: string;
    scopes: string[];
    expiresAt: string;
    revokedAt: string | null;
    createdAt: string;
}
export interface DelegationAction {
    actionId: string;
    grantId: string;
    agentId: string;
    userId: string;
    tenantId: string;
    actionType: string;
    entityType: string;
    entityId: string | null;
    payload: Record<string, unknown>;
    result: 'success' | 'failure';
    errorMessage: string | null;
    executedAt: string;
}
export declare function registerDelegationScope(scopeCode: string, requiredPermissions: string[]): void;
export declare function registerActionScopeMapping(actionType: string, scopeCode: string): void;
export declare function getScopeRequiredPermissions(scopeCode: string): string[];
export declare function getActionScope(actionType: string): string | undefined;
export declare function createDelegationGrant(tenantId: string, userId: string, agentId: string, scopes: DelegationScope[], durationMinutes?: number): Promise<DelegationGrant>;
export declare function revokeDelegationGrant(tenantId: string, grantId: string, revokedBy: string): Promise<void>;
export declare function validateDelegation(tenantId: string, agentId: string, requiredScope: DelegationScope): Promise<DelegationGrant | null>;
export declare function generateDelegatedToken(grant: DelegationGrant, userEmail: string, userRole: string): Promise<string>;
export declare function requireExplicitGrant(tenantId: string, agentId: string, requiredScope: DelegationScope): Promise<DelegationGrant>;
export declare function executeDelegatedAction(tenantId: string, userId: string, agentId: string, action: {
    type: string;
    title: string;
    description: string;
    priority: string;
    entityType?: string;
    entityId?: string;
    assignToRole?: string;
    dueInDays?: number;
    [key: string]: any;
}): Promise<{
    success: boolean;
    message: string;
    grantId: string;
    actionId: string;
}>;
export declare function recordDelegatedAction(tenantId: string, grantId: string, agentId: string, userId: string, actionType: string, entityType: string, entityId: string | null, payload: Record<string, unknown>, result: 'success' | 'failure', errorMessage?: string | null): Promise<DelegationAction>;
export declare function getActiveGrants(tenantId: string, userId: string): Promise<DelegationGrant[]>;
export declare function getDelegationHistory(tenantId: string, filters?: {
    userId?: string;
    agentId?: string;
    limit?: number;
}): Promise<DelegationAction[]>;
export declare function listDelegations(tenantId: string, filters?: {
    status?: string;
    delegator_user_id?: string;
    delegate_user_id?: string;
}): Promise<GenericRow[]>;
export declare function getDelegationById(tenantId: string, delegationId: string): Promise<GenericRow | undefined>;
export declare function createDelegation(tenantId: string, data: {
    delegator_user_id: string;
    delegate_user_id: string;
    authority_type: string;
    scope?: string;
    valid_from: string;
    valid_to: string;
    conditions?: string;
    created_by?: string;
}): Promise<GenericRow | undefined>;
/**
 * Request a delegation that requires approval before activation.
 * Creates the delegation in 'pending_approval' status and submits for approval.
 */
export declare function requestDelegation(tenantId: string, data: {
    delegator_user_id: string;
    delegate_user_id: string;
    authority_type: string;
    scope?: string;
    valid_from: string;
    valid_to: string;
    conditions?: string;
    requested_by: string;
}): Promise<{
    delegation: GenericRow | undefined;
    requiresApproval: boolean;
}>;
/** Approve a pending delegation (called by approval engine callback). */
export declare function approveDelegation(tenantId: string, delegationId: string, approvedBy: string): Promise<GenericRow | undefined>;
/** Reject a pending delegation. */
export declare function rejectDelegation(tenantId: string, delegationId: string, rejectedBy: string, reason: string): Promise<GenericRow | undefined>;
export declare function updateDelegation(tenantId: string, delegationId: string, data: Record<string, unknown>): Promise<GenericRow | undefined>;
export declare function revokeDelegation(tenantId: string, delegationId: string): Promise<GenericRow | undefined>;
export declare function getExpiringDelegations(tenantId: string, withinDays?: number): Promise<GenericRow[]>;
/** Compat alias for listDelegations */
export declare const getDelegations: typeof listDelegations;
/** Active delegations for a specific user (delegate side) */
export declare function getActiveDelegationsForUser(tenantId: string, userId: string): Promise<GenericRow[]>;
export declare function detectAuthorityConflicts(tenantId: string): Promise<GenericRow[]>;
export declare function listAuthorityLevels(tenantId: string): Promise<GenericRow[]>;
export declare function upsertAuthorityLevel(tenantId: string, data: {
    level_name: string;
    description?: string;
    level_order?: number;
    approval_limit?: number;
    created_by?: string;
}): Promise<GenericRow | undefined>;
export declare function expireOverdueDelegations(tenantId: string): Promise<number>;
export declare function ACTION_TYPE_TO_SCOPE(..._args: unknown[]): undefined;
