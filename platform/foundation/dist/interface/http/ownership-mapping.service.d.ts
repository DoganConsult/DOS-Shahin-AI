export interface OwnershipMapping {
    mapping_id: string;
    tenant_id: string;
    entity_type: string;
    entity_id: string;
    owner_id: string;
    owner_user_id?: string;
    ownership_type: string;
    effective_from: string;
    effective_to: string | null;
    created_at: string;
    updated_at: string | null;
}
export interface CreateOwnershipInput {
    entity_type: string;
    entity_id: string;
    owner_id?: string;
    owner_user_id?: string;
    ownership_type?: string;
    effective_from?: string;
    effective_to?: string;
}
export declare function listOwnership(tenantId: string, opts?: {
    entity_type?: string;
    owner_id?: string;
}): Promise<OwnershipMapping[]>;
export declare function getOwnershipForEntity(tenantId: string, entityType: string, entityId: string): Promise<any[]>;
export declare function createOwnership(tenantId: string, input: CreateOwnershipInput, _actorId: string): Promise<OwnershipMapping>;
export declare function revokeOwnership(tenantId: string, id: string): Promise<boolean>;
export interface BulkReassignInput {
    entity_type: string;
    entity_ids: string[];
    from_owner_user_id?: string;
    to_owner_user_id: string;
    ownership_type?: string;
}
export declare function bulkReassignOwnership(tenantId: string, input: BulkReassignInput, _actorId: string): Promise<{
    revoked: number;
    assigned: number;
}>;
