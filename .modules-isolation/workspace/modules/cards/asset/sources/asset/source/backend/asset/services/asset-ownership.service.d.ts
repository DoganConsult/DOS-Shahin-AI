interface AssignOwnerInput {
    entity_type: string;
    entity_id: string;
    owner_type: string;
    owner_user_id: string;
    notes?: string;
}
export declare function getOwners(tenantId: string, entityType: string, entityId: string): Promise<any[]>;
export declare function getOwnerHistory(tenantId: string, entityType: string, entityId: string): Promise<any[]>;
export declare function assignOwner(tenantId: string, userId: string, input: AssignOwnerInput): Promise<any>;
export declare function revokeOwner(tenantId: string, userId: string, ownershipId: string): Promise<any>;
export declare function transferOwner(tenantId: string, userId: string, entityType: string, entityId: string, ownerType: string, newOwnerId: string, notes?: string): Promise<any>;
export declare function getUnownedEntities(tenantId: string, entityType: string, page?: number, pageSize?: number): Promise<{
    data: any[];
    page: number;
    pageSize: number;
    total: any;
    totalPages: number;
}>;
export declare function getOwnershipStats(tenantId: string): Promise<any>;
export {};
