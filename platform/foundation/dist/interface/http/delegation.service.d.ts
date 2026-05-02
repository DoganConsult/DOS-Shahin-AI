export interface Delegation {
    delegation_id: string;
    tenant_id: string;
    delegator_id: string;
    delegate_id: string;
    scope: unknown;
    permissions: string[] | null;
    valid_from: string;
    valid_until: string | null;
    reason: string | null;
    status: 'active' | 'pending_approval' | 'approved' | 'rejected' | 'revoked';
    approved_by: string | null;
    approved_at: string | null;
    rejected_reason: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string | null;
    delegator_email?: string;
    delegator_name?: string;
    delegate_email?: string;
    delegate_name?: string;
}
export interface ListDelegationOptions {
    actorId: string;
    isAdmin: boolean;
    direction?: 'from' | 'to' | 'both';
}
export interface CreateDelegationInput {
    delegator_id?: string;
    delegate_id: string;
    scope?: unknown;
    permissions?: string[];
    effective_from?: string;
    effective_to?: string;
    reason?: string;
    requires_approval?: boolean;
}
export declare function listDelegations(tenantId: string, opts: ListDelegationOptions): Promise<Delegation[]>;
export declare function getDelegation(tenantId: string, id: string): Promise<Delegation | null>;
export declare function createDelegation(tenantId: string, input: CreateDelegationInput, actorId: string): Promise<Delegation>;
export declare function approveDelegation(tenantId: string, id: string, actorId: string): Promise<Delegation | null>;
export declare function rejectDelegation(tenantId: string, id: string, actorId: string, reason: string): Promise<Delegation | null>;
export declare function revokeDelegation(tenantId: string, id: string): Promise<boolean>;
