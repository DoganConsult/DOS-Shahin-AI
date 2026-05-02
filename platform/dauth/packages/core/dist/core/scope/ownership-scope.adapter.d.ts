/** Ownership record returned from the ownership matrix. */
export interface OwnershipRecord {
    entityType: string;
    entityId: string;
    userId: string;
    ownershipType: string;
    isPrimary: boolean;
    primaryTeamId: string | null;
    deptId: string | null;
}
/**
 * Resolve all entities owned by a user, optionally filtered by entity type.
 * Reads from grc_ownership_matrix view which unifies all ownership tables.
 */
export declare function resolveOwnershipScope(tenantId: string, userId: string, entityType?: string): Promise<OwnershipRecord[]>;
/**
 * Check if a user owns a specific entity (any ownership type).
 * Queries the grc_ownership_matrix view for an exact match.
 */
export declare function isEntityOwner(tenantId: string, userId: string, entityType: string, entityId: string): Promise<boolean>;
/**
 * Check if a user is the PRIMARY owner of a specific entity.
 */
export declare function isPrimaryOwner(tenantId: string, userId: string, entityType: string, entityId: string): Promise<boolean>;
/**
 * Get all owners for a specific entity.
 * Returns user IDs with their ownership type and primary flag.
 */
export declare function getEntityOwners(tenantId: string, entityType: string, entityId: string): Promise<{
    userId: string;
    ownershipType: string;
    isPrimary: boolean;
}[]>;
/**
 * Get all entity IDs owned by a user for a specific entity type.
 * Convenience wrapper returning just the IDs.
 */
export declare function getOwnedEntityIds(tenantId: string, userId: string, entityType: string): Promise<string[]>;
/**
 * Assign ownership for a control entity.
 * Uses the control_owners table directly for write operations.
 */
export declare function assignControlOwnership(tenantId: string, userId: string, controlId: string, ownershipType: string, isPrimary: boolean, assignedBy: string): Promise<void>;
/**
 * Assign ownership for a risk entity.
 * Uses the risk_owners table directly for write operations.
 */
export declare function assignRiskOwnership(tenantId: string, userId: string, riskId: string, ownershipType: string, isPrimary: boolean, assignedBy: string): Promise<void>;
/**
 * Revoke ownership by soft-deleting the ownership record.
 * Works for control_owners table.
 */
export declare function revokeControlOwnership(tenantId: string, userId: string, controlId: string): Promise<void>;
/**
 * Revoke ownership by soft-deleting the ownership record.
 * Works for risk_owners table.
 */
export declare function revokeRiskOwnership(tenantId: string, userId: string, riskId: string): Promise<void>;
