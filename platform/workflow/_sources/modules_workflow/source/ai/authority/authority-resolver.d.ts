export declare function getUserAuthorityLevel(tenantId: string, userId: string): Promise<{
    levelCode: string;
    rank: number;
} | null>;
export declare function hasAuthority(tenantId: string, userId: string, requiredLevel: string): Promise<boolean>;
/**
 * Return ALL authority levels the user holds (not just highest),
 * sorted by rank descending.
 */
export declare function getAuthorityChain(tenantId: string, userId: string): Promise<{
    levelCode: string;
    rank: number;
}[]>;
/**
 * List all defined authority levels for a tenant (for admin UI / configuration).
 * Returns levels sorted by rank descending (highest authority first).
 */
export declare function getAuthorityLevels(tenantId: string): Promise<{
    levelCode: string;
    rank: number;
    label: string | null;
}[]>;
/**
 * Return all users who hold the required authority level or higher.
 * Useful for building approval chains and escalation paths.
 */
export declare function resolveApprovalChain(tenantId: string, requiredLevel: string): Promise<{
    userId: string;
    levelCode: string;
    rank: number;
}[]>;
/**
 * Check if user holds ANY of the required authority levels.
 * Returns true if at least one match is found.
 */
export declare function hasAnyAuthority(tenantId: string, userId: string, requiredLevels: string[]): Promise<boolean>;
